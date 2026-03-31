"""Tests for ValueFormatter — value → IRS AcroForm string conversion."""

import pytest
from datetime import datetime, date

from acroform_filler.formatter import ValueFormatter
from acroform_filler.exceptions import FormattingError


@pytest.fixture
def fmt():
    return ValueFormatter()


class TestCurrencyFormatting:
    """Currency formatting for IRS forms."""

    def test_whole_number(self, fmt):
        """currency: 125000.0 → '125000'."""
        assert fmt.format(125000.0, "Text", "currency") == "125000"

    def test_rounds_to_whole_dollars(self, fmt):
        """currency: 125000.50 → '125001' (IRS rounds to whole dollars)."""
        assert fmt.format(125000.50, "Text", "currency") == "125001"

    def test_zero(self, fmt):
        """currency: 0.0 → '0'."""
        assert fmt.format(0.0, "Text", "currency") == "0"

    def test_negative(self, fmt):
        """currency: -5000.0 → '-5000' (negative preserved for loss lines)."""
        assert fmt.format(-5000.0, "Text", "currency") == "-5000"

    def test_none(self, fmt):
        """currency: None → ''."""
        assert fmt.format(None, "Text", "currency") == ""


class TestSSNFormatting:
    """SSN formatting."""

    def test_raw_digits(self, fmt):
        """ssn: '123456789' → '123-45-6789'."""
        assert fmt.format("123456789", "Text", "ssn") == "123-45-6789"

    def test_already_formatted_idempotent(self, fmt):
        """ssn: already formatted '123-45-6789' → '123-45-6789' (idempotent)."""
        assert fmt.format("123-45-6789", "Text", "ssn") == "123-45-6789"

    def test_wrong_length(self, fmt):
        """ssn: wrong length → FormattingError."""
        with pytest.raises(FormattingError) as exc_info:
            fmt.format("12345", "Text", "ssn")
        assert "9 digits" in str(exc_info.value)


class TestEINFormatting:
    """EIN formatting."""

    def test_raw_digits(self, fmt):
        """ein: '123456789' → '12-3456789'."""
        assert fmt.format("123456789", "Text", "ein") == "12-3456789"

    def test_already_formatted(self, fmt):
        """ein: already formatted → idempotent."""
        assert fmt.format("12-3456789", "Text", "ein") == "12-3456789"

    def test_wrong_length(self, fmt):
        """ein: wrong digit count → FormattingError."""
        with pytest.raises(FormattingError):
            fmt.format("12345", "Text", "ein")


class TestDateFormatting:
    """Date formatting for IRS forms (MM/DD/YYYY)."""

    def test_datetime_object(self, fmt):
        """date: datetime(2024, 12, 31) → '12/31/2024'."""
        assert fmt.format(datetime(2024, 12, 31), "Text", "date") == "12/31/2024"

    def test_iso_string(self, fmt):
        """date: string '2024-12-31' → '12/31/2024'."""
        assert fmt.format("2024-12-31", "Text", "date") == "12/31/2024"

    def test_date_object(self, fmt):
        """date: date(2024, 12, 31) → '12/31/2024'."""
        assert fmt.format(date(2024, 12, 31), "Text", "date") == "12/31/2024"

    def test_invalid_string(self, fmt):
        """date: invalid string → FormattingError."""
        with pytest.raises(FormattingError):
            fmt.format("not-a-date", "Text", "date")


class TestPercentageFormatting:
    """Percentage formatting — IRS expects whole numbers."""

    def test_decimal_to_whole(self, fmt):
        """percentage: 0.21 → '21'."""
        assert fmt.format(0.21, "Text", "percentage") == "21"

    def test_rounds_up(self, fmt):
        """percentage: 0.215 → '22' (rounded)."""
        # 0.215 * 100 = 21.5 → round → 22
        assert fmt.format(0.215, "Text", "percentage") == "22"

    def test_full_hundred(self, fmt):
        """percentage: 1.0 (100%) → '100'."""
        assert fmt.format(1.0, "Text", "percentage") == "100"

    def test_whole_number_passthrough(self, fmt):
        """percentage: 50 (already whole) → '50'."""
        assert fmt.format(50, "Text", "percentage") == "50"


class TestIntegerFormatting:
    """Integer formatting."""

    def test_float_to_int(self, fmt):
        """integer: 1200.0 → '1200'."""
        assert fmt.format(1200.0, "Text", "integer") == "1200"

    def test_rounds(self, fmt):
        """integer: 1200.9 → '1201' (rounded)."""
        assert fmt.format(1200.9, "Text", "integer") == "1201"


class TestBooleanFormatting:
    """Boolean / checkbox formatting."""

    def test_true(self, fmt):
        """boolean True → '1'."""
        assert fmt.format(True, "Checkbox", "boolean") == "1"

    def test_false(self, fmt):
        """boolean False → 'Off'."""
        assert fmt.format(False, "Checkbox", "boolean") == "Off"


class TestNoneFormatting:
    """None value formatting across all types."""

    def test_none_any_type(self, fmt):
        """None → '' for any data type."""
        assert fmt.format(None, "Text", "currency") == ""
        assert fmt.format(None, "Text", "ssn") == ""
        assert fmt.format(None, "Checkbox", "boolean") == ""
        assert fmt.format(None, "Text", "date") == ""
        assert fmt.format(None, "Text", "integer") == ""
