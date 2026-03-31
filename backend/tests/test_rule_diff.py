"""Tests for IRS rule change analysis."""

from __future__ import annotations

import json
from unittest.mock import patch, AsyncMock

import pytest

from acroform_filler.models import FieldMeta, FieldType
from backend.forms.irs_rule_diff import (
    compute_field_diff,
    extract_whats_new,
    analyze_rule_changes,
    RuleChangeReport,
    RuleAnalysisError,
)


def _field(fid: str, ftype: FieldType = FieldType.TEXT, page: int = 1) -> FieldMeta:
    return FieldMeta(field_id=fid, field_type=ftype, page_number=page)


class TestFieldDiff:
    """Deterministic field-level diff."""

    def test_field_removed_deprecated(self):
        """Field in prior not in current → DEPRECATED."""
        prior = [_field("line_1"), _field("line_2"), _field("old_field")]
        current = [_field("line_1"), _field("line_2")]
        changes = compute_field_diff(prior, current)
        deprecated = [c for c in changes if c.change_type == "DEPRECATED"]
        assert len(deprecated) == 1
        assert deprecated[0].field_id == "old_field"

    def test_field_added(self):
        """Field in current not in prior → ADDITIVE."""
        prior = [_field("line_1")]
        current = [_field("line_1"), _field("new_field")]
        changes = compute_field_diff(prior, current)
        added = [c for c in changes if c.change_type == "ADDITIVE"]
        assert len(added) == 1
        assert added[0].field_id == "new_field"

    def test_type_change(self):
        """Same field_id, different field_type → TYPE_CHANGE."""
        prior = [_field("f1", FieldType.TEXT)]
        current = [_field("f1", FieldType.CHECKBOX)]
        changes = compute_field_diff(prior, current)
        type_changes = [c for c in changes if c.change_type == "TYPE_CHANGE"]
        assert len(type_changes) == 1

    def test_fuzzy_rename_detection(self):
        """Field IDs with >0.85 similarity → RENAMED."""
        prior = [_field("topmostSubform[0].Page1[0].f1_16[0]")]
        current = [_field("topmostSubform[0].Page1[0].f1_16a[0]")]
        changes = compute_field_diff(prior, current)
        renamed = [c for c in changes if c.change_type == "RENAMED"]
        assert len(renamed) == 1

    def test_no_changes(self):
        """Identical fields → no changes."""
        fields = [_field("f1"), _field("f2")]
        changes = compute_field_diff(fields, fields)
        assert changes == []


class TestWhatsNewExtraction:
    """Extract "What's New" section from instructions PDF."""

    def test_extract_from_real_pdf(self):
        """Extract from real IRS PDF if available."""
        # Use the existing 1120-S PDF as a proxy test
        import os
        pdf = "public/forms/2025/f1120s.pdf"
        if not os.path.exists(pdf):
            pytest.skip("IRS PDF not available")
        # This is the form itself, not instructions, so may not have "What's New"
        text = extract_whats_new(pdf)
        # Either finds something or returns empty — no crash
        assert isinstance(text, str)

    def test_nonexistent_pdf_graceful(self):
        """Missing PDF → returns empty string, no crash."""
        text = extract_whats_new("/nonexistent/instructions.pdf")
        assert text == ""


