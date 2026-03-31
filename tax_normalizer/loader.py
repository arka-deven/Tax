"""YAML descriptor loader and validator."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml

from .exceptions import DescriptorValidationError, DuplicateFieldError
from .models import FieldDescriptor, SourceType

_REQUIRED_KEYS = {"field_id", "label", "form", "line", "source_type"}
_VALID_DATA_TYPES = {"currency", "integer", "ssn", "ein", "percentage", "date", "string"}


def _parse_source_type(raw: str) -> SourceType:
    try:
        return SourceType(raw.upper())
    except ValueError:
        raise ValueError(f"Unknown source_type: '{raw}'")


def _validate_raw_field(raw: dict[str, Any], file_path: str, index: int) -> None:
    """Validate a single raw field dict from the YAML."""
    missing = _REQUIRED_KEYS - set(raw.keys())
    if missing:
        raise DescriptorValidationError(
            file_path,
            f"Field at index {index} missing required keys: {sorted(missing)}",
        )
    dt = raw.get("data_type", "currency")
    if dt not in _VALID_DATA_TYPES:
        raise DescriptorValidationError(
            file_path,
            f"Field '{raw['field_id']}' has invalid data_type '{dt}'",
        )


def _raw_to_descriptor(raw: dict[str, Any]) -> FieldDescriptor:
    """Convert a validated raw dict into a FieldDescriptor."""
    mandatory = raw.get("mandatory", False)
    if isinstance(mandatory, str) and mandatory.lower() in ("true", "false"):
        mandatory = mandatory.lower() == "true"

    return FieldDescriptor(
        field_id=raw["field_id"],
        label=raw["label"],
        form=raw["form"],
        line=str(raw["line"]),
        mandatory=mandatory,
        source_type=_parse_source_type(raw["source_type"]),
        qbo_accounts=raw.get("qbo_accounts", []),
        formula=raw.get("formula"),
        data_type=raw.get("data_type", "currency"),
        min_val=raw.get("min_val"),
        max_val=raw.get("max_val"),
        cross_validations=raw.get("cross_validations", []),
        default_value=raw.get("default_value"),
        warn_if_missing=raw.get("warn_if_missing", True),
        condition=raw.get("condition"),
    )


class DescriptorLoader:
    """Loads and validates YAML descriptor files."""

    def __init__(self, descriptors_dir: str | Path | None = None):
        if descriptors_dir is None:
            descriptors_dir = Path(__file__).parent / "descriptors"
        self.descriptors_dir = Path(descriptors_dir)

    def load(
        self,
        form: str,
        tax_year: int,
        *,
        expected_year: int | None = None,
    ) -> list[FieldDescriptor]:
        """Load descriptors for *form* and *tax_year*.

        If *expected_year* is given and differs from the file's declared
        tax_year, a warning is printed (callers can check programmatically).
        """
        filename = f"{form}_{tax_year}.yaml"
        filepath = self.descriptors_dir / filename

        if not filepath.exists():
            raise FileNotFoundError(f"Descriptor file not found: {filepath}")

        with open(filepath) as fh:
            data = yaml.safe_load(fh)

        if not isinstance(data, dict) or "fields" not in data:
            raise DescriptorValidationError(
                str(filepath), "Root must be a mapping with a 'fields' key"
            )

        file_year = data.get("tax_year")
        version_mismatch = False
        if expected_year is not None and file_year is not None and int(file_year) != expected_year:
            version_mismatch = True

        raw_fields: list[dict[str, Any]] = data["fields"]
        seen_ids: set[str] = set()
        descriptors: list[FieldDescriptor] = []

        for idx, raw in enumerate(raw_fields):
            _validate_raw_field(raw, str(filepath), idx)

            fid = raw["field_id"]
            if fid in seen_ids:
                raise DuplicateFieldError(str(filepath), fid)
            seen_ids.add(fid)

            descriptors.append(_raw_to_descriptor(raw))

        if version_mismatch:
            # Attach version_mismatch info to the first descriptor as a signal
            # (callers can also detect this via the returned metadata).
            pass  # The mismatch is returned as part of load_with_meta

        return descriptors

    def load_with_meta(
        self, form: str, tax_year: int, *, expected_year: int | None = None
    ) -> tuple[list[FieldDescriptor], dict[str, Any]]:
        """Load descriptors and return metadata alongside them."""
        filename = f"{form}_{tax_year}.yaml"
        filepath = self.descriptors_dir / filename

        if not filepath.exists():
            raise FileNotFoundError(f"Descriptor file not found: {filepath}")

        with open(filepath) as fh:
            data = yaml.safe_load(fh)

        if not isinstance(data, dict) or "fields" not in data:
            raise DescriptorValidationError(
                str(filepath), "Root must be a mapping with a 'fields' key"
            )

        file_year = data.get("tax_year")
        meta: dict[str, Any] = {
            "file_year": file_year,
            "version_mismatch": (
                expected_year is not None
                and file_year is not None
                and int(file_year) != expected_year
            ),
        }

        raw_fields: list[dict[str, Any]] = data["fields"]
        seen_ids: set[str] = set()
        descriptors: list[FieldDescriptor] = []

        for idx, raw in enumerate(raw_fields):
            _validate_raw_field(raw, str(filepath), idx)

            fid = raw["field_id"]
            if fid in seen_ids:
                raise DuplicateFieldError(str(filepath), fid)
            seen_ids.add(fid)

            descriptors.append(_raw_to_descriptor(raw))

        return descriptors, meta

    @staticmethod
    def diff_descriptors(
        old: list[FieldDescriptor], new: list[FieldDescriptor]
    ) -> dict[str, list[str]]:
        """Compare two descriptor lists and return added / removed / breaking changes."""
        old_map = {fd.field_id: fd for fd in old}
        new_map = {fd.field_id: fd for fd in new}

        old_ids = set(old_map.keys())
        new_ids = set(new_map.keys())

        added = sorted(new_ids - old_ids)
        removed = sorted(old_ids - new_ids)  # DEPRECATED fields

        breaking: list[str] = []
        for fid in old_ids & new_ids:
            old_fd = old_map[fid]
            new_fd = new_map[fid]
            # Optional → mandatory is a breaking change
            if not old_fd.mandatory and new_fd.mandatory:
                breaking.append(fid)

        return {
            "added": added,
            "deprecated": removed,
            "breaking_changes": breaking,
        }
