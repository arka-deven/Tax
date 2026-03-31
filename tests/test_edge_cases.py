"""Additional edge-case tests to cover remaining branches."""

import pytest

from tax_normalizer.models import SourceType, FieldError, Severity, validate_data_type
from tax_normalizer.exceptions import (
    FormulaSecurityError,
    ConditionParseError,
    DataTypeError,
    DescriptorValidationError,
)
from tax_normalizer.formula_engine import safe_eval, topological_sort, extract_dependencies
from tax_normalizer.loader import DescriptorLoader
from tests.conftest import make_field, build_normalizer


class TestFormulaSyntaxError:
    """Cover formula AST syntax error branch."""

    def test_syntax_error_in_formula(self):
        """Malformed formula (syntax error) → FormulaSecurityError."""
        with pytest.raises(FormulaSecurityError) as exc_info:
            safe_eval("a + * b", {"a": 1, "b": 2})
        assert "Syntax error" in str(exc_info.value)


class TestFormulaDisallowedASTNode:
    """Cover disallowed AST node branch (e.g. list comprehension)."""

    def test_list_literal_blocked(self):
        """List literal in formula → FormulaSecurityError (disallowed AST node)."""
        with pytest.raises(FormulaSecurityError) as exc_info:
            safe_eval("[1, 2, 3]", {})
        assert "Disallowed AST node" in str(exc_info.value)


class TestFormulaMethodCallBlocked:
    """Cover method-call branch in AST walker."""

    def test_method_call_blocked(self):
        """Method call (a.bit_length()) → FormulaSecurityError."""
        with pytest.raises(FormulaSecurityError) as exc_info:
            safe_eval("a.bit_length()", {"a": 5})
        assert "method calls" in str(exc_info.value).lower()


class TestFormulaUnwhitelistedFunction:
    """Cover non-whitelisted function name branch."""

    def test_len_not_whitelisted(self):
        """len() is not whitelisted → FormulaSecurityError."""
        with pytest.raises(FormulaSecurityError) as exc_info:
            safe_eval("len(a)", {"a": 5})
        assert "not whitelisted" in str(exc_info.value)


class TestFieldErrorProperties:
    """Cover FieldError.human_readable and form_display properties."""

    def test_human_readable_format(self):
        """FieldError.human_readable returns formatted string."""
        err = FieldError(
            field_id="f1", line="5", label="Revenue",
            error_type="missing", severity=Severity.ERROR,
            message="Account not found",
        )
        assert "[ERROR]" in err.human_readable
        assert "Line 5" in err.human_readable
        assert "Revenue" in err.human_readable
        assert "Account not found" in err.human_readable

    def test_form_display(self):
        """FieldError.form_display returns line and label."""
        err = FieldError(
            field_id="f1", line="3", label="COGS",
            error_type="x", severity=Severity.WARNING, message="y",
        )
        assert err.form_display == "Line 3 (COGS)"


class TestPartialQBOMissingSomeOptional:
    """Cover the branch: some accounts missing, optional, no default → partial sum."""

    def test_some_missing_optional_partial_sum(self, make_fd):
        """Some accounts missing, optional, no default → partial sum + warning."""
        fd = make_fd(
            field_id="total",
            mandatory=False,
            source_type=SourceType.QBO,
            qbo_accounts=["a", "b", "c"],
        )
        n = build_normalizer([fd], {"a": 100, "c": 200})
        result = n.normalize()
        assert result.resolved["total"] == 300.0
        assert len(result.warnings) == 1
        assert "b" in result.warnings[0].message

    def test_some_missing_optional_with_default(self, make_fd):
        """Some accounts missing, optional with default → default used."""
        fd = make_fd(
            field_id="total",
            mandatory=False,
            source_type=SourceType.QBO,
            qbo_accounts=["a", "b"],
            default_value=999,
        )
        n = build_normalizer([fd], {"a": 100})
        result = n.normalize()
        assert result.resolved["total"] == 999.0


