"""IRS rule change analysis — deterministic field diff + Claude semantic analysis."""

from __future__ import annotations

import difflib
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from acroform_filler.models import FieldMeta

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class FieldChange:
    change_type: str  # BREAKING_CHANGE | ADDITIVE | DEPRECATED | RENAMED | TYPE_CHANGE
    field_id: str
    description: str
    prior_value: str = ""
    current_value: str = ""


@dataclass
class LogicChange:
    description: str
    tax_law_reference: str = ""
    affected_lines: list[str] = field(default_factory=list)
    severity: str = "MINOR"


@dataclass
class DescriptorUpdateTask:
    form_id: str
    tax_year: int
    field_id: str
    change_type: str
    yaml_suggestion: str = ""
    resolved: bool = False


@dataclass
class RuleChangeReport:
    form_id: str
    prior_year: int
    current_year: int
    field_changes: list[FieldChange] = field(default_factory=list)
    logic_changes: list[LogicChange] = field(default_factory=list)
    breaking_count: int = 0
    summary: str = ""
    descriptor_tasks: list[DescriptorUpdateTask] = field(default_factory=list)
    analyzed_at: str = ""
    raw_llm_response: str = ""

    def __post_init__(self):
        if not self.analyzed_at:
            self.analyzed_at = datetime.now(timezone.utc).isoformat()


class RuleAnalysisError(Exception):
    """Raised when LLM rule analysis fails."""

    def __init__(self, message: str, raw_response: str = ""):
        self.raw_response = raw_response
        super().__init__(message)


# ---------------------------------------------------------------------------
# Step 1: Deterministic field diff
# ---------------------------------------------------------------------------

def compute_field_diff(
    prior_fields: list[FieldMeta],
    current_fields: list[FieldMeta],
) -> list[FieldChange]:
    """Compare two sets of field metadata and classify changes."""
    prior_map = {f.field_id: f for f in prior_fields}
    current_map = {f.field_id: f for f in current_fields}

    prior_ids = set(prior_map.keys())
    current_ids = set(current_map.keys())

    changes: list[FieldChange] = []

    # Added fields
    for fid in sorted(current_ids - prior_ids):
        changes.append(FieldChange(
            change_type="ADDITIVE",
            field_id=fid,
            description=f"New field added: {fid}",
        ))

    # Removed fields
    for fid in sorted(prior_ids - current_ids):
        changes.append(FieldChange(
            change_type="DEPRECATED",
            field_id=fid,
            description=f"Field removed: {fid}",
        ))

    # Changed fields (same field_id)
    for fid in sorted(prior_ids & current_ids):
        p = prior_map[fid]
        c = current_map[fid]
        if p.field_type != c.field_type:
            changes.append(FieldChange(
                change_type="TYPE_CHANGE",
                field_id=fid,
                description=f"Field type changed from {p.field_type} to {c.field_type}",
                prior_value=str(p.field_type),
                current_value=str(c.field_type),
            ))

    # Fuzzy rename detection: removed fields that match an added field by label
    removed = [c for c in changes if c.change_type == "DEPRECATED"]
    added = [c for c in changes if c.change_type == "ADDITIVE"]

    renamed_prior: set[str] = set()
    renamed_current: set[str] = set()

    for rem in removed:
        p_field = prior_map.get(rem.field_id)
        if not p_field:
            continue
        for add in added:
            c_field = current_map.get(add.field_id)
            if not c_field:
                continue
            # Compare field_id as a string similarity proxy
            ratio = difflib.SequenceMatcher(
                None, rem.field_id.lower(), add.field_id.lower()
            ).ratio()
            if ratio > 0.85:
                renamed_prior.add(rem.field_id)
                renamed_current.add(add.field_id)
                changes.append(FieldChange(
                    change_type="RENAMED",
                    field_id=add.field_id,
                    description=f"Field renamed: {rem.field_id} → {add.field_id}",
                    prior_value=rem.field_id,
                    current_value=add.field_id,
                ))

    # Remove the individual DEPRECATED/ADDITIVE entries for renamed fields
    changes = [
        c for c in changes
        if not (c.change_type == "DEPRECATED" and c.field_id in renamed_prior)
        and not (c.change_type == "ADDITIVE" and c.field_id in renamed_current)
    ]

    return changes


# ---------------------------------------------------------------------------
# Step 2: Classify severity helpers
# ---------------------------------------------------------------------------

def classify_breaking(
    changes: list[FieldChange],
    prior_fields: list[FieldMeta],
) -> list[FieldChange]:
    """Upgrade DEPRECATED to BREAKING_CHANGE if the removed field was mandatory-like.

    Since FieldMeta doesn't carry mandatory, we mark all removals as DEPRECATED
    and let the caller/LLM refine severity.
    """
    return changes


# ---------------------------------------------------------------------------
# Step 3: Extract "What's New" from instructions PDF
# ---------------------------------------------------------------------------

