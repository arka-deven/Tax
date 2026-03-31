#!/usr/bin/env python3
"""
Dump every AcroForm field from all IRS PDFs in public/forms/2025/ using pdftk.
Outputs a JSON inventory: field name, type (Text/Button), and page number.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

FORMS_DIR = Path(__file__).resolve().parent.parent / "public" / "forms" / "2025"
OUTPUT_PATH = Path(__file__).resolve().parent / "field_inventory.json"

# Regex to extract page number from field name, e.g. "Page1[0]" -> 1
PAGE_RE = re.compile(r"Page(\d+)\[")


def parse_page_from_name(field_name: str) -> int:
    """Extract page number from the field name pattern (Page1 = 1, etc.)."""
    m = PAGE_RE.search(field_name)
    if m:
        return int(m.group(1))
    return 1  # default to page 1 if pattern not found


def dump_fields(pdf_path: Path) -> list[dict]:
    """Run pdftk dump_data_fields on a PDF and parse the output."""
    result = subprocess.run(
        ["pdftk", str(pdf_path), "dump_data_fields"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"  WARNING: pdftk failed for {pdf_path.name}: {result.stderr.strip()}", file=sys.stderr)
        return []

    fields = []
    current: dict = {}

    for line in result.stdout.splitlines():
        line = line.strip()
        if line == "---":
            if current.get("FieldName"):
                fields.append({
                    "name": current["FieldName"],
                    "type": current.get("FieldType", "Unknown"),
                    "page": parse_page_from_name(current["FieldName"]),
                })
            current = {}
        elif ": " in line:
            key, _, value = line.partition(": ")
            current[key] = value

    # Capture last field if file doesn't end with ---
    if current.get("FieldName"):
        fields.append({
            "name": current["FieldName"],
            "type": current.get("FieldType", "Unknown"),
            "page": parse_page_from_name(current["FieldName"]),
        })

    return fields


def main():
    pdf_files = sorted(FORMS_DIR.glob("*.pdf"))
    print(f"Found {len(pdf_files)} PDFs in {FORMS_DIR}\n")

    inventory: dict = {}

    for pdf in pdf_files:
        form_key = pdf.stem  # e.g. "f1120s"
        print(f"Processing {form_key}...")
        fields = dump_fields(pdf)
        inventory[form_key] = {
            "total": len(fields),
            "fields": fields,
        }
        # Summary by type
        type_counts = {}
        for f in fields:
            type_counts[f["type"]] = type_counts.get(f["type"], 0) + 1
        type_summary = ", ".join(f"{k}: {v}" for k, v in sorted(type_counts.items()))
        # Page range
        pages = sorted(set(f["page"] for f in fields)) if fields else []
        page_range = f"pages {pages[0]}-{pages[-1]}" if pages else "no pages"
        print(f"  {len(fields)} fields ({type_summary}) across {page_range}")

    # Write JSON
    with open(OUTPUT_PATH, "w") as fp:
        json.dump(inventory, fp, indent=2)

    print(f"\nInventory written to {OUTPUT_PATH}")
    print(f"Total forms: {len(inventory)}")
    grand_total = sum(v["total"] for v in inventory.values())
    print(f"Grand total fields: {grand_total}")


if __name__ == "__main__":
    main()
