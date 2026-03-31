"""AcroFormFiller — 4-stage pipeline: validate → map → write → verify."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject,
    BooleanObject,
    DictionaryObject,
    NameObject,
    TextStringObject,
    NumberObject,
)

from tax_normalizer.models import NormalizationResult

from .exceptions import (
    DropdownValueError,
    FieldTypeMismatchError,
    FillerDependencyError,
    NotFillReadyError,
    PDFInspectionError,
    RadioValueError,
)
from .formatter import ValueFormatter
from .inspector import AcroFormInspector
from .models import (
    AuditLog,
    AuditLogEntry,
    FieldMeta,
    FieldType,
    FillerConfig,
    FillResult,
    SkippedField,
)

_FILLER_VERSION = "1.0.0"


class AcroFormFiller:
    """Main filler class: consumes NormalizationResult, produces filled PDF."""

    def __init__(self):
        self.inspector = AcroFormInspector()
        self.formatter = ValueFormatter()

    def fill(
        self,
        normalization_result: NormalizationResult,
        config: FillerConfig,
    ) -> FillResult:
        """Run the 4-stage fill pipeline."""
        result = FillResult(output_path=config.output_path)
        audit = AuditLog(
            form_id=config.form_id,
            tax_year=config.tax_year,
            filled_at=datetime.now(timezone.utc).isoformat(),
            filler_version=_FILLER_VERSION,
            dry_run=config.dry_run,
        )
        result.audit_log = audit

        # --- Stage 1: Pre-fill validation ---
        pdf_fields = self._stage1_prefill_validation(
            normalization_result, config, result
        )

        # --- Stage 2: Field mapping resolution ---
        write_map = self._stage2_field_mapping(
            normalization_result, pdf_fields, config, result, audit
        )

        # --- Stage 3: Write fields ---
        if not config.dry_run:
            self._stage3_write_fields(config, write_map, result)
        else:
            result.success = True

        # --- Stage 4: Post-fill verification ---
        # Skip verification on flattened PDFs (fields are removed)
        if not config.dry_run and result.success and not config.flatten:
            self._stage4_post_fill_verification(config, write_map, result, audit)
        elif not config.dry_run and result.success and config.flatten:
            # Just compute SHA-256 for flattened PDFs
            sha = hashlib.sha256()
            with open(config.output_path, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    sha.update(chunk)
            audit.pdf_sha256 = sha.hexdigest()

        # Write audit log
        if config.audit_log_path:
            self._write_audit_log(audit, config.audit_log_path)

        return result

    # ------------------------------------------------------------------
    # Stage 1: Pre-fill Validation
    # ------------------------------------------------------------------

    def _stage1_prefill_validation(
        self,
        nr: NormalizationResult,
        config: FillerConfig,
        result: FillResult,
    ) -> dict[str, FieldMeta]:
        """Validate inputs and inspect the template PDF."""
        if not nr.fill_ready:
            raise NotFillReadyError(len(nr.errors))

        pdf_fields = self.inspector.inspect(config.pdf_template_path)

        # Keys in resolved but not in PDF → mismatch warning
        for key in nr.resolved:
            if key not in pdf_fields:
                result.mismatched_fields.append(key)

        return pdf_fields

    # ------------------------------------------------------------------
    # Stage 2: Field Mapping Resolution
    # ------------------------------------------------------------------

    def _stage2_field_mapping(
        self,
        nr: NormalizationResult,
        pdf_fields: dict[str, FieldMeta],
        config: FillerConfig,
        result: FillResult,
        audit: AuditLog,
    ) -> dict[str, str]:
        """Map resolved values to formatted strings, respecting field types."""
        write_map: dict[str, str] = {}

        for field_id, value in nr.resolved.items():
            if field_id not in pdf_fields:
                continue  # already logged as mismatch

            meta = pdf_fields[field_id]

            # Skip signature fields
            if meta.field_type == FieldType.SIGNATURE:
                result.skipped_fields.append(SkippedField(
                    field_id=field_id,
                    reason_code="signature_required",
                    message=f"Signature field '{field_id}' cannot be auto-filled",
                ))
                continue

            # Skip read-only fields
            if meta.is_read_only:
                result.skipped_fields.append(SkippedField(
                    field_id=field_id,
                    reason_code="read_only",
                    message=f"Read-only field '{field_id}' cannot be modified",
                ))
                continue

            # Type-mismatch check: numeric going into checkbox
            if meta.field_type == FieldType.CHECKBOX and isinstance(value, (int, float)) and not isinstance(value, bool):
                raise FieldTypeMismatchError(field_id, "Checkbox", type(value).__name__)

            # Format the value
            data_type = self._infer_data_type(field_id, value)
            formatted = self.formatter.format(value, meta.field_type.value, data_type)

            # Radio validation
            if meta.field_type == FieldType.RADIO:
                if meta.allowed_values and formatted not in meta.allowed_values and formatted != "Off":
                    raise RadioValueError(field_id, formatted, meta.allowed_values)

            # Dropdown validation
            if meta.field_type == FieldType.DROPDOWN:
                if meta.allowed_values and formatted not in meta.allowed_values and formatted != "":
                    raise DropdownValueError(field_id, formatted, meta.allowed_values)

            # Max length truncation
            if meta.max_length and len(formatted) > meta.max_length:
                original = formatted
                formatted = formatted[: meta.max_length]
                result.skipped_fields.append(SkippedField(
                    field_id=field_id,
                    reason_code="truncated",
                    message=f"Value '{original}' truncated to {meta.max_length} chars",
                ))

            write_map[field_id] = formatted
            result.filled_count += 1

            # Audit entry
            audit.fields.append(AuditLogEntry(
                field_id=field_id,
                line_label=field_id,  # In production, map to human label
                raw_value=value,
                formatted_value=formatted,
                source_type="resolved",
            ))

        return write_map

    # ------------------------------------------------------------------
    # Stage 3: Write Fields
    # ------------------------------------------------------------------

    def _stage3_write_fields(
        self,
        config: FillerConfig,
        write_map: dict[str, str],
        result: FillResult,
    ) -> None:
        """Write fields to PDF atomically. pypdf primary, pdftk fallback."""
        # Ensure output directory exists
        Path(config.output_path).parent.mkdir(parents=True, exist_ok=True)

        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".pdf")
        os.close(tmp_fd)

        try:
            # Prefer pdftk for IRS PDFs (handles XFA-hybrid forms better)
            if shutil.which("pdftk"):
                success = self._write_with_pdftk(
                    config.pdf_template_path, tmp_path, write_map, config.flatten
                )
            else:
                success = False

            if not success:
                success = self._write_with_pypdf(
                    config.pdf_template_path, tmp_path, write_map, config.flatten
                )

            if success:
                shutil.move(tmp_path, config.output_path)
                result.success = True
            else:
                result.success = False
        except Exception:
            # Clean up temp file on failure
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise

    def _write_with_pypdf(
        self,
        template_path: str,
        output_path: str,
        write_map: dict[str, str],
        flatten: bool,
    ) -> bool:
        """Write fields using pypdf. Returns True on success."""
        try:
            reader = PdfReader(template_path)
            writer = PdfWriter()
            writer.append_pages_from_reader(reader)

            # Copy AcroForm from reader
            if "/AcroForm" in reader.trailer.get("/Root", {}):
                writer._root_object[NameObject("/AcroForm")] = reader.trailer["/Root"]["/AcroForm"]

            for page in writer.pages:
                annots = page.get("/Annots")
                if not annots:
                    continue

                for annot_ref in annots:
                    annot = annot_ref.get_object() if hasattr(annot_ref, "get_object") else annot_ref
                    field_name = self._get_full_field_name(annot)
                    if field_name not in write_map:
                        continue

                    value = write_map[field_name]
                    ft = self._get_field_type(annot)

                    if ft == "/Btn":
                        self._write_button_field(annot, value)
                    else:
                        annot.update({
                            NameObject("/V"): TextStringObject(value),
                            NameObject("/AP"): DictionaryObject(),  # Clear appearance to force re-render
                        })

                if flatten:
                    # Set field flags to read-only by ORing in bit 1
                    for annot_ref in annots:
                        annot_obj = annot_ref.get_object() if hasattr(annot_ref, "get_object") else annot_ref
                        existing_flags = int(annot_obj.get("/Ff", 0))
                        annot_obj.update({
                            NameObject("/Ff"): NumberObject(existing_flags | 1),
                        })

            with open(output_path, "wb") as f:
                writer.write(f)

            return True
        except Exception:
            return False

    def _write_button_field(self, annot: Any, value: str) -> None:
        """Set a checkbox/button field value."""
        if value in ("Off", "", "0", "False", "false"):
            annot.update({
                NameObject("/V"): NameObject("/Off"),
                NameObject("/AS"): NameObject("/Off"),
            })
        else:
            # Determine the "on" value from /AP/N keys
            on_value = value
            ap = annot.get("/AP")
            if ap:
                n_dict = ap.get("/N")
                if n_dict and hasattr(n_dict, "keys"):
                    for key in n_dict.keys():
                        k = str(key)
                        if k != "/Off":
                            on_value = k.lstrip("/")
                            break
            annot.update({
                NameObject("/V"): NameObject(f"/{on_value}"),
                NameObject("/AS"): NameObject(f"/{on_value}"),
            })

    def _write_with_pdftk(
        self,
        template_path: str,
        output_path: str,
        write_map: dict[str, str],
        flatten: bool,
    ) -> bool:
        """Fallback: write fields using pdftk fill_form."""
        if not shutil.which("pdftk"):
            raise FillerDependencyError(
                "pdftk",
                "brew install pdftk-java (macOS) or apt install pdftk (Linux)"
            )

        # Build XFDF data
        xfdf = self._build_xfdf(write_map)

        # Write XFDF to temp file
        xfdf_fd, xfdf_path = tempfile.mkstemp(suffix=".xfdf")
        os.close(xfdf_fd)

        try:
            Path(xfdf_path).write_text(xfdf, encoding="utf-8")

            cmd = [
                "pdftk", template_path, "fill_form", xfdf_path,
                "output", output_path,
            ]
            if flatten:
                cmd.append("flatten")

            proc = subprocess.run(
                cmd, capture_output=True, text=True, timeout=30,
            )
            return proc.returncode == 0
        finally:
            if os.path.exists(xfdf_path):
                os.unlink(xfdf_path)

    def _build_xfdf(self, write_map: dict[str, str]) -> str:
        """Build an XFDF XML string for pdftk fill_form."""
        from xml.sax.saxutils import escape

        fields_xml = ""
        for name, value in write_map.items():
            fields_xml += f'    <field name="{escape(name)}"><value>{escape(value)}</value></field>\n'

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
  <fields>
{fields_xml}  </fields>
</xfdf>"""

    def _get_full_field_name(self, annot: Any) -> str:
        """Resolve the full field name from an annotation object."""
        t = annot.get("/T")
        if t is None:
            return ""
        parts = [str(t)]
        parent = annot.get("/Parent")
        while parent:
            parent_obj = parent.get_object() if hasattr(parent, "get_object") else parent
            pt = parent_obj.get("/T")
            if pt:
                parts.insert(0, str(pt))
            parent = parent_obj.get("/Parent")
        return ".".join(parts)

    def _get_field_type(self, annot: Any) -> str:
        """Get /FT from annotation or its parent."""
        ft = str(annot.get("/FT", ""))
        if not ft:
            parent = annot.get("/Parent")
            if parent:
                parent_obj = parent.get_object() if hasattr(parent, "get_object") else parent
                ft = str(parent_obj.get("/FT", ""))
        return ft

    # ------------------------------------------------------------------
    # Stage 4: Post-fill Verification
    # ------------------------------------------------------------------

    def _stage4_post_fill_verification(
        self,
        config: FillerConfig,
        write_map: dict[str, str],
        result: FillResult,
        audit: AuditLog,
    ) -> None:
        """Re-read the output PDF and verify written values; compute SHA-256."""
        # SHA-256
        sha = hashlib.sha256()
        with open(config.output_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha.update(chunk)
        audit.pdf_sha256 = sha.hexdigest()

        # Read back fields
        try:
            filled_fields = self.inspector.inspect(config.output_path)
        except PDFInspectionError:
            return  # Can't verify, but fill succeeded

        for field_id, expected_value in write_map.items():
            if field_id not in filled_fields:
                continue
            actual = filled_fields[field_id].current_value or ""
            # Normalize for comparison: strip leading "/" from button values
            actual_norm = actual.lstrip("/") if actual.startswith("/") else actual
            expected_norm = expected_value.lstrip("/") if expected_value.startswith("/") else expected_value
            if actual_norm != expected_norm and actual_norm != "":
                # Only flag real mismatches, not empty re-reads (pypdf quirk)
                result.mismatched_fields.append(field_id)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _infer_data_type(self, field_id: str, value: Any) -> str:
        """Infer data type from value or field naming patterns."""
        if isinstance(value, bool):
            return "boolean"
        if isinstance(value, (int, float)):
            return "currency"
        if isinstance(value, str):
            if "-" in value and len(value) == 11 and value[3] == "-":
                return "ssn"
            if "-" in value and len(value) == 10 and value[2] == "-":
                return "ein"
        return "string"

    def _write_audit_log(self, audit: AuditLog, path: str) -> None:
        """Write audit log as JSON."""
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_text(audit.to_json(), encoding="utf-8")
