"""Shared fixtures for the tax normalizer test suite."""

from __future__ import annotations

import textwrap
from pathlib import Path

import pytest
import yaml

from tax_normalizer.models import FieldDescriptor, SourceType
from tax_normalizer.normalizer import FieldNormalizer
from tax_normalizer.loader import DescriptorLoader


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

DESCRIPTORS_DIR = Path(__file__).resolve().parent.parent / "tax_normalizer" / "descriptors"


@pytest.fixture
def descriptors_dir():
    return DESCRIPTORS_DIR


# ---------------------------------------------------------------------------
# QBO data — full 1120-S mock
# ---------------------------------------------------------------------------

@pytest.fixture
def full_qbo_1120s():
    """Complete QBO account data for a valid 1120-S filing."""
    return {
        "income_sales": 500000.00,
        "income_services": 150000.00,
        "returns_allowances": 5000.00,
        "cogs_materials": 120000.00,
        "cogs_labor": 80000.00,
        "other_income": 10000.00,
        "officer_compensation": 100000.00,
        "rent_expense": 24000.00,
        "foreign_tax_paid": 3000.00,
    }


@pytest.fixture
def partial_qbo_1120s():
    """QBO data with some accounts missing — simulates incomplete books."""
    return {
        "income_sales": 500000.00,
        "income_services": 150000.00,
        # returns_allowances missing
        "cogs_materials": 120000.00,
        "cogs_labor": 80000.00,
        # other_income missing
        # officer_compensation missing  ← this is mandatory
        "rent_expense": 24000.00,
    }


# ---------------------------------------------------------------------------
# QBO data — full 1040 mock
# ---------------------------------------------------------------------------

@pytest.fixture
def full_qbo_1040():
    return {
        "w2_wages": 85000.00,
        "interest_income": 1200.00,
        "business_income": 45000.00,
        "standard_deduction": 14600.00,
        "foreign_earned_income": 20000.00,
    }


# ---------------------------------------------------------------------------
# Entity contexts
# ---------------------------------------------------------------------------

@pytest.fixture
def entity_context_s_corp():
    return {
        "entity_type": "s_corp",
        "has_foreign_income": False,
        "state": "CA",
        "fiscal_year_end": "12/31",
    }


@pytest.fixture
def entity_context_s_corp_foreign():
    return {
        "entity_type": "s_corp",
        "has_foreign_income": True,
        "state": "CA",
        "fiscal_year_end": "12/31",
    }


@pytest.fixture
def entity_context_sole_prop():
    return {
        "entity_type": "sole_proprietor",
        "has_foreign_income": False,
        "state": "TX",
    }


@pytest.fixture
def entity_context_sole_prop_foreign():
    return {
        "entity_type": "sole_proprietor",
        "has_foreign_income": True,
        "state": "TX",
    }


# ---------------------------------------------------------------------------
# Descriptor loaders
# ---------------------------------------------------------------------------

@pytest.fixture
def loader():
    return DescriptorLoader(DESCRIPTORS_DIR)


@pytest.fixture
def descriptors_1120s_2024(loader):
    return loader.load("1120s", 2024)


@pytest.fixture
def descriptors_1120s_2023(loader):
    return loader.load("1120s", 2023)


@pytest.fixture
def descriptors_1040_2024(loader):
    return loader.load("1040", 2024)


# ---------------------------------------------------------------------------
# Minimal descriptors for unit tests (no YAML dependency)
# ---------------------------------------------------------------------------

def make_field(**overrides) -> FieldDescriptor:
    """Factory for FieldDescriptor with sensible defaults."""
    defaults = dict(
        field_id="test_field",
        label="Test Field",
        form="TEST",
        line="1",
        mandatory=False,
        source_type=SourceType.QBO,
        qbo_accounts=[],
        formula=None,
        data_type="currency",
        min_val=None,
        max_val=None,
        cross_validations=[],
        default_value=None,
        warn_if_missing=True,
        condition=None,
    )
    defaults.update(overrides)
    return FieldDescriptor(**defaults)


@pytest.fixture
def make_fd():
    """Expose the make_field factory as a fixture."""
    return make_field


# ---------------------------------------------------------------------------
# Normalizer factory
# ---------------------------------------------------------------------------

def build_normalizer(
    descriptors: list[FieldDescriptor],
    qbo_data: dict,
    entity_context: dict | None = None,
) -> FieldNormalizer:
    return FieldNormalizer(descriptors, qbo_data, entity_context)


@pytest.fixture
def normalizer_factory():
    """Expose the build_normalizer helper as a fixture."""
    return build_normalizer


# ---------------------------------------------------------------------------
# Temporary YAML helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_descriptors_dir(tmp_path):
    """Create a temp directory for ad-hoc YAML test files."""
    d = tmp_path / "descriptors"
    d.mkdir()
    return d


def write_yaml(directory: Path, filename: str, content: dict) -> Path:
    """Write a dict as YAML into the given directory."""
    p = directory / filename
    p.write_text(yaml.dump(content, default_flow_style=False))
    return p


@pytest.fixture
def yaml_writer():
    return write_yaml


# ===========================================================================
# AcroForm Filler fixtures
# ===========================================================================

