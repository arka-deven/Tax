"""Core data models for the tax normalization pipeline."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from .exceptions import DataTypeError


class SourceType(Enum):
    QBO = "QBO"
    CALCULATED = "CALCULATED"
    MANUAL = "MANUAL"
    CONDITIONAL = "CONDITIONAL"
    PASSTHROUGH = "PASSTHROUGH"


class Severity(Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"


@dataclass
class FieldDescriptor:
    field_id: str
    label: str
    form: str
    line: str
    mandatory: bool | str  # True, False, or a condition string
    source_type: SourceType
    qbo_accounts: list[str] = field(default_factory=list)
    formula: str | None = None
    data_type: str = "currency"
    min_val: float | None = None
    max_val: float | None = None
    cross_validations: list[str] = field(default_factory=list)
    default_value: Any = None
    warn_if_missing: bool = True
    condition: str | None = None  # For CONDITIONAL source_type


@dataclass
class FieldError:
    field_id: str
    line: str
    label: str
    error_type: str
    severity: Severity
    message: str

    @property
    def human_readable(self) -> str:
        return (
            f"[{self.severity.value}] {self.form_display}: {self.message}"
        )

    @property
    def form_display(self) -> str:
        return f"Line {self.line} ({self.label})"


@dataclass
class NormalizationResult:
    resolved: dict[str, Any] = field(default_factory=dict)
    errors: list[FieldError] = field(default_factory=list)
    warnings: list[FieldError] = field(default_factory=list)
    manual_required: list[str] = field(default_factory=list)

    @property
    def fill_ready(self) -> bool:
        return len(self.errors) == 0

    def summary(self) -> dict[str, int]:
        return {
            "resolved": len(self.resolved),
            "errors": len(self.errors),
            "warnings": len(self.warnings),
            "manual_required": len(self.manual_required),
        }


# ---------------------------------------------------------------------------
# Data-type validators
# ---------------------------------------------------------------------------

_SSN_RE = re.compile(r"^\d{3}-\d{2}-\d{4}$")
_EIN_RE = re.compile(r"^\d{2}-\d{7}$")
_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def validate_data_type(
    field_id: str,
    value: Any,
    data_type: str,
    min_val: float | None = None,
    max_val: float | None = None,
) -> Any:
    """Validate and coerce *value* to the declared data_type.

    Returns the coerced value on success, raises DataTypeError on failure.
    """
    if value is None:
        return None

    if data_type == "currency":
        return _validate_currency(field_id, value, min_val, max_val)
    if data_type == "integer":
        return _validate_integer(field_id, value, min_val, max_val)
    if data_type == "ssn":
        return _validate_ssn(field_id, value)
    if data_type == "ein":
        return _validate_ein(field_id, value)
    if data_type == "percentage":
        return _validate_percentage(field_id, value, min_val, max_val)
    if data_type == "date":
        return _validate_date(field_id, value)
    if data_type == "string":
        return str(value)
    # Fallback — unknown type, pass through
    return value


def _validate_currency(
    field_id: str, value: Any, min_val: float | None, max_val: float | None
) -> float:
    try:
        v = float(value)
    except (TypeError, ValueError):
        raise DataTypeError(field_id, "currency", value, "Non-numeric value")
    if min_val is not None and v < min_val:
        raise DataTypeError(
            field_id, "currency", value, f"Value {v} below minimum {min_val}"
        )
    if max_val is not None and v > max_val:
        raise DataTypeError(
            field_id, "currency", value, f"Value {v} above maximum {max_val}"
        )
    return round(v, 2)


def _validate_integer(
    field_id: str, value: Any, min_val: float | None, max_val: float | None
) -> int:
    try:
        v = float(value)
    except (TypeError, ValueError):
        raise DataTypeError(field_id, "integer", value, "Non-numeric value")
    result = round(v)
    if min_val is not None and result < min_val:
        raise DataTypeError(
            field_id, "integer", value, f"Value {result} below minimum {min_val}"
        )
    if max_val is not None and result > max_val:
        raise DataTypeError(
            field_id, "integer", value, f"Value {result} above maximum {max_val}"
        )
    return result


def _validate_ssn(field_id: str, value: Any) -> str:
    s = str(value)
    if not _SSN_RE.match(s):
        raise DataTypeError(
            field_id, "ssn", value, "SSN must match format XXX-XX-XXXX"
        )
    return s


def _validate_ein(field_id: str, value: Any) -> str:
    s = str(value)
    if not _EIN_RE.match(s):
        raise DataTypeError(
            field_id, "ein", value, "EIN must match format XX-XXXXXXX"
        )
    return s


def _validate_percentage(
    field_id: str, value: Any, min_val: float | None, max_val: float | None
) -> float:
    try:
        v = float(value)
    except (TypeError, ValueError):
        raise DataTypeError(field_id, "percentage", value, "Non-numeric value")
    if min_val is not None and v < min_val:
        raise DataTypeError(
            field_id, "percentage", value, f"Value {v} below minimum {min_val}"
        )
    if max_val is not None and v > max_val:
        raise DataTypeError(
            field_id, "percentage", value, f"Value {v} above maximum {max_val}"
        )
    return v


def _validate_date(field_id: str, value: Any) -> str:
    s = str(value)
    if not _ISO_DATE_RE.match(s):
        raise DataTypeError(
            field_id, "date", value, "Date must be ISO 8601 format YYYY-MM-DD"
        )
    return s
