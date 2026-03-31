"""Value formatter — converts Python values to IRS AcroForm strings."""

from __future__ import annotations

import math
import re
from datetime import date, datetime
from typing import Any

from .exceptions import FormattingError


class ValueFormatter:
    """Formats resolved values into strings suitable for AcroForm PDF fields."""

    def format(self, value: Any, field_type: str, data_type: str = "string") -> str:
        """Format a value for writing to an AcroForm field.

        Args:
            value: The resolved value to format.
            field_type: The AcroForm field type (Text, Checkbox, Radio, etc.).
            data_type: The semantic data type (currency, ssn, ein, date, etc.).

        Returns:
            A string ready for writing to the PDF field.
        """
        if value is None:
            return ""

        # Checkbox/boolean handling
        if field_type == "Checkbox":
            return self._format_checkbox(value)

        # Dispatch on data_type
        formatter = {
            "currency": self._format_currency,
            "ssn": self._format_ssn,
            "ein": self._format_ein,
            "date": self._format_date,
            "percentage": self._format_percentage,
            "integer": self._format_integer,
        }.get(data_type)

        if formatter:
            return formatter(value)

        # Default: stringify
        return str(value)

    def _format_checkbox(self, value: Any) -> str:
        """True → '1', False → 'Off'."""
        if isinstance(value, bool):
            return "1" if value else "Off"
        if isinstance(value, str):
            if value.lower() in ("true", "1", "yes"):
                return "1"
            return "Off"
        return "1" if value else "Off"

    def _format_currency(self, value: Any) -> str:
        """IRS rounds to whole dollars. Negative preserved for loss lines."""
        if value is None:
            return ""
        try:
            v = float(value)
        except (TypeError, ValueError):
            raise FormattingError(value, "currency", "Non-numeric value")
        # IRS rounds to nearest whole dollar (always round 0.5 up, not banker's rounding)
        import math
        if v >= 0:
            rounded = math.floor(v + 0.5)
        else:
            rounded = math.ceil(v - 0.5)
        return str(rounded)

    def _format_ssn(self, value: Any) -> str:
        """Ensure SSN is in XXX-XX-XXXX format."""
        s = str(value).strip()
        # Already formatted?
        if re.match(r"^\d{3}-\d{2}-\d{4}$", s):
            return s
        # Raw digits?
        digits = re.sub(r"[^0-9]", "", s)
        if len(digits) != 9:
            raise FormattingError(value, "ssn", f"Expected 9 digits, got {len(digits)}")
        return f"{digits[:3]}-{digits[3:5]}-{digits[5:]}"

    def _format_ein(self, value: Any) -> str:
        """Ensure EIN is in XX-XXXXXXX format."""
        s = str(value).strip()
        # Already formatted?
        if re.match(r"^\d{2}-\d{7}$", s):
            return s
        # Raw digits?
        digits = re.sub(r"[^0-9]", "", s)
        if len(digits) != 9:
            raise FormattingError(value, "ein", f"Expected 9 digits, got {len(digits)}")
        return f"{digits[:2]}-{digits[2:]}"

    def _format_date(self, value: Any) -> str:
        """Convert to MM/DD/YYYY (IRS standard format)."""
        if isinstance(value, datetime):
            return value.strftime("%m/%d/%Y")
        if isinstance(value, date):
            return value.strftime("%m/%d/%Y")
        s = str(value).strip()
        # Try ISO 8601 (YYYY-MM-DD)
        m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", s)
        if m:
            return f"{m.group(2)}/{m.group(3)}/{m.group(1)}"
        # Already MM/DD/YYYY?
        if re.match(r"^\d{2}/\d{2}/\d{4}$", s):
            return s
        raise FormattingError(value, "date", "Cannot parse date; expected YYYY-MM-DD or datetime")

    def _format_percentage(self, value: Any) -> str:
        """IRS expects whole number percentage (0.21 → '21')."""
        try:
            v = float(value)
        except (TypeError, ValueError):
            raise FormattingError(value, "percentage", "Non-numeric value")
        # If value <= 1.0, treat as decimal (0.21 = 21%)
        # If value > 1.0, treat as already a whole number
        if abs(v) <= 1.0 and v != 0:
            whole = round(v * 100)
        else:
            whole = round(v)
        return str(whole)

    def _format_integer(self, value: Any) -> str:
        """Round to nearest integer."""
        try:
            v = float(value)
        except (TypeError, ValueError):
            raise FormattingError(value, "integer", "Non-numeric value")
        return str(round(v))
