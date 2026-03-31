"""Tests for year-over-year descriptor diffing."""

import pytest

from tax_normalizer.loader import DescriptorLoader
from tests.conftest import make_field
from tax_normalizer.models import SourceType


class TestYearOverYear:
    """Compare descriptors across tax years to detect changes."""

    def test_diff_identifies_added_removed(self, descriptors_1120s_2023, descriptors_1120s_2024):
        """Load 2023 + 2024 for same form → diff correctly identifies added/removed fields."""
        diff = DescriptorLoader.diff_descriptors(descriptors_1120s_2023, descriptors_1120s_2024)

        # 2024 has new fields not in 2023
        assert "ein_field" in diff["added"]
        assert "foreign_tax_paid" in diff["added"]
        assert "tax_year_start" in diff["added"]
        assert "ownership_pct" in diff["added"]

        # 2023 had old_field_2023 which is not in 2024
        assert "old_field_2023" in diff["deprecated"]

    def test_deprecated_field_flagged(self, descriptors_1120s_2023, descriptors_1120s_2024):
        """Field present in 2023 but not 2024 → flagged as DEPRECATED."""
        diff = DescriptorLoader.diff_descriptors(descriptors_1120s_2023, descriptors_1120s_2024)
        assert "old_field_2023" in diff["deprecated"]

    def test_breaking_change_optional_to_mandatory(self):
        """Field in 2024 with mandatory=True that was optional in 2023 → BREAKING_CHANGE."""
        old_fields = [
            make_field(
                field_id="compensation",
                label="Officer comp",
                form="1120-S",
                line="7",
                mandatory=False,  # optional in 2023
                source_type=SourceType.QBO,
            ),
        ]
        new_fields = [
            make_field(
                field_id="compensation",
                label="Officer comp",
                form="1120-S",
                line="7",
                mandatory=True,  # mandatory in 2024
                source_type=SourceType.QBO,
            ),
        ]
        diff = DescriptorLoader.diff_descriptors(old_fields, new_fields)
        assert "compensation" in diff["breaking_changes"]

    def test_no_changes_empty_diff(self):
        """Identical descriptors → no added, removed, or breaking changes."""
        fields = [
            make_field(
                field_id="f1", label="F1", form="X", line="1",
                mandatory=True, source_type=SourceType.QBO,
            ),
        ]
        diff = DescriptorLoader.diff_descriptors(fields, fields)
        assert diff["added"] == []
        assert diff["deprecated"] == []
        assert diff["breaking_changes"] == []
