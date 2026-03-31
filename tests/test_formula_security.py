"""Tests for formula security — safe_eval whitelist enforcement."""

import pytest

from tax_normalizer.formula_engine import safe_eval
from tax_normalizer.exceptions import FormulaSecurityError


class TestFormulaSecurity:
    """Ensure only whitelisted operations execute in formulas."""

    def test_dunder_import_blocked(self):
        """__import__ in formula → FormulaSecurityError."""
        with pytest.raises(FormulaSecurityError):
            safe_eval("__import__('os')", {})

    def test_open_blocked(self):
        """open() in formula → FormulaSecurityError."""
        with pytest.raises(FormulaSecurityError):
            safe_eval("open('/etc/passwd')", {})

    def test_os_system_blocked(self):
        """os.system in formula → FormulaSecurityError."""
        with pytest.raises(FormulaSecurityError):
            safe_eval("os.system('ls')", {})

    def test_nested_eval_blocked(self):
        """Nested eval in formula → FormulaSecurityError."""
        with pytest.raises(FormulaSecurityError):
            safe_eval("eval('1+1')", {})

    def test_valid_formula_executes(self):
        """Valid formula with only whitelisted ops → executes safely."""
        result = safe_eval("max(a, 0) + min(b, 100)", {"a": -5, "b": 200})
        assert result == 100.0

    def test_exec_blocked(self):
        """exec() in formula → FormulaSecurityError."""
        with pytest.raises(FormulaSecurityError):
            safe_eval("exec('x=1')", {})

    def test_subprocess_blocked(self):
        """subprocess reference → FormulaSecurityError."""
        with pytest.raises(FormulaSecurityError):
            safe_eval("subprocess.call('ls')", {})

    def test_getattr_blocked(self):
        """getattr() → FormulaSecurityError."""
        with pytest.raises(FormulaSecurityError):
            safe_eval("getattr(x, '__class__')", {"x": 1})

    def test_arithmetic_only(self):
        """Pure arithmetic formula executes correctly."""
        result = safe_eval("a + b * 2 - c / 4", {"a": 10, "b": 5, "c": 8})
        assert result == 18.0

    def test_round_function_allowed(self):
        """round() is whitelisted and works."""
        result = safe_eval("round(a / 3, 2)", {"a": 10})
        # safe_eval rounds result to 2 decimals
        assert result == 3.33

    def test_abs_function_allowed(self):
        """abs() is whitelisted and works."""
        result = safe_eval("abs(a)", {"a": -42})
        assert result == 42.0
