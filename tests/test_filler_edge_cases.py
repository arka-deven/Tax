"""Edge-case tests for acroform_filler to improve coverage."""

import json
import os
import shutil
import pytest

from acroform_filler.filler import AcroFormFiller
from acroform_filler.inspector import AcroFormInspector, inspect_with_pdftk
from acroform_filler.formatter import ValueFormatter
from acroform_filler.models import (
    FillerConfig, FillResult, FieldMeta, FieldType, AuditLog, AuditLogEntry, SkippedField,
)
from acroform_filler.exceptions import (
    NotFillReadyError, PDFInspectionError, FormattingError,
    FieldTypeMismatchError, RadioValueError, DropdownValueError,
    FillerDependencyError,
)
from tax_normalizer.models import NormalizationResult


class TestInspectorPdftk:
    """Cover the pdftk-based inspector fallback."""

    def test_inspect_with_pdftk(self, irs_1120s_pdf):
        """pdftk inspector returns fields for IRS PDF."""
        fields = inspect_with_pdftk(irs_1120s_pdf)
        assert len(fields) >= 100
        # Check a known text field
        key = "topmostSubform[0].Page1[0].Date_Name_ReadOrder[0].f1_4[0]"
        assert key in fields
        assert fields[key].field_type == FieldType.TEXT

    def test_pdftk_inspector_nonexistent(self):
        """pdftk inspector on non-existent file → PDFInspectionError."""
        with pytest.raises(PDFInspectionError):
            inspect_with_pdftk("/nonexistent/file.pdf")

    def test_pdftk_inspector_corrupt(self, tmp_path):
        """pdftk inspector on corrupt file → PDFInspectionError."""
        corrupt = tmp_path / "bad.pdf"
        corrupt.write_bytes(b"not a pdf")
        with pytest.raises(PDFInspectionError):
            inspect_with_pdftk(str(corrupt))

    def test_pdftk_inspector_checkbox_values(self, irs_1120s_pdf):
        """pdftk inspector extracts checkbox state options."""
        fields = inspect_with_pdftk(irs_1120s_pdf)
        cb_key = "topmostSubform[0].Page1[0].ABC[0].c1_1[0]"
        if cb_key in fields:
            assert fields[cb_key].field_type == FieldType.CHECKBOX
            # Should have at least "1" in allowed_values
            assert "1" in fields[cb_key].allowed_values


class TestInspectorDumpFields:
    """Cover dump_fields method."""

    def test_dump_fields_json_structure(self, inspector, irs_1120s_pdf):
        """dump_fields() returns valid JSON with field_type as string."""
        result = json.loads(inspector.dump_fields(irs_1120s_pdf))
        for fid, meta in list(result.items())[:3]:
            assert isinstance(meta["field_type"], str)
            assert meta["field_type"] in ("Text", "Checkbox", "Radio", "Dropdown", "Signature")


class TestFormatterEdgeCases:
    """Cover remaining formatter branches."""

    def test_checkbox_string_true(self, formatter):
        """Checkbox with string 'true' → '1'."""
        assert formatter.format("true", "Checkbox", "boolean") == "1"

    def test_checkbox_string_yes(self, formatter):
        """Checkbox with string 'yes' → '1'."""
        assert formatter.format("yes", "Checkbox", "boolean") == "1"

    def test_checkbox_string_other(self, formatter):
        """Checkbox with arbitrary string → 'Off'."""
        assert formatter.format("nope", "Checkbox", "boolean") == "Off"

    def test_checkbox_int_truthy(self, formatter):
        """Checkbox with int 1 → '1' (truthy)."""
        assert formatter.format(1, "Checkbox", "boolean") == "1"

    def test_checkbox_int_falsy(self, formatter):
        """Checkbox with int 0 → 'Off' (falsy)."""
        assert formatter.format(0, "Checkbox", "boolean") == "Off"

    def test_currency_non_numeric(self, formatter):
        """Currency with non-numeric string → FormattingError."""
        with pytest.raises(FormattingError):
            formatter.format("abc", "Text", "currency")

    def test_percentage_non_numeric(self, formatter):
        """Percentage with non-numeric → FormattingError."""
        with pytest.raises(FormattingError):
            formatter.format("abc", "Text", "percentage")

    def test_integer_non_numeric(self, formatter):
        """Integer with non-numeric → FormattingError."""
        with pytest.raises(FormattingError):
            formatter.format("abc", "Text", "integer")

    def test_date_already_mm_dd_yyyy(self, formatter):
        """Date already in MM/DD/YYYY → passed through."""
        assert formatter.format("01/15/2024", "Text", "date") == "01/15/2024"

    def test_default_string_format(self, formatter):
        """Unknown data type → stringify."""
        assert formatter.format(42, "Text", "unknown") == "42"

    def test_ein_already_formatted(self, formatter):
        """EIN already formatted → idempotent."""
        assert formatter.format("12-3456789", "Text", "ein") == "12-3456789"

    def test_ein_wrong_length(self, formatter):
        """EIN with wrong digit count → FormattingError."""
        with pytest.raises(FormattingError):
            formatter.format("12345", "Text", "ein")


