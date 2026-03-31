"""Tests for Pass 1 — QBO field resolution."""

import pytest

from tax_normalizer.models import SourceType, Severity
from tests.conftest import make_field, build_normalizer


class TestQBOFieldResolution:
    """Pass 1: resolve QBO account values into form fields."""

    def test_all_accounts_present(self, make_fd):
        """All QBO accounts present → field resolves to their sum."""
        fd = make_fd(
            field_id="revenue",
            mandatory=True,
            source_type=SourceType.QBO,
            qbo_accounts=["sales", "services"],
        )
        n = build_normalizer([fd], {"sales": 1000, "services": 500})
        result = n.normalize()
        assert result.resolved["revenue"] == 1500.0
        assert result.errors == []

    def test_missing_account_mandatory_error(self, make_fd):
        """One account missing and field is mandatory → hard ERROR."""
        fd = make_fd(
            field_id="revenue",
            mandatory=True,
            source_type=SourceType.QBO,
            qbo_accounts=["sales", "services"],
        )
        n = build_normalizer([fd], {"sales": 1000})
        result = n.normalize()
        assert len(result.errors) >= 1
        err = result.errors[0]
        assert err.field_id == "revenue"
        assert err.severity == Severity.ERROR
        assert "services" in err.message

    def test_missing_account_optional_with_default(self, make_fd):
        """One account missing, field optional with default → WARNING + default used."""
        fd = make_fd(
            field_id="returns",
            mandatory=False,
            source_type=SourceType.QBO,
            qbo_accounts=["returns_acct"],
            default_value=42.0,
        )
        n = build_normalizer([fd], {})
        result = n.normalize()
        assert result.resolved["returns"] == 42.0
        assert len(result.warnings) == 1
        assert result.errors == []

    def test_missing_account_optional_no_default(self, make_fd):
        """One account missing, field optional, no default → WARNING + 0.0."""
        fd = make_fd(
            field_id="misc",
            mandatory=False,
            source_type=SourceType.QBO,
            qbo_accounts=["misc_acct"],
        )
        n = build_normalizer([fd], {})
        result = n.normalize()
        assert result.resolved["misc"] == 0.0
        assert len(result.warnings) == 1

    def test_all_accounts_missing_mandatory(self, make_fd):
        """All accounts missing, mandatory → ERROR listing all account names."""
        fd = make_fd(
            field_id="revenue",
            mandatory=True,
            source_type=SourceType.QBO,
            qbo_accounts=["sales", "services"],
        )
        n = build_normalizer([fd], {})
        result = n.normalize()
        assert len(result.errors) >= 1
        assert "sales" in result.errors[0].message
        assert "services" in result.errors[0].message

    def test_all_missing_optional_warn_false_silent(self, make_fd):
        """All accounts missing, optional, warn_if_missing=False → silently skipped."""
        fd = make_fd(
            field_id="other",
            mandatory=False,
            source_type=SourceType.QBO,
            qbo_accounts=["other_acct"],
            warn_if_missing=False,
        )
        n = build_normalizer([fd], {})
        result = n.normalize()
        assert "other" not in result.resolved
        assert result.warnings == []
        assert result.errors == []

    def test_qbo_value_zero_not_missing(self, make_fd):
        """QBO account value is 0 → resolves to 0.0, not treated as missing."""
        fd = make_fd(
            field_id="adj",
            mandatory=True,
            source_type=SourceType.QBO,
            qbo_accounts=["zero_acct"],
        )
        n = build_normalizer([fd], {"zero_acct": 0})
        result = n.normalize()
        assert result.resolved["adj"] == 0.0
        assert result.errors == []

    def test_qbo_value_negative(self, make_fd):
        """QBO account value is negative → resolves correctly."""
        fd = make_fd(
            field_id="returns",
            mandatory=True,
            source_type=SourceType.QBO,
            qbo_accounts=["returns_acct"],
        )
        n = build_normalizer([fd], {"returns_acct": -1500.50})
        result = n.normalize()
        assert result.resolved["returns"] == -1500.50

    def test_multiple_accounts_summed(self, make_fd):
        """Multiple QBO accounts → values are summed correctly."""
        fd = make_fd(
            field_id="total",
            mandatory=True,
            source_type=SourceType.QBO,
            qbo_accounts=["a", "b", "c"],
        )
        n = build_normalizer([fd], {"a": 100, "b": 200, "c": 300})
        result = n.normalize()
        assert result.resolved["total"] == 600.0

    def test_qbo_string_number_coerced(self, make_fd):
        """QBO value is a string that looks like a number → coerced to float."""
        fd = make_fd(
            field_id="amt",
            mandatory=True,
            source_type=SourceType.QBO,
            qbo_accounts=["str_acct"],
        )
        n = build_normalizer([fd], {"str_acct": "12345.67"})
        result = n.normalize()
        assert result.resolved["amt"] == 12345.67
