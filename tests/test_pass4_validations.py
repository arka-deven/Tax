"""Tests for Pass 4 — Cross-field validations."""

import pytest

from tax_normalizer.models import SourceType, Severity
from tax_normalizer.exceptions import ValidationDependencyError
from tests.conftest import make_field, build_normalizer


class TestCrossFieldValidations:
    """Pass 4: evaluate cross-field validation rules."""

    def test_rule_passes(self, make_fd):
        """Validation rule passes → no error."""
        fields = [
            make_fd(field_id="line_3", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["a"]),
            make_fd(field_id="line_5", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["b"],
                    cross_validations=["line_5 <= line_3"]),
        ]
        n = build_normalizer(fields, {"a": 1000, "b": 500})
        result = n.normalize()
        assert result.errors == []

    def test_rule_fails_with_values_in_message(self, make_fd):
        """Rule fails → ERROR with rule string and both field values."""
        fields = [
            make_fd(field_id="line_3", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["a"]),
            make_fd(field_id="line_5", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["b"],
                    cross_validations=["line_5 <= line_3"]),
        ]
        n = build_normalizer(fields, {"a": 100, "b": 500})
        result = n.normalize()
        assert len(result.errors) == 1
        err = result.errors[0]
        assert "line_5 <= line_3" in err.message
        assert "500" in err.message
        assert "100" in err.message

    def test_unresolved_field_raises(self, make_fd):
        """Rule references an unresolved field → ValidationDependencyError."""
        fields = [
            make_fd(
                field_id="line_5",
                mandatory=True,
                source_type=SourceType.QBO,
                qbo_accounts=["b"],
                cross_validations=["line_5 <= ghost_field"],
            ),
        ]
        n = build_normalizer(fields, {"b": 500})
        with pytest.raises(ValidationDependencyError) as exc_info:
            n.normalize()
        assert "ghost_field" in str(exc_info.value)

    def test_multiple_rules_partial_failure(self, make_fd):
        """Multiple rules on one field: first passes, second fails → only failure reported."""
        fields = [
            make_fd(field_id="income", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["i"]),
            make_fd(field_id="deduction", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["d"],
                    cross_validations=[
                        "deduction >= 0",          # passes
                        "deduction <= income",      # fails
                    ]),
        ]
        n = build_normalizer(fields, {"i": 100, "d": 500})
        result = n.normalize()
        # Only the second rule should produce an error
        cross_errors = [e for e in result.errors if e.error_type == "cross_validation_failed"]
        assert len(cross_errors) == 1
        assert "deduction <= income" in cross_errors[0].message

    def test_percentage_rule(self, make_fd):
        """Rule with percentage: line_deduction <= line_income * 0.25."""
        fields = [
            make_fd(field_id="line_income", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["i"]),
            make_fd(field_id="line_deduction", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["d"],
                    cross_validations=["line_deduction <= line_income * 0.25"]),
        ]
        # 300 > 1000 * 0.25 = 250 → should fail
        n = build_normalizer(fields, {"i": 1000, "d": 300})
        result = n.normalize()
        assert len(result.errors) == 1
        assert "line_deduction <= line_income * 0.25" in result.errors[0].message

    def test_rule_on_none_optional_skipped(self, make_fd):
        """Rule on optional field that is None → skip validation."""
        fields = [
            make_fd(field_id="income", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["i"]),
            make_fd(
                field_id="optional_ded",
                mandatory=False,
                source_type=SourceType.CONDITIONAL,
                condition="has_foreign_income == True",
                cross_validations=["optional_ded <= income"],
            ),
        ]
        n = build_normalizer(fields, {"i": 1000}, {"has_foreign_income": False})
        result = n.normalize()
        # optional_ded is None (condition False), validation should be skipped
        cross_errors = [e for e in result.errors if e.error_type == "cross_validation_failed"]
        assert cross_errors == []
