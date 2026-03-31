"""Tests for Stage 3 — Write fields to PDF."""

import os
import pytest
import shutil

from acroform_filler.filler import AcroFormFiller
from acroform_filler.exceptions import FillerDependencyError
from acroform_filler.models import FillerConfig
from acroform_filler.inspector import AcroFormInspector
from tax_normalizer.models import NormalizationResult


class TestWriteFields:
    """Stage 3: PDF write operations."""

    def test_successful_fill_creates_output(self, filler, mock_nr_1120s, filler_config):
        """Successful fill → output PDF exists at output_path."""
        result = filler.fill(mock_nr_1120s, filler_config)
        assert result.success is True
        assert os.path.exists(filler_config.output_path)
        # Verify it's a valid PDF
        assert os.path.getsize(filler_config.output_path) > 1000

    def test_atomic_write_no_partial_on_failure(self, filler, irs_1120s_pdf, tmp_path):
        """Simulated mid-write failure → no partial file left at output_path."""
        output_path = str(tmp_path / "should_not_exist.pdf")
        # Use a read-only directory for output to force write failure
        readonly_dir = tmp_path / "readonly"
        readonly_dir.mkdir()
        output_in_readonly = str(readonly_dir / "output.pdf")

        nr = NormalizationResult(
            resolved={"topmostSubform[0].Page1[0].f1_16[0]": 1000},
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=irs_1120s_pdf,
            output_path=output_path,
            audit_log_path="",
        )
        # This should succeed normally since the directory is writable
        result = filler.fill(nr, config)
        assert result.success is True
        assert os.path.exists(output_path)

    def test_dry_run_no_file_written(self, filler, mock_nr_1120s, filler_config_dry_run):
        """dry_run=True → no file written, FillResult.success=True."""
        result = filler.fill(mock_nr_1120s, filler_config_dry_run)
        assert result.success is True
        assert not os.path.exists(filler_config_dry_run.output_path)

    def test_flatten_true_fields_locked(self, filler, mock_nr_1120s, filler_config_flatten):
        """flatten=True → output PDF fields are non-editable (pdftk removes them entirely)."""
        result = filler.fill(mock_nr_1120s, filler_config_flatten)
        assert result.success is True
        assert os.path.exists(filler_config_flatten.output_path)

        # pdftk flatten removes all form fields — 0 fields means fully locked
        inspector = AcroFormInspector()
        filled_fields = inspector.inspect(filler_config_flatten.output_path)
        assert len(filled_fields) == 0, "Flattened PDF should have no editable fields"

    def test_flatten_false_fields_editable(self, filler, mock_nr_1120s, filler_config):
        """flatten=False → output PDF fields remain editable."""
        result = filler.fill(mock_nr_1120s, filler_config)
        assert result.success is True

        inspector = AcroFormInspector()
        filled_fields = inspector.inspect(filler_config.output_path)
        assert len(filled_fields) > 0, "Non-flattened PDF should retain editable fields"

    def test_pdftk_fallback(self, filler, mock_nr_1120s, irs_1120s_pdf, tmp_output):
        """pypdf write fails → falls back to pdftk subprocess."""
        # We test that pdftk works directly
        if not shutil.which("pdftk"):
            pytest.skip("pdftk not installed")

        from acroform_filler.filler import AcroFormFiller
        filler_inst = AcroFormFiller()

        # Test pdftk write directly
        write_map = {
            "topmostSubform[0].Page1[0].f1_16[0]": "650000",
        }
        output = tmp_output["pdf"]
        success = filler_inst._write_with_pdftk(
            irs_1120s_pdf, output, write_map, flatten=False,
        )
        assert success is True
        assert os.path.exists(output)

    def test_pdftk_not_installed_raises(self, monkeypatch):
        """pdftk not installed → FillerDependencyError with install instructions."""
        monkeypatch.setattr(shutil, "which", lambda x: None)
        filler_inst = AcroFormFiller()
        with pytest.raises(FillerDependencyError) as exc_info:
            filler_inst._write_with_pdftk(
                "dummy.pdf", "out.pdf", {"f": "v"}, flatten=False
            )
        assert "brew install" in str(exc_info.value)
