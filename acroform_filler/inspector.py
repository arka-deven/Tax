"""AcroForm PDF field inspector — reads field metadata from PDF internals."""

from __future__ import annotations

import json
import subprocess
from dataclasses import asdict
from pathlib import Path
from typing import Any

from .exceptions import PDFInspectionError
from .models import FieldMeta, FieldType

# PDF annotation flag bits
_FF_READ_ONLY = 1  # Bit 1


class AcroFormInspector:
    """Inspects AcroForm fields in a PDF using pypdf, with pdftk fallback."""

    def inspect(self, pdf_path: str) -> dict[str, FieldMeta]:
        """Return a mapping of field_id → FieldMeta for every fillable field."""
        path = Path(pdf_path)
        if not path.exists():
            raise PDFInspectionError(pdf_path, "File not found")

        try:
            return self._inspect_pypdf(pdf_path)
        except PDFInspectionError:
            raise
        except Exception as exc:
            raise PDFInspectionError(pdf_path, str(exc)) from exc

    def dump_fields(self, pdf_path: str) -> str:
        """Return a JSON string of all field metadata (for debugging)."""
        fields = self.inspect(pdf_path)
        serializable = {fid: asdict(meta) for fid, meta in fields.items()}
        # Convert FieldType enum to string
        for fid, d in serializable.items():
            d["field_type"] = d["field_type"].value if hasattr(d["field_type"], "value") else str(d["field_type"])
        return json.dumps(serializable, indent=2)

    def _inspect_pypdf(self, pdf_path: str) -> dict[str, FieldMeta]:
        """Extract fields using pypdf page annotations for accurate page numbers."""
        from pypdf import PdfReader

        try:
            reader = PdfReader(pdf_path)
        except Exception as exc:
            raise PDFInspectionError(pdf_path, f"Cannot read PDF: {exc}") from exc

        result: dict[str, FieldMeta] = {}

        # Walk page annotations to get accurate page numbers
        for page_idx, page in enumerate(reader.pages):
            annots = page.get("/Annots")
            if not annots:
                continue

            for annot_ref in annots:
                try:
                    annot = annot_ref.get_object() if hasattr(annot_ref, "get_object") else annot_ref
                except Exception:
                    continue

                field_id = self._resolve_full_name(annot)
                if not field_id:
                    continue

                ft = str(annot.get("/FT", ""))
                if not ft:
                    # Try parent
                    parent = annot.get("/Parent")
                    if parent:
                        parent_obj = parent.get_object() if hasattr(parent, "get_object") else parent
                        ft = str(parent_obj.get("/FT", ""))

                if ft not in ("/Tx", "/Btn", "/Ch", "/Sig"):
                    continue

                flags = int(annot.get("/Ff", 0))
                is_read_only = bool(flags & _FF_READ_ONLY)
                max_length = annot.get("/MaxLen")
                if max_length is not None:
                    max_length = int(max_length)

                field_type = self._classify_field(ft, flags, annot)
                allowed = self._extract_allowed_values(ft, annot)
                current = self._extract_current_value(annot)

                result[field_id] = FieldMeta(
                    field_id=field_id,
                    field_type=field_type,
                    page_number=page_idx + 1,  # 1-indexed
                    is_read_only=is_read_only,
                    max_length=max_length,
                    allowed_values=allowed,
                    current_value=current,
                )

        # Fallback: also scan get_fields() for any we missed (e.g. fields not in annots)
        all_fields = reader.get_fields() or {}
        for name, field_obj in all_fields.items():
            if name in result:
                continue
            ft = str(field_obj.get("/FT", ""))
            if ft not in ("/Tx", "/Btn", "/Ch", "/Sig"):
                continue

            flags = int(field_obj.get("/Ff", 0))
            is_read_only = bool(flags & _FF_READ_ONLY)
            max_length = field_obj.get("/MaxLen")
            if max_length is not None:
                max_length = int(max_length)

            field_type = self._classify_field(ft, flags, field_obj)
            allowed = self._extract_allowed_values(ft, field_obj)
            current = self._extract_current_value(field_obj)

            result[name] = FieldMeta(
                field_id=name,
                field_type=field_type,
                page_number=0,  # unknown from get_fields
                is_read_only=is_read_only,
                max_length=max_length,
                allowed_values=allowed,
                current_value=current,
            )

        return result

    def _resolve_full_name(self, annot: Any) -> str:
        """Build the full qualified field name from an annotation."""
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

    def _classify_field(self, ft: str, flags: int, annot: Any) -> FieldType:
        """Determine the FieldType from the PDF field type and flags."""
        if ft == "/Sig":
            return FieldType.SIGNATURE
        if ft == "/Ch":
            return FieldType.DROPDOWN
        if ft == "/Btn":
            # Radio buttons have bit 16 set (0x8000 = 32768) in /Ff
            # But IRS PDFs often use indexed names for radios (c1_2[0], c1_2[1])
            # and plain checkboxes are single instances
            if flags & 32768:  # Radio flag
                return FieldType.RADIO
            return FieldType.CHECKBOX
        return FieldType.TEXT

    def _extract_allowed_values(self, ft: str, annot: Any) -> list[str]:
        """Extract allowed/export values for choice and button fields."""
        values: list[str] = []

        if ft == "/Ch":
            opts = annot.get("/Opt")
            if opts:
                for opt in opts:
                    if hasattr(opt, "get_object"):
                        opt = opt.get_object()
                    values.append(str(opt))

        if ft == "/Btn":
            # Extract state options from /AP/N dictionary
            ap = annot.get("/AP")
            if ap:
                n_dict = ap.get("/N")
                if n_dict and hasattr(n_dict, "keys"):
                    for key in n_dict.keys():
                        k = str(key)
                        if k != "/Off":
                            values.append(k.lstrip("/"))

        return values

    def _extract_current_value(self, annot: Any) -> str | None:
        """Extract the current field value."""
        v = annot.get("/V")
        if v is None:
            return None
        return str(v)


