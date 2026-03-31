"""Custom exceptions for the tax normalization pipeline."""


class NormalizationError(Exception):
    """Base exception for all normalization errors."""


class CyclicDependencyError(NormalizationError):
    """Raised when calculated field formulas contain circular dependencies."""

    def __init__(self, cycle: list[str]):
        self.cycle = cycle
        super().__init__(f"Circular dependency detected: {' → '.join(cycle)}")


class MissingDependencyError(NormalizationError):
    """Raised when a formula references a field that was not resolved in prior passes."""

    def __init__(self, field_id: str, missing_dep: str):
        self.field_id = field_id
        self.missing_dep = missing_dep
        super().__init__(
            f"Field '{field_id}' depends on '{missing_dep}' which was not resolved"
        )


class FormulaSecurityError(NormalizationError):
    """Raised when a formula contains forbidden operations."""

    def __init__(self, formula: str, reason: str):
        self.formula = formula
        self.reason = reason
        super().__init__(f"Unsafe formula rejected: {reason} — formula: '{formula}'")


class ConditionParseError(NormalizationError):
    """Raised when a conditional field's condition string is malformed."""

    def __init__(self, field_id: str, condition: str, detail: str):
        self.field_id = field_id
        self.condition = condition
        self.detail = detail
        super().__init__(
            f"Malformed condition on field '{field_id}': {detail} — condition: '{condition}'"
        )


class ValidationDependencyError(NormalizationError):
    """Raised when a cross-field validation references an unresolved field."""

    def __init__(self, rule: str, missing_field: str):
        self.rule = rule
        self.missing_field = missing_field
        super().__init__(
            f"Validation rule references unresolved field '{missing_field}': {rule}"
        )


class DescriptorValidationError(NormalizationError):
    """Raised when a YAML descriptor file is structurally invalid."""

    def __init__(self, file_path: str, detail: str):
        self.file_path = file_path
        self.detail = detail
        super().__init__(f"Invalid descriptor '{file_path}': {detail}")


class DuplicateFieldError(NormalizationError):
    """Raised when two fields share the same field_id in one descriptor file."""

    def __init__(self, file_path: str, field_id: str):
        self.file_path = file_path
        self.field_id = field_id
        super().__init__(
            f"Duplicate field_id '{field_id}' in descriptor '{file_path}'"
        )


class DataTypeError(NormalizationError):
    """Raised when a resolved value fails data-type validation."""

    def __init__(self, field_id: str, expected_type: str, value: object, detail: str):
        self.field_id = field_id
        self.expected_type = expected_type
        self.value = value
        self.detail = detail
        super().__init__(
            f"Type error on field '{field_id}': expected {expected_type}, "
            f"got {value!r} — {detail}"
        )