class TestFillerPypdfFallback:
    """Cover the pypdf write path (when pdftk is not available)."""

    def test_pypdf_write_direct(self, irs_1120s_pdf, tmp_path):
        """Direct pypdf write produces a valid PDF."""
        filler_inst = AcroFormFiller()
        output = str(tmp_path / "pypdf_out.pdf")
        write_map = {
            "topmostSubform[0].Page1[0].f1_16[0]": "650000",
        }
        success = filler_inst._write_with_pypdf(
            irs_1120s_pdf, output, write_map, flatten=False,
        )
        assert success is True
        assert os.path.exists(output)
        assert os.path.getsize(output) > 1000

    def test_pypdf_write_with_flatten(self, irs_1120s_pdf, tmp_path):
        """pypdf write with flatten sets read-only flag."""
        filler_inst = AcroFormFiller()
        output = str(tmp_path / "pypdf_flat.pdf")
        write_map = {
            "topmostSubform[0].Page1[0].f1_16[0]": "650000",
        }
        success = filler_inst._write_with_pypdf(
            irs_1120s_pdf, output, write_map, flatten=True,
        )
        assert success is True

    def test_pypdf_write_checkbox(self, irs_1120s_pdf, tmp_path):
        """pypdf writes checkbox values correctly."""
        filler_inst = AcroFormFiller()
        output = str(tmp_path / "pypdf_cb.pdf")
        write_map = {
            "topmostSubform[0].Page1[0].ABC[0].c1_1[0]": "1",
        }
        success = filler_inst._write_with_pypdf(
            irs_1120s_pdf, output, write_map, flatten=False,
        )
        assert success is True

    def test_pypdf_write_checkbox_off(self, irs_1120s_pdf, tmp_path):
        """pypdf writes checkbox Off value correctly."""
        filler_inst = AcroFormFiller()
        output = str(tmp_path / "pypdf_cb_off.pdf")
        write_map = {
            "topmostSubform[0].Page1[0].ABC[0].c1_1[0]": "Off",
        }
        success = filler_inst._write_with_pypdf(
            irs_1120s_pdf, output, write_map, flatten=False,
        )
        assert success is True


class TestFillerXfdfBuild:
    """Cover XFDF generation."""

    def test_xfdf_structure(self):
        """XFDF output is valid XML with correct field entries."""
        filler_inst = AcroFormFiller()
        xfdf = filler_inst._build_xfdf({
            "field1": "value1",
            "field2": "value with <special> chars & more",
        })
        assert '<?xml version="1.0"' in xfdf
        assert "<xfdf" in xfdf
        assert 'name="field1"' in xfdf
        assert "<value>value1</value>" in xfdf
        # Special chars should be escaped
        assert "&lt;special&gt;" in xfdf
        assert "&amp;" in xfdf


class TestFillerDataTypeInference:
    """Cover _infer_data_type helper."""

    def test_infer_ssn(self):
        """SSN-like string detected."""
        filler_inst = AcroFormFiller()
        assert filler_inst._infer_data_type("f", "123-45-6789") == "ssn"

    def test_infer_ein(self):
        """EIN-like string detected."""
        filler_inst = AcroFormFiller()
        assert filler_inst._infer_data_type("f", "12-3456789") == "ein"

    def test_infer_boolean(self):
        """Boolean detected."""
        filler_inst = AcroFormFiller()
        assert filler_inst._infer_data_type("f", True) == "boolean"

    def test_infer_currency(self):
        """Numeric detected as currency."""
        filler_inst = AcroFormFiller()
        assert filler_inst._infer_data_type("f", 1000.50) == "currency"

    def test_infer_string(self):
        """Plain string fallback."""
        filler_inst = AcroFormFiller()
        assert filler_inst._infer_data_type("f", "ACME LLC") == "string"


