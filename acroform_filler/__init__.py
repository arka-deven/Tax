"""AcroForm PDF filler for IRS tax forms — consumes NormalizationResult, outputs filled PDF."""

from .models import FillerConfig, FillResult, FieldMeta, AuditLog, SkippedField
from .inspector import AcroFormInspector
from .formatter import ValueFormatter
from .filler import AcroFormFiller

__all__ = [
    "FillerConfig",
    "FillResult",
    "FieldMeta",
    "AuditLog",
    "SkippedField",
    "AcroFormInspector",
    "ValueFormatter",
    "AcroFormFiller",
]
