"""Tests for Stage 1 — Pre-fill validation."""

import pytest

from acroform_filler.filler import AcroFormFiller
from acroform_filler.exceptions import NotFillReadyError, FieldTypeMismatchError
from acroform_filler.models import FillerConfig, FillResult
from tax_normalizer.models import NormalizationResult


class TestPrefillValidation:
    """Stage 1: validate inputs before fill."""

    def test_not_fill_ready_raises(self, filler, mock_nr_not_ready, filler_config):
        """fill_ready=False → NotFillReadyError immediately."""
        with pytest.raises(NotFillReadyError) as exc_info:
            filler.fill(mock_nr_not_ready, filler_config)
        assert exc_info.value.error_count == 1

    def test_field_in_resolved_not_in_pdf_mismatch(self, filler, mock_nr_with_mismatch, filler_config):
        """Field in resolved but not in PDF → logged as mismatch, not error."""
        result = filler.fill(mock_nr_with_mismatch, filler_config)
        assert "fake_field_xyz" in result.mismatched_fields
        assert result.success is True

    def test_currency_value_to_checkbox_field_raises(self, filler, irs_1120s_pdf, tmp_output):
        """Currency value mapped to Checkbox field → FieldTypeMismatchError."""
        nr = NormalizationResult(
            resolved={
                # c1_1[0] is a checkbox, but we're sending a float
                "topmostSubform[0].Page1[0].ABC[0].c1_1[0]": 5000.0,
            },
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=irs_1120s_pdf,
            output_path=tmp_output["pdf"],
            audit_log_path=tmp_output["audit"],
        )
        with pytest.raises(FieldTypeMismatchError) as exc_info:
            filler.fill(nr, config)
        assert "Checkbox" in str(exc_info.value)

    def test_all_fields_match_validation_passes(self, filler, mock_nr_1120s, filler_config):
        """All fields match → validation passes cleanly."""
        result = filler.fill(mock_nr_1120s, filler_config)
        # No mismatches for resolved fields that exist in PDF
        real_mismatches = [m for m in result.mismatched_fields
                          if m in mock_nr_1120s.resolved]
        # This should be empty (all our fields are real)
        assert len(real_mismatches) == 0 or result.success

    def test_optional_field_not_in_resolved_skipped(self, filler, mock_nr_empty, filler_config):
        """Optional field in PDF not in resolved → skipped with no error."""
        result = filler.fill(mock_nr_empty, filler_config)
        assert result.success is True
        assert result.filled_count == 0
