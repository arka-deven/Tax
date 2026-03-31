"""Tests for Pass 2 — Calculated field resolution."""

import pytest

from tax_normalizer.models import SourceType
from tax_normalizer.exceptions import CyclicDependencyError, MissingDependencyError, FormulaSecurityError
from tests.conftest import make_field, build_normalizer


class TestCalculatedFields:
    """Pass 2: evaluate formulas in topological dependency order."""

    def test_simple_formula(self, make_fd):
        """Simple formula: line_3 = line_1 - line_2 → correct result."""
        fields = [
            make_fd(field_id="line_1", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["a"]),
            make_fd(field_id="line_2", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["b"]),
            make_fd(field_id="line_3", source_type=SourceType.CALCULATED, formula="line_1 - line_2"),
        ]
        n = build_normalizer(fields, {"a": 1000, "b": 400})
        result = n.normalize()
        assert result.resolved["line_3"] == 600.0

    def test_chained_formula(self, make_fd):
        """Chained: line_5 depends on line_4 which depends on line_3 → resolves in order."""
        fields = [
            make_fd(field_id="line_1", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["a"]),
            make_fd(field_id="line_2", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["b"]),
            make_fd(field_id="line_3", source_type=SourceType.CALCULATED, formula="line_1 + line_2"),
            make_fd(field_id="line_4", source_type=SourceType.CALCULATED, formula="line_3 * 2"),
            make_fd(field_id="line_5", source_type=SourceType.CALCULATED, formula="line_4 - line_1"),
        ]
        n = build_normalizer(fields, {"a": 100, "b": 200})
        result = n.normalize()
        assert result.resolved["line_3"] == 300.0
        assert result.resolved["line_4"] == 600.0
        assert result.resolved["line_5"] == 500.0

    def test_circular_dependency_raises(self, make_fd):
        """Circular dependency → raises CyclicDependencyError, not infinite loop."""
        fields = [
            make_fd(field_id="line_a", source_type=SourceType.CALCULATED, formula="line_b + 1"),
            make_fd(field_id="line_b", source_type=SourceType.CALCULATED, formula="line_a + 1"),
        ]
        n = build_normalizer(fields, {})
        with pytest.raises(CyclicDependencyError):
            n.normalize()

    def test_missing_dependency_error(self, make_fd):
        """Formula references an unresolved field → MissingDependencyError."""
        fields = [
            make_fd(field_id="line_3", source_type=SourceType.CALCULATED, formula="missing_field + 1"),
        ]
        n = build_normalizer(fields, {})
        with pytest.raises(MissingDependencyError) as exc_info:
            n.normalize()
        assert "missing_field" in str(exc_info.value)

    def test_formula_with_max(self, make_fd):
        """Formula with max(): max(line_15, 0) → works correctly."""
        fields = [
            make_fd(field_id="line_15", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["a"]),
            make_fd(field_id="line_16", source_type=SourceType.CALCULATED, formula="max(line_15, 0)"),
        ]
        n = build_normalizer(fields, {"a": -500})
        result = n.normalize()
        assert result.resolved["line_16"] == 0.0

    def test_formula_negative_stored_as_is(self, make_fd):
        """Formula producing negative → stored as-is, not clamped."""
        fields = [
            make_fd(field_id="income", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["i"]),
            make_fd(field_id="expense", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["e"]),
            make_fd(field_id="net", source_type=SourceType.CALCULATED, formula="income - expense"),
        ]
        n = build_normalizer(fields, {"i": 100, "e": 500})
        result = n.normalize()
        assert result.resolved["net"] == -400.0

    def test_formula_float_division_rounded(self, make_fd):
        """Float division → result rounded to 2 decimal places."""
        fields = [
            make_fd(field_id="total", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["t"]),
            make_fd(field_id="share", source_type=SourceType.CALCULATED, formula="total / 3"),
        ]
        n = build_normalizer(fields, {"t": 100})
        result = n.normalize()
        assert result.resolved["share"] == 33.33

    def test_forbidden_function_formula_security_error(self, make_fd):
        """Forbidden function (__import__) → FormulaSecurityError."""
        fields = [
            make_fd(field_id="bad", source_type=SourceType.CALCULATED, formula="__import__('os')"),
        ]
        n = build_normalizer(fields, {})
        with pytest.raises(FormulaSecurityError):
            n.normalize()

    def test_calc_field_as_dependency_of_another(self, make_fd):
        """Calculated field is itself a dependency of another calculated field."""
        fields = [
            make_fd(field_id="base", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["b"]),
            make_fd(field_id="mid", source_type=SourceType.CALCULATED, formula="base * 2"),
            make_fd(field_id="top", source_type=SourceType.CALCULATED, formula="mid + base"),
        ]
        n = build_normalizer(fields, {"b": 50})
        result = n.normalize()
        assert result.resolved["mid"] == 100.0
        assert result.resolved["top"] == 150.0
