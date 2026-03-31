"""Tests for audit log generation."""

import json
import os
import pytest

from acroform_filler.filler import AcroFormFiller
from acroform_filler.models import FillerConfig
from tax_normalizer.models import NormalizationResult


class TestAuditLog:
    """Audit log correctness."""

    def test_audit_log_written_as_valid_json(self, filler, mock_nr_1120s, filler_config):
        """Audit log written to audit_log_path as valid JSON."""
        result = filler.fill(mock_nr_1120s, filler_config)
        assert result.success is True
        assert os.path.exists(filler_config.audit_log_path)

        with open(filler_config.audit_log_path) as f:
            data = json.load(f)
        assert isinstance(data, dict)

    def test_contains_filled_at_timestamp(self, filler, mock_nr_1120s, filler_config):
        """Audit log contains filled_at ISO timestamp."""
        filler.fill(mock_nr_1120s, filler_config)

        with open(filler_config.audit_log_path) as f:
            data = json.load(f)
        assert "filled_at" in data
        assert "T" in data["filled_at"]  # ISO format has T separator

    def test_contains_per_field_entries(self, filler, mock_nr_1120s, filler_config):
        """Audit log has per-field entries with raw_value and formatted_value."""
        filler.fill(mock_nr_1120s, filler_config)

        with open(filler_config.audit_log_path) as f:
            data = json.load(f)
        assert "fields" in data
        assert len(data["fields"]) > 0

        entry = data["fields"][0]
        assert "field_id" in entry
        assert "raw_value" in entry or "raw_qbo_value" in entry
        assert "formatted_value" in entry

    def test_contains_sha256(self, filler, mock_nr_1120s, filler_config):
        """Audit log contains sha256 hash of output PDF."""
        filler.fill(mock_nr_1120s, filler_config)

        with open(filler_config.audit_log_path) as f:
            data = json.load(f)
        assert "pdf_sha256" in data
        assert len(data["pdf_sha256"]) == 64

    def test_dry_run_audit_still_written(self, filler, mock_nr_1120s, filler_config_dry_run):
        """dry_run=True → audit log still written (records the dry run)."""
        result = filler.fill(mock_nr_1120s, filler_config_dry_run)
        assert result.success is True
        assert os.path.exists(filler_config_dry_run.audit_log_path)

        with open(filler_config_dry_run.audit_log_path) as f:
            data = json.load(f)
        assert data["dry_run"] is True

    def test_filler_version_in_audit(self, filler, mock_nr_1120s, filler_config):
        """Audit log contains filler_version string."""
        filler.fill(mock_nr_1120s, filler_config)

        with open(filler_config.audit_log_path) as f:
            data = json.load(f)
        assert "filler_version" in data
        assert data["filler_version"] == "1.0.0"