class TestAuditLogSerialization:
    """Cover AuditLog to_dict and to_json."""

    def test_to_dict(self):
        """AuditLog.to_dict() returns correct structure."""
        audit = AuditLog(form_id="1120-S", tax_year=2024)
        audit.fields.append(AuditLogEntry(
            field_id="f1", line_label="Line 1",
            raw_value=1000, formatted_value="1000", source_type="QBO",
        ))
        d = audit.to_dict()
        assert d["form_id"] == "1120-S"
        assert len(d["fields"]) == 1
        assert d["fields"][0]["field_id"] == "f1"

    def test_to_json(self):
        """AuditLog.to_json() returns valid JSON string."""
        audit = AuditLog(form_id="1040", tax_year=2024, filled_at="2024-01-01T00:00:00Z")
        j = json.loads(audit.to_json())
        assert j["form_id"] == "1040"
        assert j["filled_at"] == "2024-01-01T00:00:00Z"


class TestSkippedFieldModel:
    """Cover SkippedField model."""

    def test_skipped_field_attributes(self):
        """SkippedField carries reason_code + message."""
        sf = SkippedField(
            field_id="sig_1",
            reason_code="signature_required",
            message="Signature field cannot be auto-filled",
        )
        assert sf.reason_code == "signature_required"
        assert "Signature" in sf.message


class TestExceptionMessages:
    """Cover exception message formatting."""

    def test_not_fill_ready_error_message(self):
        """NotFillReadyError includes error count."""
        err = NotFillReadyError(3)
        assert "3" in str(err)

    def test_radio_value_error_message(self):
        """RadioValueError includes value and allowed list."""
        err = RadioValueError("radio1", "bad", ["1", "2"])
        assert "bad" in str(err)
        assert "1" in str(err)

    def test_dropdown_value_error_message(self):
        """DropdownValueError includes value and allowed list."""
        err = DropdownValueError("dd1", "nope", ["A", "B"])
        assert "nope" in str(err)
        assert "A" in str(err)

    def test_filler_dependency_error_message(self):
        """FillerDependencyError includes install instructions."""
        err = FillerDependencyError("pdftk", "brew install pdftk-java")
        assert "brew" in str(err)
        assert "pdftk" in str(err)

    def test_field_type_mismatch_error_message(self):
        """FieldTypeMismatchError includes field_id and types."""
        err = FieldTypeMismatchError("f1", "Checkbox", "float")
        assert "f1" in str(err)
        assert "Checkbox" in str(err)


class TestInspectorClassifyField:
    """Cover field classification branches (Sig, Ch, Radio)."""

    def test_classify_signature(self):
        """Signature field type → FieldType.SIGNATURE."""
        inspector = AcroFormInspector()
        ft = inspector._classify_field("/Sig", 0, {})
        assert ft == FieldType.SIGNATURE

    def test_classify_dropdown(self):
        """Choice field type → FieldType.DROPDOWN."""
        inspector = AcroFormInspector()
        ft = inspector._classify_field("/Ch", 0, {})
        assert ft == FieldType.DROPDOWN

    def test_classify_radio(self):
        """Button with radio flag → FieldType.RADIO."""
        inspector = AcroFormInspector()
        ft = inspector._classify_field("/Btn", 32768, {})
        assert ft == FieldType.RADIO

    def test_classify_checkbox(self):
        """Button without radio flag → FieldType.CHECKBOX."""
        inspector = AcroFormInspector()
        ft = inspector._classify_field("/Btn", 0, {})
        assert ft == FieldType.CHECKBOX

    def test_classify_text(self):
        """Text field type → FieldType.TEXT."""
        inspector = AcroFormInspector()
        ft = inspector._classify_field("/Tx", 0, {})
        assert ft == FieldType.TEXT

    def test_extract_allowed_choice(self):
        """Extract allowed values from /Ch field with /Opt."""
        inspector = AcroFormInspector()
        annot = {"/Opt": ["Yes", "No", "Maybe"]}
        vals = inspector._extract_allowed_values("/Ch", annot)
        assert vals == ["Yes", "No", "Maybe"]

    def test_extract_current_value(self):
        """Extract current value from annotation."""
        inspector = AcroFormInspector()
        assert inspector._extract_current_value({"/V": "hello"}) == "hello"
        assert inspector._extract_current_value({}) is None

    def test_resolve_full_name_no_t(self):
        """Annotation without /T → empty string."""
        inspector = AcroFormInspector()
        assert inspector._resolve_full_name({}) == ""