def inspect_with_pdftk(pdf_path: str) -> dict[str, FieldMeta]:
    """Fallback inspector using pdftk dump_data_fields."""
    try:
        proc = subprocess.run(
            ["pdftk", pdf_path, "dump_data_fields"],
            capture_output=True, text=True, timeout=30,
        )
    except FileNotFoundError:
        raise PDFInspectionError(pdf_path, "pdftk not installed")
    except subprocess.TimeoutExpired:
        raise PDFInspectionError(pdf_path, "pdftk timed out")

    if proc.returncode != 0:
        raise PDFInspectionError(pdf_path, f"pdftk error: {proc.stderr}")

    result: dict[str, FieldMeta] = {}
    current: dict[str, Any] = {}

    for line in proc.stdout.splitlines():
        line = line.strip()
        if line == "---":
            if current.get("FieldName"):
                meta = _pdftk_entry_to_meta(current)
                if meta:
                    result[meta.field_id] = meta
            current = {}
        elif ": " in line:
            key, _, val = line.partition(": ")
            if key == "FieldStateOption":
                current.setdefault("FieldStateOptions", []).append(val)
            else:
                current[key] = val

    # Flush last entry
    if current.get("FieldName"):
        meta = _pdftk_entry_to_meta(current)
        if meta:
            result[meta.field_id] = meta

    return result


def _pdftk_entry_to_meta(entry: dict[str, Any]) -> FieldMeta | None:
    """Convert a pdftk field entry to FieldMeta."""
    name = entry.get("FieldName", "")
    ftype = entry.get("FieldType", "")

    type_map = {
        "Text": FieldType.TEXT,
        "Button": FieldType.CHECKBOX,  # refined below for radio
        "Choice": FieldType.DROPDOWN,
    }
    field_type = type_map.get(ftype)
    if field_type is None:
        return None

    flags = int(entry.get("FieldFlags", 0))
    is_read_only = bool(flags & _FF_READ_ONLY)

    max_len = entry.get("FieldMaxLength")
    max_length = int(max_len) if max_len else None

    allowed: list[str] = []
    state_opts = entry.get("FieldStateOptions", [])
    for opt in state_opts:
        if opt != "Off":
            allowed.append(opt)

    return FieldMeta(
        field_id=name,
        field_type=field_type,
        page_number=0,  # pdftk doesn't report page
        is_read_only=is_read_only,
        max_length=max_length,
        allowed_values=allowed,
        current_value=entry.get("FieldValue"),
    )
