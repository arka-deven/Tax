"""Custom exceptions for the AcroForm PDF filler."""


class FillerError(Exception):
    """Base exception for all filler errors."""


class NotFillReadyError(FillerError):
    """Raised when NormalizationResult.fill_ready is False."""

    def __init__(self, error_count: int):
        self.error_count = error_count
        super().__init__(
            f"NormalizationResult is not fill-ready: {error_count} unresolved errors"
        )


class PDFInspectionError(FillerError):
    """Raised when a PDF cannot be read or inspected."""

    def __init__(self, pdf_path: str, detail: str):
        self.pdf_path = pdf_path
        self.detail = detail
        super().__init__(f"Failed to inspect PDF '{pdf_path}': {detail}")


class FormattingError(FillerError):
    """Raised when a value cannot be formatted for a given data type."""

    def __init__(self, value: object, data_type: str, detail: str):
        self.value = value
        self.data_type = data_type
        self.detail = detail
        super().__init__(f"Cannot format {value!r} as {data_type}: {detail}")


class FieldTypeMismatchError(FillerError):
    """Raised when a resolved value type conflicts with the PDF field type."""

    def __init__(self, field_id: str, expected_type: str, actual_value_type: str):
        self.field_id = field_id
        self.expected_type = expected_type
        self.actual_value_type = actual_value_type
        super().__init__(
            f"Field '{field_id}' is {expected_type} in PDF but got {actual_value_type} value"
        )


class RadioValueError(FillerError):
    """Raised when a radio group value doesn't match any allowed export value."""

    def __init__(self, field_id: str, value: str, allowed: list[str]):
        self.field_id = field_id
        self.value = value
        self.allowed = allowed
        super().__init__(
            f"Radio field '{field_id}': value '{value}' not in allowed values {allowed}"
        )


class DropdownValueError(FillerError):
    """Raised when a dropdown value doesn't match any allowed option."""

    def __init__(self, field_id: str, value: str, allowed: list[str]):
        self.field_id = field_id
        self.value = value
        self.allowed = allowed
        super().__init__(
            f"Dropdown field '{field_id}': value '{value}' not in allowed values {allowed}"
        )


class FillerDependencyError(FillerError):
    """Raised when a required external tool (e.g. pdftk) is not available."""

    def __init__(self, tool: str, install_hint: str):
        self.tool = tool
        self.install_hint = install_hint
        super().__init__(
            f"Required tool '{tool}' not found. Install with: {install_hint}"
        )