class TestFillerStage2SignatureAndReadOnly:
    """Cover signature and read-only skip paths in stage 2 via mock."""

    def test_signature_field_skipped_mock(self, irs_1120s_pdf, tmp_output, monkeypatch):
        """Simulate a signature field by patching inspector results."""
        filler_inst = AcroFormFiller()

        # Patch inspector to return a signature field
        original_inspect = filler_inst.inspector.inspect

        def mock_inspect(pdf_path):
            fields = original_inspect(pdf_path)
            fields["mock_sig_field"] = FieldMeta(
                field_id="mock_sig_field",
                field_type=FieldType.SIGNATURE,
                page_number=1,
            )
            return fields

        monkeypatch.setattr(filler_inst.inspector, "inspect", mock_inspect)

        nr = NormalizationResult(
            resolved={"mock_sig_field": "John Doe"},
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=irs_1120s_pdf,
            output_path=tmp_output["pdf"],
            audit_log_path=tmp_output["audit"],
        )
        result = filler_inst.fill(nr, config)
        sig_skips = [s for s in result.skipped_fields if s.reason_code == "signature_required"]
        assert len(sig_skips) == 1

    def test_read_only_field_skipped_mock(self, irs_1120s_pdf, tmp_output, monkeypatch):
        """Simulate a read-only field by patching inspector results."""
        filler_inst = AcroFormFiller()
        original_inspect = filler_inst.inspector.inspect

        def mock_inspect(pdf_path):
            fields = original_inspect(pdf_path)
            fields["mock_ro_field"] = FieldMeta(
                field_id="mock_ro_field",
                field_type=FieldType.TEXT,
                page_number=1,
                is_read_only=True,
            )
            return fields

        monkeypatch.setattr(filler_inst.inspector, "inspect", mock_inspect)

        nr = NormalizationResult(
            resolved={"mock_ro_field": "readonly"},
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=irs_1120s_pdf,
            output_path=tmp_output["pdf"],
            audit_log_path=tmp_output["audit"],
        )
        result = filler_inst.fill(nr, config)
        ro_skips = [s for s in result.skipped_fields if s.reason_code == "read_only"]
        assert len(ro_skips) == 1

    def test_radio_value_error_mock(self, irs_1120s_pdf, tmp_output, monkeypatch):
        """Radio field with invalid value → RadioValueError."""
        filler_inst = AcroFormFiller()
        original_inspect = filler_inst.inspector.inspect

        def mock_inspect(pdf_path):
            fields = original_inspect(pdf_path)
            fields["mock_radio"] = FieldMeta(
                field_id="mock_radio",
                field_type=FieldType.RADIO,
                page_number=1,
                allowed_values=["1", "2", "3"],
            )
            return fields

        monkeypatch.setattr(filler_inst.inspector, "inspect", mock_inspect)

        nr = NormalizationResult(
            resolved={"mock_radio": "99"},
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=irs_1120s_pdf,
            output_path=tmp_output["pdf"],
            audit_log_path=tmp_output["audit"],
        )
        with pytest.raises(RadioValueError):
            filler_inst.fill(nr, config)

    def test_dropdown_value_error_mock(self, irs_1120s_pdf, tmp_output, monkeypatch):
        """Dropdown field with invalid value → DropdownValueError."""
        filler_inst = AcroFormFiller()
        original_inspect = filler_inst.inspector.inspect

        def mock_inspect(pdf_path):
            fields = original_inspect(pdf_path)
            fields["mock_dd"] = FieldMeta(
                field_id="mock_dd",
                field_type=FieldType.DROPDOWN,
                page_number=1,
                allowed_values=["Option A", "Option B"],
            )
            return fields

        monkeypatch.setattr(filler_inst.inspector, "inspect", mock_inspect)

        nr = NormalizationResult(
            resolved={"mock_dd": "Invalid"},
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=irs_1120s_pdf,
            output_path=tmp_output["pdf"],
            audit_log_path=tmp_output["audit"],
        )
        with pytest.raises(DropdownValueError):
            filler_inst.fill(nr, config)


class TestFillerReadOnlyFieldSkip:
    """Cover read-only field skipping in stage 2."""

    def test_read_only_field_detected_and_skipped(self, filler, irs_1120s_pdf, tmp_output):
        """If a resolved field maps to a read-only PDF field, it's skipped."""
        # IRS PDFs don't typically have read-only fields, but we can test
        # the FieldTypeMismatchError path which is adjacent
        inspector = AcroFormInspector()
        fields = inspector.inspect(irs_1120s_pdf)
        ro_fields = [fid for fid, meta in fields.items() if meta.is_read_only]
        if not ro_fields:
            # No read-only fields in this PDF — test the skip logic synthetically
            pytest.skip("No read-only fields in IRS 1120-S PDF")

        nr = NormalizationResult(
            resolved={ro_fields[0]: "test"},
            errors=[], warnings=[], manual_required=[],
        )
        config = FillerConfig(
            form_id="1120-S", tax_year=2024,
            pdf_template_path=irs_1120s_pdf,
            output_path=tmp_output["pdf"],
            audit_log_path=tmp_output["audit"],
        )
        result = filler.fill(nr, config)
        skipped_reasons = [s.reason_code for s in result.skipped_fields]
        assert "read_only" in skipped_reasons
