"""Tests for the YAML descriptor loader."""

import pytest

from tax_normalizer.loader import DescriptorLoader
from tax_normalizer.exceptions import DescriptorValidationError, DuplicateFieldError
from tax_normalizer.models import SourceType


class TestDescriptorLoader:
    """YAML descriptor loading and validation."""

    def test_valid_yaml_loads_all_fields(self, loader, descriptors_dir):
        """Valid YAML → loads all fields correctly."""
        fields = loader.load("1120s", 2024)
        assert len(fields) >= 10
        ids = [f.field_id for f in fields]
        assert "gross_receipts" in ids
        assert "ordinary_income" in ids

    def test_missing_required_key_raises(self, tmp_descriptors_dir, yaml_writer):
        """Missing required key → DescriptorValidationError on load."""
        yaml_writer(tmp_descriptors_dir, "bad_2024.yaml", {
            "form": "BAD",
            "tax_year": 2024,
            "fields": [
                {
                    "field_id": "f1",
                    # missing label, form, line, source_type
                }
            ],
        })
        loader = DescriptorLoader(tmp_descriptors_dir)
        with pytest.raises(DescriptorValidationError) as exc_info:
            loader.load("bad", 2024)
        assert "missing required keys" in str(exc_info.value).lower()

    def test_unknown_source_type_raises(self, tmp_descriptors_dir, yaml_writer):
        """Unknown source_type string → ValueError."""
        yaml_writer(tmp_descriptors_dir, "unk_2024.yaml", {
            "form": "UNK",
            "tax_year": 2024,
            "fields": [
                {
                    "field_id": "f1",
                    "label": "Test",
                    "form": "UNK",
                    "line": "1",
                    "source_type": "MAGIC",
                }
            ],
        })
        loader = DescriptorLoader(tmp_descriptors_dir)
        with pytest.raises(ValueError) as exc_info:
            loader.load("unk", 2024)
        assert "MAGIC" in str(exc_info.value)

    def test_version_mismatch_warning(self, tmp_descriptors_dir, yaml_writer):
        """YAML for wrong tax year → version mismatch detected in metadata."""
        yaml_writer(tmp_descriptors_dir, "form_2023.yaml", {
            "form": "FORM",
            "tax_year": 2023,
            "fields": [
                {
                    "field_id": "f1",
                    "label": "Test",
                    "form": "FORM",
                    "line": "1",
                    "source_type": "QBO",
                }
            ],
        })
        loader = DescriptorLoader(tmp_descriptors_dir)
        fields, meta = loader.load_with_meta("form", 2023, expected_year=2024)
        assert meta["version_mismatch"] is True

    def test_duplicate_field_id_raises(self, tmp_descriptors_dir, yaml_writer):
        """Two fields with same field_id → DuplicateFieldError."""
        yaml_writer(tmp_descriptors_dir, "dup_2024.yaml", {
            "form": "DUP",
            "tax_year": 2024,
            "fields": [
                {"field_id": "f1", "label": "A", "form": "DUP", "line": "1", "source_type": "QBO"},
                {"field_id": "f1", "label": "B", "form": "DUP", "line": "2", "source_type": "QBO"},
            ],
        })
        loader = DescriptorLoader(tmp_descriptors_dir)
        with pytest.raises(DuplicateFieldError) as exc_info:
            loader.load("dup", 2024)
        assert "f1" in str(exc_info.value)
