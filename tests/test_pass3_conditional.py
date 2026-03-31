"""Tests for Pass 3 — Conditional field resolution."""

import pytest

from tax_normalizer.models import SourceType, Severity
from tax_normalizer.exceptions import ConditionParseError
from tests.conftest import make_field, build_normalizer


class TestConditionalFields:
    """Pass 3: evaluate conditions and resolve or skip fields."""

    def test_condition_true_with_data(self, make_fd):
        """Condition True + QBO data present → resolves normally."""
        fd = make_fd(
            field_id="foreign_tax",
            source_type=SourceType.CONDITIONAL,
            condition="has_foreign_income == True",
            qbo_accounts=["foreign_tax_paid"],
        )
        n = build_normalizer(
            [fd],
            {"foreign_tax_paid": 5000},
            {"has_foreign_income": True},
        )
        result = n.normalize()
        assert result.resolved["foreign_tax"] == 5000.0
        assert result.errors == []

    def test_condition_true_missing_data_error(self, make_fd):
        """Condition True + field data missing → hard ERROR."""
        fd = make_fd(
            field_id="foreign_tax",
            source_type=SourceType.CONDITIONAL,
            condition="has_foreign_income == True",
            qbo_accounts=["foreign_tax_paid"],
        )
        n = build_normalizer(
            [fd],
            {},
            {"has_foreign_income": True},
        )
        result = n.normalize()
        assert len(result.errors) >= 1
        assert result.errors[0].field_id == "foreign_tax"

    def test_condition_false_skipped(self, make_fd):
        """Condition evaluates False → field set to None, no error."""
        fd = make_fd(
            field_id="foreign_tax",
            source_type=SourceType.CONDITIONAL,
            condition="has_foreign_income == True",
            qbo_accounts=["foreign_tax_paid"],
        )
        n = build_normalizer(
            [fd],
            {"foreign_tax_paid": 5000},
            {"has_foreign_income": False},
        )
        result = n.normalize()
        assert result.resolved["foreign_tax"] is None
        assert result.errors == []

    def test_condition_references_qbo_field(self, make_fd):
        """Condition references a QBO-resolved field from Pass 1."""
        fields = [
            make_fd(
                field_id="revenue",
                mandatory=True,
                source_type=SourceType.QBO,
                qbo_accounts=["sales"],
            ),
            make_fd(
                field_id="bonus_field",
                source_type=SourceType.CONDITIONAL,
                condition="revenue > 100000",
                qbo_accounts=["bonus"],
            ),
        ]
        n = build_normalizer(
            fields,
            {"sales": 200000, "bonus": 5000},
        )
        result = n.normalize()
        assert result.resolved["bonus_field"] == 5000.0

    def test_condition_references_entity_context(self, make_fd):
        """Condition references an entity_context key."""
        fd = make_fd(
            field_id="state_tax",
            source_type=SourceType.CONDITIONAL,
            condition="state == 'CA'",
            qbo_accounts=["state_tax_paid"],
        )
        n = build_normalizer(
            [fd],
            {"state_tax_paid": 3000},
            {"state": "CA"},
        )
        result = n.normalize()
        assert result.resolved["state_tax"] == 3000.0

    def test_condition_string_expression(self, make_fd):
        """Condition is a string expression → parsed and evaluated safely."""
        fd = make_fd(
            field_id="sched_c",
            source_type=SourceType.CONDITIONAL,
            condition="entity_type == 'sole_proprietor'",
            qbo_accounts=["biz_income"],
        )
        n = build_normalizer(
            [fd],
            {"biz_income": 45000},
            {"entity_type": "sole_proprietor"},
        )
        result = n.normalize()
        assert result.resolved["sched_c"] == 45000.0

    def test_malformed_condition_raises(self, make_fd):
        """Malformed condition string → ConditionParseError."""
        fd = make_fd(
            field_id="bad_cond",
            source_type=SourceType.CONDITIONAL,
            condition="this is not valid python ===",
            qbo_accounts=["x"],
        )
        n = build_normalizer([fd], {"x": 1}, {})
        with pytest.raises(ConditionParseError):
            n.normalize()

    def test_condition_true_uses_default(self, make_fd):
        """Condition True + missing data + default_value → default used, no error."""
        fd = make_fd(
            field_id="foreign_credit",
            source_type=SourceType.CONDITIONAL,
            condition="has_foreign_income == True",
            qbo_accounts=["foreign_credit_acct"],
            default_value=0,
        )
        n = build_normalizer(
            [fd],
            {},
            {"has_foreign_income": True},
        )
        result = n.normalize()
        assert result.resolved["foreign_credit"] == 0.0
        assert result.errors == []
