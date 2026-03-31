"""IRS Tax Form Data Normalization Layer — QBO → AcroForm PDF pipeline."""

from .models import FieldDescriptor, FieldError, NormalizationResult, SourceType
from .normalizer import FieldNormalizer
from .loader import DescriptorLoader
from .formula_engine import safe_eval, topological_sort

__all__ = [
    "FieldDescriptor",
    "FieldError",
    "NormalizationResult",
    "SourceType",
    "FieldNormalizer",
    "DescriptorLoader",
    "safe_eval",
    "topological_sort",
]
