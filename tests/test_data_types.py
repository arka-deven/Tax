"""Tests for data-type validation logic."""

import pytest

from tax_normalizer.models import validate_data_type
from tax_normalizer.exceptions import DataTypeError


class TestCurrencyType:
    """currency data type validation."""

    def test_negative_allowed(self):
        """Currency: negative value is allowed (returns/allowances)."""
        assert validate_data_type("f", -1500.50, "currency") == -1500.50

    def test_non_numeric_string_raises(self):
        """Currency: non-numeric string → DataTypeError."""
        with pytest.raises(DataTypeError) as exc_info:
            validate_data_type("f", "abc", "currency")
        assert exc_info.value.expected_type == "currency"


class TestIntegerType:
    """integer data type validation."""

    def test_float_input_rounded(self):
        """Integer: float input (1.5) → rounded to nearest int."""
        result = validate_data_type("f", 1.5, "integer")
        assert result == 2
        assert isinstance(result, int)

    def test_valid_integer(self):
        """Integer: valid int passes through."""
        assert validate_data_type("f", 42, "integer") == 42


class TestSSNType:
    """ssn data type validation."""

    def test_valid_ssn(self):
        """SSN: correct format 'XXX-XX-XXXX' passes."""
        assert validate_data_type("f", "123-45-6789", "ssn") == "123-45-6789"

    def test_malformed_ssn(self):
        """SSN: malformed format → DataTypeError."""
        with pytest.raises(DataTypeError) as exc_info:
            validate_data_type("f", "12345-6789", "ssn")
        assert "XXX-XX-XXXX" in exc_info.value.detail


class TestEINType:
    """ein data type validation."""

    def test_valid_ein(self):
        """EIN: correct format 'XX-XXXXXXX' passes."""
        assert validate_data_type("f", "12-3456789", "ein") == "12-3456789"

    def test_malformed_ein(self):
        """EIN: malformed format → DataTypeError."""
        with pytest.raises(DataTypeError) as exc_info:
            validate_data_type("f", "123456789", "ein")
        assert "XX-XXXXXXX" in exc_info.value.detail


class TestPercentageType:
    """percentage data type validation."""

    def test_over_max(self):
        """Percentage: value > 100 → DataTypeError when max_val=100."""
        with pytest.raises(DataTypeError):
            validate_data_type("f", 150, "percentage", max_val=100)

    def test_valid_percentage(self):
        """Percentage: value within range passes."""
        assert validate_data_type("f", 75.5, "percentage", max_val=100) == 75.5


class TestDateType:
    """date data type validation."""

    def test_valid_iso_date(self):
        """Date: ISO 8601 format passes."""
        assert validate_data_type("f", "2024-01-15", "date") == "2024-01-15"

    def test_wrong_format(self):
        """Date: wrong format → DataTypeError."""
        with pytest.raises(DataTypeError) as exc_info:
            validate_data_type("f", "01/15/2024", "date")
        assert "ISO 8601" in exc_info.value.detail


class TestNoneHandling:
    """None value passes through for all types."""

    def test_none_currency(self):
        """None → None for currency."""
        assert validate_data_type("f", None, "currency") is None

    def test_none_ssn(self):
        """None → None for ssn."""
        assert validate_data_type("f", None, "ssn") is None
