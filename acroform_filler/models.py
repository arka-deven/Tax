"""Data models for the AcroForm PDF filler."""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class FieldType(Enum):
    TEXT = "Text"
    CHECKBOX = "Checkbox"
    RADIO = "Radio"
    DROPDOWN = "Dropdown"
    SIGNATURE = "Signature"


@dataclass
class FieldMeta:
    """Metadata about a single AcroForm field extracted from a PDF."""

    field_id: str
    field_type: FieldType
    page_number: int
    is_read_only: bool = False
    max_length: int | None = None
    allowed_values: list[str] = field(default_factory=list)
    current_value: str | None = None


@dataclass
class SkippedField:
    """A field that was intentionally not filled, with a reason."""

    field_id: str
    reason_code: str  # machine-readable: "signature_required", "read_only", etc.
    message: str  # human-readable explanation


@dataclass
class AuditLogEntry:
    """Per-field audit trail entry."""

    field_id: str
    line_label: str
    raw_value: Any
    formatted_value: str
    source_type: str


@dataclass
class AuditLog:
    """Complete audit trail for a fill operation."""

    form_id: str
    tax_year: int
    filled_at: str = ""  # ISO timestamp
    entity_name: str = ""
    ein: str = ""
    fields: list[AuditLogEntry] = field(default_factory=list)
    pdf_sha256: str = ""
    filler_version: str = "1.0.0"
    dry_run: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "form_id": self.form_id,
            "tax_year": self.tax_year,
            "filled_at": self.filled_at,
            "entity_name": self.entity_name,
            "ein": self.ein,
            "fields": [asdict(e) for e in self.fields],
            "pdf_sha256": self.pdf_sha256,
            "filler_version": self.filler_version,
            "dry_run": self.dry_run,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, default=str)


@dataclass
class FillerConfig:
    """Configuration for a single PDF fill operation."""

    form_id: str
    tax_year: int
    pdf_template_path: str
    output_path: str
    flatten: bool = True
    dry_run: bool = False
    audit_log_path: str = ""


@dataclass
class FillResult:
    """Result of a fill operation."""

    output_path: str = ""
    filled_count: int = 0
    skipped_fields: list[SkippedField] = field(default_factory=list)
    mismatched_fields: list[str] = field(default_factory=list)
    audit_log: AuditLog | None = None
    success: bool = False
