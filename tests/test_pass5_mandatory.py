"""Tests for Pass 5 — Mandatory completeness check."""

import pytest

from tax_normalizer.models import SourceType, Severity
from tests.conftest import make_field, build_normalizer


class TestMandatoryCompleteness:
    """Pass 5: verify all mandatory fields are resolved."""

    def test_all_mandatory_resolved_fill_ready(self, make_fd):
        """All mandatory fields resolved → fill_ready = True."""
        fields = [
            make_fd(field_id="f1", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["a"]),
            make_fd(field_id="f2", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["b"]),
        ]
        n = build_normalizer(fields, {"a": 100, "b": 200})
        result = n.normalize()
        assert result.fill_ready is True

    def test_mandatory_unresolved_fill_not_ready(self, make_fd):
        """One mandatory field unresolved → fill_ready = False, ERROR."""
        fields = [
            make_fd(field_id="f1", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["a"]),
            make_fd(field_id="f2", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["b"]),
        ]
        n = build_normalizer(fields, {"a": 100})  # b missing
        result = n.normalize()
        assert result.fill_ready is False

    def test_manual_field_added_to_manual_required(self, make_fd):
        """MANUAL field not in resolved → added to manual_required, not errors."""
        fields = [
            make_fd(field_id="ein", mandatory=True, source_type=SourceType.MANUAL, data_type="ein"),
        ]
        n = build_normalizer(fields, {})
        result = n.normalize()
        assert "ein" in result.manual_required
        # Should not be in errors (it's manual)
        manual_errors = [e for e in result.errors if e.field_id == "ein"]
        assert manual_errors == []

    def test_optional_field_never_resolved_no_error(self, make_fd):
        """Optional field never resolved → no error, not in fill_ready check."""
        fields = [
            make_fd(field_id="f1", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["a"]),
            make_fd(field_id="opt", mandatory=False, source_type=SourceType.QBO,
                    qbo_accounts=["missing"], warn_if_missing=False),
        ]
        n = build_normalizer(fields, {"a": 100})
        result = n.normalize()
        assert result.fill_ready is True
        assert "opt" not in result.resolved
