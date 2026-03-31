"""End-to-end integration tests — full form normalization runs."""

import pytest

from tax_normalizer.normalizer import FieldNormalizer
from tax_normalizer.models import Severity


class TestIntegration1120S:
    """Full 1120-S integration scenarios."""

    def test_all_fields_present_fill_ready(
        self, descriptors_1120s_2024, full_qbo_1120s, entity_context_s_corp
    ):
        """Full 1120-S with all data → fill_ready=True, correct values."""
        n = FieldNormalizer(descriptors_1120s_2024, full_qbo_1120s, entity_context_s_corp)
        result = n.normalize()

        # Gross receipts = 500000 + 150000
        assert result.resolved["gross_receipts"] == 650000.0
        # Returns
        assert result.resolved["returns_allowances"] == 5000.0
        # Net receipts = 650000 - 5000
        assert result.resolved["net_receipts"] == 645000.0
        # COGS = 120000 + 80000
        assert result.resolved["cogs"] == 200000.0
        # Gross profit = 645000 - 200000
        assert result.resolved["gross_profit"] == 445000.0
        # Other income
        assert result.resolved["other_income"] == 10000.0
        # Total income = 445000 + 10000
        assert result.resolved["total_income"] == 455000.0
        # Compensation
        assert result.resolved["compensation"] == 100000.0
        # Rent
        assert result.resolved["rent"] == 24000.0
        # Total deductions = 100000 + 24000
        assert result.resolved["total_deductions"] == 124000.0
        # Ordinary income = 455000 - 124000
        assert result.resolved["ordinary_income"] == 331000.0

        # EIN and dates are manual — should be in manual_required
        assert "ein_field" in result.manual_required
        assert "tax_year_start" in result.manual_required

        # foreign_tax_paid: condition has_foreign_income=False → None
        assert result.resolved["foreign_tax_paid"] is None

        # fill_ready should be True (manual fields don't block, no errors)
        assert result.fill_ready is True

    def test_missing_fields_fill_not_ready(
        self, descriptors_1120s_2024, partial_qbo_1120s, entity_context_s_corp
    ):
        """1120-S with 3 missing accounts, 1 mandatory → fill_ready=False."""
        n = FieldNormalizer(descriptors_1120s_2024, partial_qbo_1120s, entity_context_s_corp)
        result = n.normalize()

        assert result.fill_ready is False
        # At least one error for mandatory officer_compensation missing
        error_ids = [e.field_id for e in result.errors]
        assert "compensation" in error_ids

    def test_entity_no_foreign_income_skips_foreign(
        self, descriptors_1120s_2024, full_qbo_1120s, entity_context_s_corp
    ):
        """Entity with no foreign income → foreign tax fields skipped cleanly."""
        n = FieldNormalizer(descriptors_1120s_2024, full_qbo_1120s, entity_context_s_corp)
        result = n.normalize()
        assert result.resolved["foreign_tax_paid"] is None
        # No error for skipped conditional
        foreign_errors = [e for e in result.errors if e.field_id == "foreign_tax_paid"]
        assert foreign_errors == []

    def test_entity_with_foreign_income_requires_foreign(
        self, descriptors_1120s_2024, full_qbo_1120s, entity_context_s_corp_foreign
    ):
        """Entity with foreign income → foreign tax fields required and validated."""
        n = FieldNormalizer(
            descriptors_1120s_2024, full_qbo_1120s, entity_context_s_corp_foreign
        )
        result = n.normalize()
        assert result.resolved["foreign_tax_paid"] == 3000.0


class TestIntegration1040:
    """Full 1040 integration scenarios."""

    def test_schedule_c_sole_proprietor(
        self, descriptors_1040_2024, full_qbo_1040, entity_context_sole_prop
    ):
        """1040 with sole proprietor entity → Schedule C conditional triggers."""
        n = FieldNormalizer(descriptors_1040_2024, full_qbo_1040, entity_context_sole_prop)
        result = n.normalize()

        assert result.resolved["wages"] == 85000.0
        assert result.resolved["interest_income"] == 1200.0
        assert result.resolved["schedule_c_income"] == 45000.0
        assert result.resolved["total_income"] == 86200.0
        assert "ssn_field" in result.manual_required

    def test_no_foreign_income_1040(
        self, descriptors_1040_2024, full_qbo_1040, entity_context_sole_prop
    ):
        """1040 with no foreign income → foreign fields skipped."""
        n = FieldNormalizer(descriptors_1040_2024, full_qbo_1040, entity_context_sole_prop)
        result = n.normalize()
        assert result.resolved["foreign_earned_income"] is None

    def test_with_foreign_income_1040(
        self, descriptors_1040_2024, full_qbo_1040, entity_context_sole_prop_foreign
    ):
        """1040 with foreign income → foreign fields resolved."""
        n = FieldNormalizer(
            descriptors_1040_2024, full_qbo_1040, entity_context_sole_prop_foreign
        )
        result = n.normalize()
        assert result.resolved["foreign_earned_income"] == 20000.0


class TestErrorObjectQuality:
    """Verify error object structure and severity semantics."""

    def test_field_error_has_all_attributes(
        self, descriptors_1120s_2024, entity_context_s_corp
    ):
        """Every FieldError has: field_id, line, label, error_type, severity, message."""
        n = FieldNormalizer(descriptors_1120s_2024, {}, entity_context_s_corp)
        result = n.normalize()
        for err in result.errors + result.warnings:
            assert err.field_id is not None
            assert err.line is not None
            assert err.label is not None
            assert err.error_type is not None
            assert err.severity is not None
            assert err.message is not None
            assert len(err.message) > 0

    def test_error_blocks_fill_ready(self, make_fd):
        """ERROR severity blocks fill_ready."""
        from tax_normalizer.models import SourceType
        from tests.conftest import build_normalizer
        fields = [
            make_fd(field_id="f1", mandatory=True, source_type=SourceType.QBO, qbo_accounts=["missing"]),
        ]
        n = build_normalizer(fields, {})
        result = n.normalize()
        assert result.fill_ready is False
        assert any(e.severity == Severity.ERROR for e in result.errors)

    def test_warning_does_not_block_fill_ready(self, make_fd):
        """WARNING severity does not block fill_ready."""
        from tax_normalizer.models import SourceType
        from tests.conftest import build_normalizer
        fields = [
            make_fd(field_id="opt", mandatory=False, source_type=SourceType.QBO,
                    qbo_accounts=["missing_acct"], default_value=0),
        ]
        n = build_normalizer(fields, {})
        result = n.normalize()
        assert result.fill_ready is True
        assert len(result.warnings) >= 1

    def test_manual_required_does_not_block(self, make_fd):
        """manual_required list does not block fill_ready."""
        from tax_normalizer.models import SourceType
        from tests.conftest import build_normalizer
        fields = [
            make_fd(field_id="ein", mandatory=True, source_type=SourceType.MANUAL, data_type="ein"),
        ]
        n = build_normalizer(fields, {})
        result = n.normalize()
        assert result.fill_ready is True
        assert "ein" in result.manual_required

    def test_summary_counts(self, descriptors_1120s_2024, full_qbo_1120s, entity_context_s_corp):
        """NormalizationResult.summary() returns correct counts."""
        n = FieldNormalizer(descriptors_1120s_2024, full_qbo_1120s, entity_context_s_corp)
        result = n.normalize()
        s = result.summary()
        assert s["resolved"] == len(result.resolved)
        assert s["errors"] == len(result.errors)
        assert s["warnings"] == len(result.warnings)
        assert s["manual_required"] == len(result.manual_required)
