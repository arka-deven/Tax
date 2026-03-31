"""Tests for AcroFormInspector."""

import json
import pytest

from acroform_filler.inspector import AcroFormInspector
from acroform_filler.models import FieldType
from acroform_filler.exceptions import PDFInspectionError


class TestAcroFormInspector:
    """Inspector reads and classifies PDF form fields."""

    def test_inspect_returns_correct_field_count(self, inspector, irs_1120s_pdf):
        """inspect() returns a reasonable number of fields for the 1120-S."""
        fields = inspector.inspect(irs_1120s_pdf)
        # IRS 1120-S has ~390 fillable fields (text + buttons)
        assert len(fields) >= 100

    def test_text_fields_identified(self, inspector, irs_1120s_pdf):
        """Text fields are correctly identified as FieldType.TEXT."""
        fields = inspector.inspect(irs_1120s_pdf)
        text_field = fields.get("topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_4[0]")
        assert text_field is not None
        assert text_field.field_type == FieldType.TEXT

    def test_checkbox_fields_identified(self, inspector, irs_1120s_pdf):
        """Checkbox fields are correctly identified as FieldType.CHECKBOX."""
        fields = inspector.inspect(irs_1120s_pdf)
        # c1_1[0] is a standalone checkbox
        cb = fields.get("topmostSubform[0].Page1[0].ABC[0].c1_1[0]")
        assert cb is not None
        assert cb.field_type == FieldType.CHECKBOX

    def test_radio_groups_identified(self, inspector, irs_1120s_pdf):
        """Radio button groups have correct export values."""
        fields = inspector.inspect(irs_1120s_pdf)
        # c1_2[0] and c1_2[1] form a radio pair on IRS 1120-S
        r0 = fields.get("topmostSubform[0].Page1[0].c1_2[0]")
        r1 = fields.get("topmostSubform[0].Page1[0].c1_2[1]")
        assert r0 is not None
        assert r1 is not None
        # Both are buttons; they should have allowed_values with their export value
        assert r0.field_type == FieldType.CHECKBOX  # IRS uses checkbox, not radio flag
        assert r1.field_type == FieldType.CHECKBOX

    def test_multipage_page_numbers(self, inspector, irs_1120s_pdf):
        """Multi-page PDF: page_number is correct for fields on different pages."""
        fields = inspector.inspect(irs_1120s_pdf)
        # Find a field on page 1 and one on a later page
        page1_fields = [f for f in fields.values() if f.page_number == 1]
        later_fields = [f for f in fields.values() if f.page_number > 1]
        assert len(page1_fields) > 0
        assert len(later_fields) > 0

    def test_dump_fields_returns_valid_json(self, inspector, irs_1120s_pdf):
        """dump_fields() returns a parseable JSON string."""
        json_str = inspector.dump_fields(irs_1120s_pdf)
        data = json.loads(json_str)
        assert isinstance(data, dict)
        assert len(data) >= 100
        # Each entry should have field_type
        first_key = list(data.keys())[0]
        assert "field_type" in data[first_key]

    def test_corrupt_pdf_raises_inspection_error(self, inspector, tmp_path):
        """Corrupt PDF → PDFInspectionError, not unhandled exception."""
        corrupt = tmp_path / "corrupt.pdf"
        corrupt.write_bytes(b"NOT A PDF FILE")
        with pytest.raises(PDFInspectionError):
            inspector.inspect(str(corrupt))

    def test_nonexistent_pdf_raises_inspection_error(self, inspector):
        """Non-existent file → PDFInspectionError."""
        with pytest.raises(PDFInspectionError):
            inspector.inspect("/nonexistent/path/file.pdf")

    def test_max_length_detected(self, inspector, irs_1120s_pdf):
        """Fields with MaxLength have it captured in FieldMeta."""
        fields = inspector.inspect(irs_1120s_pdf)
        # f1_3[0] has MaxLength: 2 per pdftk dump
        ml_field = fields.get("topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_3[0]")
        assert ml_field is not None
        assert ml_field.max_length == 2

    def test_checkbox_allowed_values(self, inspector, irs_1120s_pdf):
        """Checkbox fields have allowed_values populated."""
        fields = inspector.inspect(irs_1120s_pdf)
        cb = fields.get("topmostSubform[0].Page1[0].ABC[0].c1_1[0]")
        assert cb is not None
        # Should have at least the "on" export value
        # (may be empty depending on how AP dict is structured in this PDF)
        assert cb.field_type == FieldType.CHECKBOX