class TestConditionalEdgeCases:
    """Cover remaining conditional branches."""

    def test_condition_true_no_qbo_no_default_error(self, make_fd):
        """Condition True, no QBO accounts, not resolved, no default → error."""
        fd = make_fd(
            field_id="cond_f",
            source_type=SourceType.CONDITIONAL,
            condition="active == True",
            # no qbo_accounts, no default
        )
        n = build_normalizer([fd], {}, {"active": True})
        result = n.normalize()
        assert len(result.errors) == 1
        assert "cond_f" == result.errors[0].field_id

    def test_condition_true_no_qbo_with_default(self, make_fd):
        """Condition True, no QBO accounts, has default_value → default used."""
        fd = make_fd(
            field_id="cond_f",
            source_type=SourceType.CONDITIONAL,
            condition="active == True",
            default_value=50.0,
        )
        n = build_normalizer([fd], {}, {"active": True})
        result = n.normalize()
        assert result.resolved["cond_f"] == 50.0
        assert result.errors == []

    def test_condition_disallowed_ast_node(self, make_fd):
        """Condition with disallowed AST node (e.g. lambda) → ConditionParseError."""
        fd = make_fd(
            field_id="bad",
            source_type=SourceType.CONDITIONAL,
            condition="(lambda: True)()",
        )
        n = build_normalizer([fd], {}, {})
        with pytest.raises(ConditionParseError):
            n.normalize()

    def test_condition_runtime_error(self, make_fd):
        """Condition that raises at runtime (e.g. undefined var) → ConditionParseError."""
        fd = make_fd(
            field_id="bad",
            source_type=SourceType.CONDITIONAL,
            condition="undefined_var == True",
        )
        n = build_normalizer([fd], {}, {})
        with pytest.raises(ConditionParseError):
            n.normalize()


class TestCrossValidationEvalError:
    """Cover the validation eval exception branch."""

    def test_validation_eval_failure(self, make_fd):
        """Rule that causes an eval exception → error recorded."""
        fields = [
            make_fd(
                field_id="f1",
                mandatory=True,
                source_type=SourceType.QBO,
                qbo_accounts=["a"],
                cross_validations=["f1 / 0 == 1"],  # ZeroDivisionError
            ),
        ]
        n = build_normalizer(fields, {"a": 100})
        result = n.normalize()
        val_errors = [e for e in result.errors if e.error_type == "validation_error"]
        assert len(val_errors) == 1