from tax_normalizer.models import NormalizationResult, FieldError, Severity
from acroform_filler.models import FillerConfig, FieldMeta, FieldType, FillResult, AuditLog
from acroform_filler.inspector import AcroFormInspector as _AcroFormInspector
from acroform_filler.formatter import ValueFormatter as _ValueFormatter
from acroform_filler.filler import AcroFormFiller as _AcroFormFiller


IRS_PDF_DIR = Path(__file__).resolve().parent.parent / "public" / "forms" / "2025"
IRS_1120S_PDF = IRS_PDF_DIR / "f1120s.pdf"


@pytest.fixture
def irs_1120s_pdf():
    """Path to the real IRS 1120-S PDF template."""
    assert IRS_1120S_PDF.exists(), f"IRS PDF not found at {IRS_1120S_PDF}"
    return str(IRS_1120S_PDF)


@pytest.fixture
def tmp_output(tmp_path):
    """Temporary output paths for fills."""
    return {
        "pdf": str(tmp_path / "filled.pdf"),
        "audit": str(tmp_path / "audit.json"),
    }


@pytest.fixture
def inspector():
    return _AcroFormInspector()


@pytest.fixture
def formatter():
    return _ValueFormatter()


@pytest.fixture
def filler():
    return _AcroFormFiller()


@pytest.fixture
def pdf_fields(inspector, irs_1120s_pdf):
    """Inspected fields from the IRS 1120-S PDF."""
    return inspector.inspect(irs_1120s_pdf)


@pytest.fixture
def mock_nr_1120s():
    """NormalizationResult with 12 real 1120-S field IDs."""
    resolved = {
        "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_1[0]": "01/01/2024",
        "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_2[0]": "12/31/2024",
        "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_4[0]": "ACME LLC",
        "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_5[0]": "123 Main St",
        "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_6[0]": "Suite 100",
        "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_7[0]": "Anytown",
        "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_8[0]": "CA",
        "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_9[0]": "90210",
        "topmostSubform[0].Page1[0].f1_16[0]": 650000.00,
        "topmostSubform[0].Page1[0].f1_17[0]": 5000.00,
        "topmostSubform[0].Page1[0].f1_18[0]": 645000.00,
        "topmostSubform[0].Page1[0].f1_19[0]": 200000.00,
    }
    return NormalizationResult(resolved=resolved, errors=[], warnings=[], manual_required=[])


@pytest.fixture
def mock_nr_empty():
    """Empty NormalizationResult that is still fill_ready."""
    return NormalizationResult(resolved={}, errors=[], warnings=[], manual_required=[])


@pytest.fixture
def mock_nr_not_ready():
    """NormalizationResult with errors — not fill-ready."""
    return NormalizationResult(
        resolved={"f1": 100},
        errors=[
            FieldError(
                field_id="f2", line="1", label="Test",
                error_type="missing", severity=Severity.ERROR,
                message="missing",
            )
        ],
        warnings=[],
        manual_required=[],
    )


@pytest.fixture
def mock_nr_with_mismatch():
    """NormalizationResult with a field ID that doesn't exist in any PDF."""
    return NormalizationResult(
        resolved={
            "fake_field_xyz": 1000,
            "topmostSubform[0].Page1[0].f1_16[0]": 650000.00,
        },
        errors=[], warnings=[], manual_required=[],
    )


@pytest.fixture
def mock_nr_checkbox():
    """NormalizationResult targeting a checkbox field."""
    return NormalizationResult(
        resolved={"topmostSubform[0].Page1[0].ABC[0].c1_1[0]": True},
        errors=[], warnings=[], manual_required=[],
    )


@pytest.fixture
def mock_nr_checkbox_false():
    """NormalizationResult targeting a checkbox with False."""
    return NormalizationResult(
        resolved={"topmostSubform[0].Page1[0].ABC[0].c1_1[0]": False},
        errors=[], warnings=[], manual_required=[],
    )


@pytest.fixture
def mock_nr_none_field():
    """NormalizationResult with a None value."""
    return NormalizationResult(
        resolved={"topmostSubform[0].Page1[0].f1_16[0]": None},
        errors=[], warnings=[], manual_required=[],
    )


@pytest.fixture
def filler_config(irs_1120s_pdf, tmp_output):
    """Standard FillerConfig for 1120-S."""
    return FillerConfig(
        form_id="1120-S", tax_year=2024,
        pdf_template_path=irs_1120s_pdf,
        output_path=tmp_output["pdf"],
        flatten=False, dry_run=False,
        audit_log_path=tmp_output["audit"],
    )


@pytest.fixture
def filler_config_flatten(irs_1120s_pdf, tmp_output):
    """FillerConfig with flatten=True."""
    return FillerConfig(
        form_id="1120-S", tax_year=2024,
        pdf_template_path=irs_1120s_pdf,
        output_path=tmp_output["pdf"],
        flatten=True, dry_run=False,
        audit_log_path=tmp_output["audit"],
    )


@pytest.fixture
def filler_config_dry_run(irs_1120s_pdf, tmp_output):
    """FillerConfig with dry_run=True."""
    return FillerConfig(
        form_id="1120-S", tax_year=2024,
        pdf_template_path=irs_1120s_pdf,
        output_path=tmp_output["pdf"],
        flatten=False, dry_run=True,
        audit_log_path=tmp_output["audit"],
    )