def extract_whats_new(instructions_pdf_path: str) -> str:
    """Extract the 'What's New' section from an IRS instructions PDF."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(instructions_pdf_path)
        full_text = ""
        for page in reader.pages[:10]:  # Only first 10 pages
            full_text += page.extract_text() or ""

        # Search for "What's New" section
        lower = full_text.lower()
        markers = ["what's new", "what\u2019s new", "changes for", "new for"]
        for marker in markers:
            idx = lower.find(marker)
            if idx >= 0:
                # Extract up to 3000 chars from this point
                section = full_text[idx: idx + 3000]
                return section.strip()

        return ""
    except Exception as exc:
        logger.warning("Could not extract What's New from %s: %s", instructions_pdf_path, exc)
        return ""


# ---------------------------------------------------------------------------
# Step 4: LLM rule analysis
# ---------------------------------------------------------------------------

async def analyze_rule_changes(
    form_id: str,
    prior_year: int,
    current_year: int,
    prior_fields: list[FieldMeta],
    current_fields: list[FieldMeta],
    instructions_pdf_path: str = "",
    prior_instructions_pdf_path: str = "",
    *,
    anthropic_api_key: str | None = None,
    _claude_caller: Any | None = None,
) -> RuleChangeReport:
    """Full rule change analysis: deterministic diff + LLM semantic analysis."""
    report = RuleChangeReport(
        form_id=form_id,
        prior_year=prior_year,
        current_year=current_year,
    )

    # Step 1: Deterministic field diff
    field_changes = compute_field_diff(prior_fields, current_fields)
    report.field_changes = field_changes
    report.breaking_count = sum(
        1 for c in field_changes if c.change_type == "BREAKING_CHANGE"
    )

    # Step 3: Extract "What's New"
    whats_new = ""
    if instructions_pdf_path:
        whats_new = extract_whats_new(instructions_pdf_path)

    # Step 4: LLM analysis
    field_diff_json = json.dumps(
        [{"change_type": c.change_type, "field_id": c.field_id, "description": c.description}
         for c in field_changes],
        indent=2,
    )

    prompt = (
        f"You are analyzing IRS tax form {form_id} changes from {prior_year} to {current_year}.\n\n"
        f"FIELD CHANGES DETECTED:\n{field_diff_json}\n\n"
    )
    if whats_new:
        prompt += (
            f'"WHAT\'S NEW" SECTION FROM {current_year} INSTRUCTIONS:\n{whats_new}\n\n'
        )
    prompt += (
        "Analyze these changes and for each one:\n"
        "1. What tax law or IRS rule drove this change?\n"
        "2. What does our tax normalization system need to update?\n"
        "   (new YAML descriptor fields, updated formulas, new conditional rules)\n"
        "3. Severity: BREAKING (blocks filing) | IMPORTANT (affects calculations) | MINOR (cosmetic)\n\n"
        "Also identify any rule changes mentioned in \"What's New\" that do NOT\n"
        "correspond to a field change but affect calculation logic.\n\n"
        "Respond ONLY in JSON:\n"
        "{\n"
        '  "changes": [\n'
        "    {\n"
        '      "change_type": "...",\n'
        '      "field_id": "...",\n'
        '      "description": "...",\n'
        '      "tax_law_reference": "...",\n'
        '      "yaml_update_required": true,\n'
        '      "yaml_suggestion": "...",\n'
        '      "severity": "BREAKING|IMPORTANT|MINOR"\n'
        "    }\n"
        "  ],\n"
        '  "logic_only_changes": [\n'
        "    {\n"
        '      "description": "...",\n'
        '      "tax_law_reference": "...",\n'
        '      "affected_lines": [],\n'
        '      "severity": "..."\n'
        "    }\n"
        "  ],\n"
        '  "summary": "Plain English summary of what changed and what to do"\n'
        "}"
    )

    try:
        if _claude_caller:
            raw = await _claude_caller(prompt)
        else:
            raw = await _call_claude_for_rules(prompt, anthropic_api_key)
        report.raw_llm_response = raw
    except Exception as exc:
        raise RuleAnalysisError(f"Claude API call failed: {exc}") from exc

    # Parse LLM response
    try:
        data = _parse_llm_json(raw)
    except (json.JSONDecodeError, ValueError) as exc:
        raise RuleAnalysisError(
            f"Malformed LLM response: {exc}", raw_response=raw
        ) from exc

    # Process LLM changes
    report.summary = data.get("summary", "")
    for change in data.get("changes", []):
        if change.get("yaml_update_required"):
            report.descriptor_tasks.append(DescriptorUpdateTask(
                form_id=form_id,
                tax_year=current_year,
                field_id=change.get("field_id", ""),
                change_type=change.get("change_type", ""),
                yaml_suggestion=change.get("yaml_suggestion", ""),
            ))
        if change.get("severity") == "BREAKING":
            report.breaking_count += 1

    for logic in data.get("logic_only_changes", []):
        report.logic_changes.append(LogicChange(
            description=logic.get("description", ""),
            tax_law_reference=logic.get("tax_law_reference", ""),
            affected_lines=logic.get("affected_lines", []),
            severity=logic.get("severity", "MINOR"),
        ))

    return report


async def _call_claude_for_rules(prompt: str, api_key: str | None = None) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=api_key or "")
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def _parse_llm_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)
    return json.loads(text)
