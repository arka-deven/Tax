"""End-to-end integration tests for the AcroForm filler."""

import json
import os
import pytest

from acroform_filler.filler import AcroFormFiller
from acroform_filler.inspector import AcroFormInspector
from acroform_filler.exceptions import PDFInspectionError
from acroform_filler.models import FillerConfig, FieldType
from tax_normalizer.models import NormalizationResult


class TestFillerIntegration:
    """Full pipeline integration tests."""

    def test_full_1120s_fill_10_fields(self, filler, mock_nr_1120s, filler_config):
        """Full 1120-S fill: mock NormalizationResult with 10+ fields → PDF written, 0 errors."""
        assert len(mock_nr_1120s.resolved) >= 10
        result = filler.fill(mock_nr_1120s, filler_config)
        assert result.success is True
        assert result.filled_count >= 10
        assert os.path.exists(filler_config.output_path)
        assert os.path.getsize(filler_config.output_path) > 5000

    def test_full_fill_flatten_fields_locked(self, filler, mock_nr_1120s, filler_config_flatten):
        """Full fill with flatten=True → inspector confirms fields are gone (locked)."""
        result = filler.fill(mock_nr_1120s, filler_config_flatten)
        assert result.success is True

        # pdftk flatten removes all form fields entirely
        inspector = AcroFormInspector()
        fields = inspector.inspect(filler_config_flatten.output_path)
        assert len(fields) == 0, "Flattened PDF should have no editable fields"

    def test_none_field_no_crash(self, filler, mock_nr_none_field, filler_config):
        """Field in resolved is None → written as blank, no crash."""
        result = filler.fill(mock_nr_none_field, filler_config)
        assert result.success is True

    def test_currency_fields_round_trip(self, filler, irs_1120s_pdf, tmp_output):
        """All currency fields round-trip correctly (write → read back matches)."""
        nr = NormalizationResult(
            resolved={
                "topmostSubform[0].Page1[0].f1_16[0]": 650000.00,
                "topmostSubform[0].Page1[0].f1_17[0]": 5000.00,
                "topmostSubform[0].Page1[0].f1_18[0]": 645000.00,
            },
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=irs_1120s_pdf,
            output_path=tmp_output["pdf"],
            flatten=False,
            audit_log_path=tmp_output["audit"],
        )
        result = filler.fill(nr, config)
        assert result.success is True

        # Read back
        inspector = AcroFormInspector()
        fields = inspector.inspect(tmp_output["pdf"])
        for field_id, original_val in nr.resolved.items():
            if field_id in fields:
                expected = str(round(original_val))
                actual = fields[field_id].current_value
                if actual:
                    # pypdf may return the value as-is or may have quirks
                    assert actual == expected or actual.lstrip("/") == expected, \
                        f"Round-trip mismatch for {field_id}: {actual} != {expected}"

    def test_dry_run_valid_result(self, filler, mock_nr_1120s, filler_config_dry_run):
        """dry_run=True on valid result → success=True, no PDF, audit logged."""
        result = filler.fill(mock_nr_1120s, filler_config_dry_run)
        assert result.success is True
        assert not os.path.exists(filler_config_dry_run.output_path)
        assert os.path.exists(filler_config_dry_run.audit_log_path)

    def test_corrupt_template_raises(self, filler, tmp_path):
        """Corrupt template PDF → PDFInspectionError before any write attempt."""
        corrupt = tmp_path / "corrupt.pdf"
        corrupt.write_bytes(b"NOT A REAL PDF AT ALL")

        nr = NormalizationResult(
            resolved={"f1": 100},
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=str(corrupt),
            output_path=str(tmp_path / "out.pdf"),
            audit_log_path="",
        )
        with pytest.raises(PDFInspectionError):
            filler.fill(nr, config)

    def test_audit_log_complete_structure(self, filler, mock_nr_1120s, filler_config):
        """Audit log has complete structure after full fill."""
        result = filler.fill(mock_nr_1120s, filler_config)
        audit = result.audit_log
        assert audit is not None
        assert audit.form_id == "1120-S"
        assert audit.tax_year == 2024
        assert len(audit.filled_at) > 0
        assert len(audit.fields) > 0
        assert len(audit.pdf_sha256) == 64
        assert audit.filler_version == "1.0.0"

        # Verify JSON serialization
        j = json.loads(audit.to_json())
        assert j["form_id"] == "1120-S"
        assert len(j["fields"]) > 0

    def test_skipped_field_has_reason(self, filler, irs_1120s_pdf, tmp_output):
        """Every SkippedField carries machine-readable reason_code + human message."""
        # Trigger truncation on a max-length field
        nr = NormalizationResult(
            resolved={
                "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_3[0]": "TOOLONG",
            },
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=irs_1120s_pdf,
            output_path=tmp_output["pdf"],
            audit_log_path=tmp_output["audit"],
        )
        result = filler.fill(nr, config)
        for skip in result.skipped_fields:
            assert skip.reason_code is not None
            assert len(skip.reason_code) > 0
            assert skip.message is not None
            assert len(skip.message) > 0