class TestLoaderEdgeCases:
    """Cover remaining loader branches."""

    def test_missing_fields_key(self, tmp_descriptors_dir, yaml_writer):
        """YAML root without 'fields' key → DescriptorValidationError."""
        yaml_writer(tmp_descriptors_dir, "nofields_2024.yaml", {
            "form": "X",
            "tax_year": 2024,
            # no 'fields' key
        })
        loader = DescriptorLoader(tmp_descriptors_dir)
        with pytest.raises(DescriptorValidationError) as exc_info:
            loader.load("nofields", 2024)
        assert "fields" in str(exc_info.value).lower()

    def test_invalid_data_type(self, tmp_descriptors_dir, yaml_writer):
        """Invalid data_type in field → DescriptorValidationError."""
        yaml_writer(tmp_descriptors_dir, "badtype_2024.yaml", {
            "form": "X",
            "tax_year": 2024,
            "fields": [{
                "field_id": "f1", "label": "Test", "form": "X",
                "line": "1", "source_type": "QBO", "data_type": "hexadecimal",
            }],
        })
        loader = DescriptorLoader(tmp_descriptors_dir)
        with pytest.raises(DescriptorValidationError) as exc_info:
            loader.load("badtype", 2024)
        assert "hexadecimal" in str(exc_info.value)

    def test_load_with_meta_missing_fields(self, tmp_descriptors_dir, yaml_writer):
        """load_with_meta on YAML without 'fields' → DescriptorValidationError."""
        yaml_writer(tmp_descriptors_dir, "nf_2024.yaml", {"form": "X", "tax_year": 2024})
        loader = DescriptorLoader(tmp_descriptors_dir)
        with pytest.raises(DescriptorValidationError):
            loader.load_with_meta("nf", 2024)

    def test_load_with_meta_duplicate(self, tmp_descriptors_dir, yaml_writer):
        """load_with_meta with duplicate field_id → DuplicateFieldError."""
        from tax_normalizer.exceptions import DuplicateFieldError
        yaml_writer(tmp_descriptors_dir, "dup2_2024.yaml", {
            "form": "X", "tax_year": 2024,
            "fields": [
                {"field_id": "f1", "label": "A", "form": "X", "line": "1", "source_type": "QBO"},
                {"field_id": "f1", "label": "B", "form": "X", "line": "2", "source_type": "QBO"},
            ],
        })
        loader = DescriptorLoader(tmp_descriptors_dir)
        with pytest.raises(DuplicateFieldError):
            loader.load_with_meta("dup2", 2024)

    def test_load_with_meta_no_mismatch(self, loader):
        """load_with_meta with matching year → no version mismatch."""
        fields, meta = loader.load_with_meta("1120s", 2024, expected_year=2024)
        assert meta["version_mismatch"] is False
        assert len(fields) >= 10

    def test_file_not_found(self, loader):
        """Non-existent form file → FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            loader.load("nonexistent", 9999)

    def test_mandatory_string_true(self, tmp_descriptors_dir, yaml_writer):
        """mandatory as string 'true' → coerced to bool True."""
        yaml_writer(tmp_descriptors_dir, "str_2024.yaml", {
            "form": "X", "tax_year": 2024,
            "fields": [{
                "field_id": "f1", "label": "T", "form": "X",
                "line": "1", "source_type": "QBO", "mandatory": "true",
            }],
        })
        loader = DescriptorLoader(tmp_descriptors_dir)
        fields = loader.load("str", 2024)
        assert fields[0].mandatory is True


class TestModelValidators:
    """Cover remaining data-type validator branches."""

    def test_string_type(self):
        """String data type passes through as string."""
        assert validate_data_type("f", 12345, "string") == "12345"

    def test_unknown_type_passthrough(self):
        """Unknown data type → value passed through unchanged."""
        assert validate_data_type("f", "anything", "unknown_type") == "anything"

    def test_currency_min_val(self):
        """Currency below min_val → DataTypeError."""
        with pytest.raises(DataTypeError):
            validate_data_type("f", -100, "currency", min_val=0)

    def test_currency_max_val(self):
        """Currency above max_val → DataTypeError."""
        with pytest.raises(DataTypeError):
            validate_data_type("f", 5000, "currency", max_val=1000)

    def test_integer_min_val(self):
        """Integer below min_val → DataTypeError."""
        with pytest.raises(DataTypeError):
            validate_data_type("f", -5, "integer", min_val=0)

    def test_integer_max_val(self):
        """Integer above max_val → DataTypeError."""
        with pytest.raises(DataTypeError):
            validate_data_type("f", 200, "integer", max_val=100)

    def test_integer_non_numeric(self):
        """Integer non-numeric → DataTypeError."""
        with pytest.raises(DataTypeError):
            validate_data_type("f", "abc", "integer")

    def test_percentage_min_val(self):
        """Percentage below min_val → DataTypeError."""
        with pytest.raises(DataTypeError):
            validate_data_type("f", -5, "percentage", min_val=0)

    def test_percentage_non_numeric(self):
        """Percentage non-numeric → DataTypeError."""
        with pytest.raises(DataTypeError):
            validate_data_type("f", "abc", "percentage")


class TestExtractDependencies:
    """Cover extract_dependencies utility."""

    def test_filters_whitelisted_names(self):
        """Whitelisted names (max, min, etc.) are excluded from dependencies."""
        deps = extract_dependencies("max(a, 0) + min(b, 100) + abs(c)")
        assert deps == {"a", "b", "c"}

    def test_no_deps(self):
        """Formula with only constants → empty deps."""
        deps = extract_dependencies("100 + 200")
        # numeric tokens don't match the pattern for identifiers
        assert deps == set()