class TestRuleChangeAnalysis:
    """Full rule change analysis with mocked Claude."""

    @pytest.mark.asyncio
    async def test_llm_response_parsed(self):
        """LLM response parsed into RuleChangeReport."""
        prior = [_field("line_1"), _field("old_line")]
        current = [_field("line_1"), _field("new_line")]

        llm_response = json.dumps({
            "changes": [
                {
                    "change_type": "ADDITIVE",
                    "field_id": "new_line",
                    "description": "New line added per Rev. Proc. 2024-1",
                    "tax_law_reference": "Rev. Proc. 2024-1",
                    "yaml_update_required": True,
                    "yaml_suggestion": "Add new_line field to 1120s_2025.yaml",
                    "severity": "IMPORTANT",
                },
            ],
            "logic_only_changes": [
                {
                    "description": "Standard deduction amount increased",
                    "tax_law_reference": "IRC §63",
                    "affected_lines": ["12"],
                    "severity": "IMPORTANT",
                },
            ],
            "summary": "One new field added and standard deduction increased.",
        })

        async def mock_claude(prompt):
            return llm_response

        report = await analyze_rule_changes(
            "f1120s", 2023, 2024, prior, current,
            _claude_caller=mock_claude,
        )

        assert report.form_id == "f1120s"
        assert report.summary == "One new field added and standard deduction increased."
        assert len(report.logic_changes) == 1
        assert len(report.descriptor_tasks) == 1
        assert report.descriptor_tasks[0].yaml_suggestion != ""

    @pytest.mark.asyncio
    async def test_breaking_change_counted(self):
        """BREAKING severity → breaking_count incremented."""
        prior = [_field("mandatory_field")]
        current = []

        llm_response = json.dumps({
            "changes": [{
                "change_type": "BREAKING_CHANGE",
                "field_id": "mandatory_field",
                "description": "Mandatory field removed",
                "tax_law_reference": "",
                "yaml_update_required": True,
                "yaml_suggestion": "Remove mandatory_field",
                "severity": "BREAKING",
            }],
            "logic_only_changes": [],
            "summary": "Breaking change detected.",
        })

        async def mock_claude(prompt):
            return llm_response

        report = await analyze_rule_changes(
            "f1120s", 2023, 2024, prior, current,
            _claude_caller=mock_claude,
        )

        assert report.breaking_count >= 1

    @pytest.mark.asyncio
    async def test_malformed_llm_json_raises(self):
        """Malformed LLM JSON → RuleAnalysisError with raw response stored."""
        async def mock_claude(prompt):
            return "This is {not valid} JSON!!!"

        with pytest.raises(RuleAnalysisError) as exc_info:
            await analyze_rule_changes(
                "f1120s", 2023, 2024, [], [],
                _claude_caller=mock_claude,
            )
        assert exc_info.value.raw_response == "This is {not valid} JSON!!!"

    @pytest.mark.asyncio
    async def test_prior_instructions_missing_graceful(self):
        """Prior year instructions missing → field diff still runs."""
        prior = [_field("f1")]
        current = [_field("f1"), _field("f2")]

        llm_response = json.dumps({
            "changes": [],
            "logic_only_changes": [],
            "summary": "New field added.",
        })

        async def mock_claude(prompt):
            return llm_response

        report = await analyze_rule_changes(
            "f1120s", 2023, 2024, prior, current,
            instructions_pdf_path="",
            prior_instructions_pdf_path="/nonexistent/path.pdf",
            _claude_caller=mock_claude,
        )

        # Field diff still ran
        additive = [c for c in report.field_changes if c.change_type == "ADDITIVE"]
        assert len(additive) == 1
        assert additive[0].field_id == "f2"

    @pytest.mark.asyncio
    async def test_yaml_update_creates_descriptor_task(self):
        """yaml_update_required=true → descriptor_update_tasks row created."""
        llm_response = json.dumps({
            "changes": [{
                "change_type": "ADDITIVE",
                "field_id": "new_f",
                "description": "New field",
                "tax_law_reference": "",
                "yaml_update_required": True,
                "yaml_suggestion": "- field_id: new_f\n  source_type: QBO",
                "severity": "IMPORTANT",
            }],
            "logic_only_changes": [],
            "summary": "",
        })

        async def mock_claude(prompt):
            return llm_response

        report = await analyze_rule_changes(
            "f1120s", 2023, 2024, [], [_field("new_f")],
            _claude_caller=mock_claude,
        )

        assert len(report.descriptor_tasks) == 1
        assert report.descriptor_tasks[0].field_id == "new_f"
        assert "QBO" in report.descriptor_tasks[0].yaml_suggestion
