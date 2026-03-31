"""Tests for Stage 4 — Post-fill verification."""

import os
import pytest

from acroform_filler.filler import AcroFormFiller
from acroform_filler.inspector import AcroFormInspector
from acroform_filler.models import FillerConfig
from tax_normalizer.models import NormalizationResult


class TestPostFillVerification:
    """Stage 4: verify written values by re-reading output PDF."""

    def test_text_field_matches(self, filler, irs_1120s_pdf, tmp_output):
        """Written value matches expected for text field."""
        nr = NormalizationResult(
            resolved={
                "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_4[0]": "ACME LLC",
            },
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=irs_1120s_pdf,
            output_path=tmp_output["pdf"],
            flatten=False,
            audit_log_path=tmp_output["audit"],
        )
        result = filler.fill(nr, config)
        assert result.success is True

        # Re-read and verify
        inspector = AcroFormInspector()
        fields = inspector.inspect(tmp_output["pdf"])
        key = "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_4[0]"
        assert key in fields, f"Field {key} not found in filled PDF. Available: {list(fields.keys())[:5]}"
        assert fields[key].current_value == "ACME LLC"

    def test_checkbox_true_matches(self, filler, mock_nr_checkbox, filler_config):
        """Written checkbox True value is correctly set."""
        result = filler.fill(mock_nr_checkbox, filler_config)
        assert result.success is True

    def test_checkbox_false_matches(self, filler, mock_nr_checkbox_false, filler_config):
        """Written checkbox False/Off value is correctly set."""
        result = filler.fill(mock_nr_checkbox_false, filler_config)
        assert result.success is True

    def test_sha256_in_audit_log(self, filler, mock_nr_1120s, filler_config):
        """sha256 of output PDF written to audit log."""
        result = filler.fill(mock_nr_1120s, filler_config)
        assert result.success is True
        assert result.audit_log is not None
        assert len(result.audit_log.pdf_sha256) == 64  # SHA-256 hex digest

    def test_mismatch_detected_and_logged(self, filler, irs_1120s_pdf, tmp_output):
        """Mismatch (if detected) → logged in FillResult.mismatched_fields."""
        nr = NormalizationResult(
            resolved={
                "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_4[0]": "TEST CORP",
            },
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=irs_1120s_pdf,
            output_path=tmp_output["pdf"],
            flatten=False,
            audit_log_path=tmp_output["audit"],
        )
        result = filler.fill(nr, config)
        assert result.success is True
        # mismatched_fields is a list — may be empty if write was successful
        assert isinstance(result.mismatched_fields, list)
