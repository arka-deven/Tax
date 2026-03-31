#!/usr/bin/env python3
"""Convert generated mapping JSON files into TypeScript PdfFieldMapping entries
and inject them into the existing mapping files.

For each form, this script:
1. Reads the generated mapping JSON
2. Converts each entry into a TS object literal
3. Appends them to the existing TS mapping file's fields array

This is run ONCE to close the gap. After running, all 6,850 fields
will have a mapping entry in the TS files.
"""

import json
import re
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPTS_DIR.parent
GENERATED_DIR = SCRIPTS_DIR / "generated_mappings"
MAPPING_DIR = PROJECT_DIR / "lib" / "pdf" / "pdf-mappings"


def entry_to_ts(entry: dict) -> str:
    """Convert a mapping entry dict to a TS object literal string."""
    fname = entry["pdfFieldName"]
    page = entry.get("page", 0)

    # Manual fields (signatures, banking, preparer)
    if entry.get("manual"):
        reason = entry.get("reason", "manual")
        return (
            f'    {{ pdfFieldName: "{fname}", manual: true, '
            f'description: "{reason}" }},'
        )

    # Checkbox → sbCheck helper
    if entry.get("type") == "checkbox":
        qkey = entry.get("questionKey", entry.get("reason", "unknown"))
        return (
            f'    {{ pdfFieldName: "{fname}", '
            f'compute: (ctx: FillContext) => sbCheck(ctx, "{qkey}"), '
            f'format: "boolean", description: "Checkbox: {qkey}" }},'
        )

    # Officer table rows
    if entry.get("source") == "officer_array":
        ri = entry["rowIndex"]
        col = entry["column"]
        if col == "compensation":
            return (
                f'    {{ pdfFieldName: "{fname}", '
                f'compute: (ctx: FillContext) => currency(officer(ctx, {ri})?.compensation), '
                f'format: "currency", description: "Officer row {ri+1}: {col}" }},'
            )
        elif col in ("percent_time", "percent_stock_common", "percent_stock_preferred"):
            attr = "percentTime" if col == "percent_time" else "percentStock"
            return (
                f'    {{ pdfFieldName: "{fname}", '
                f'compute: (ctx: FillContext) => officer(ctx, {ri}) ? String(officer(ctx, {ri})!.{attr}) : "", '
                f'format: "percent", description: "Officer row {ri+1}: {col}" }},'
            )
        elif col == "ssn":
            return (
                f'    {{ pdfFieldName: "{fname}", '
                f'compute: (ctx: FillContext) => officer(ctx, {ri})?.ssn ?? "", '
                f'format: "string", description: "Officer row {ri+1}: SSN" }},'
            )
        else:  # name
            return (
                f'    {{ pdfFieldName: "{fname}", '
                f'compute: (ctx: FillContext) => officer(ctx, {ri})?.name ?? "", '
                f'format: "string", description: "Officer row {ri+1}: {col}" }},'
            )

    # K-1 owner info
    if entry.get("source") == "owner_info":
        return (
            f'    {{ pdfFieldName: "{fname}", '
            f'manual: true, description: "K-1 entity/owner info" }},'
        )

    # K-1 distributive share
    if entry.get("source") == "k1_allocation":
        return (
            f'    {{ pdfFieldName: "{fname}", '
            f'manual: true, description: "K-1 distributive share item" }},'
        )

    # Table structure (balance sheet, schedule grids)
    if entry.get("source") == "table_row":
        table = entry.get("table", "")
        line = entry.get("tableLine", "")
        return (
            f'    {{ pdfFieldName: "{fname}", '
            f'staticValue: "", description: "Table {table} Line {line}" }},'
        )

    # Rental property
    if entry.get("source") == "rental_property":
        return (
            f'    {{ pdfFieldName: "{fname}", '
            f'manual: true, description: "Rental property data" }},'
        )

    # Asset depreciation
    if entry.get("source") == "asset_depreciation":
        return (
            f'    {{ pdfFieldName: "{fname}", '
            f'manual: true, description: "Depreciation schedule row" }},'
        )

    # Capital transaction
    if entry.get("source") == "capital_transaction":
        return (
            f'    {{ pdfFieldName: "{fname}", '
            f'manual: true, description: "Asset sale transaction row" }},'
        )

    # 990 functional expense grid
    if entry.get("source") == "np_functional_expense":
        return (
            f'    {{ pdfFieldName: "{fname}", '
            f'staticValue: "", description: "990 Part IX expense grid" }},'
        )

    # 990 balance sheet
    if entry.get("source") == "np_balance_sheet":
        return (
            f'    {{ pdfFieldName: "{fname}", '
            f'staticValue: "", description: "990 Part X balance sheet" }},'
        )

    # Default: static blank
    return (
        f'    {{ pdfFieldName: "{fname}", '
        f'staticValue: "", description: "Unmapped — page {page}" }},'
    )


# Map form_id from inventory to TS mapping file
FORM_TO_FILE = {
    "f1040sc": "f1040sc.ts",
    "f1040sse": "f1040sse.ts",
    "f1065": "f1065.ts",
    "f1065sb1": "f1065sb1.ts",
    "f1065sk1": "f1065sk1.ts",
    "f1118": "f1118.ts",
    "f1120": "f1120.ts",
    "f1120s": "f1120s.ts",
    "f1120sd": "f1120sd.ts",
    "f1120sm3": "f1120sm3.ts",
    "f1120ssk": "f1120ssk.ts",
    "f1125a": "f1125a.ts",
    "f1125e": "f1125e.ts",
    "f4562": "f4562.ts",
    "f4797": "f4797.ts",
    "f7203": "f7203.ts",
    "f8825": "f8825.ts",
    "f8829": "f8829.ts",
    "f8990": "f8990.ts",
    "f8995": "f8995.ts",
    "f990": "f990.ts",
    "f990ez": "f990ez.ts",
    "f990ezb": "f990sb.ts",  # Note: f990ezb maps to f990sb.ts
    "f990sa": "f990sa.ts",
    "f990t": "f990t.ts",
}


def inject_into_ts_file(form_id: str, entries: list[dict]) -> int:
    """Inject new mapping entries into the existing TS mapping file."""
    ts_filename = FORM_TO_FILE.get(form_id)
    if not ts_filename:
        print(f"  SKIP {form_id}: no TS file mapping")
        return 0

    ts_path = MAPPING_DIR / ts_filename
    if not ts_path.exists():
        print(f"  SKIP {form_id}: {ts_path} not found")
        return 0

    content = ts_path.read_text()

    # Check if we need to add helper imports
    needs_helpers = any(
        e.get("type") == "checkbox" or e.get("source") == "officer_array"
        for e in entries
    )

    if needs_helpers and "sbCheck" not in content and any(e.get("type") == "checkbox" for e in entries):
        # Add import for helper functions
        if "import type { FormPdfMapping, FillContext }" in content:
            content = content.replace(
                'import type { FormPdfMapping, FillContext } from "../types";',
                'import type { FormPdfMapping, FillContext } from "../types";\nimport { sbCheck, officer, currency } from "../types";',
            )

    # Generate TS entries
    ts_entries = []
    for e in entries:
        ts_entries.append(entry_to_ts(e))

    # Find the closing of the fields array and inject before it
    # Pattern: the last `  ],` before the closing `};`
    insert_block = "\n    // ── Auto-generated mappings (remaining fields) ──────────────────\n"
    insert_block += "\n".join(ts_entries)
    insert_block += "\n"

    # Find the last `],` in the file (closing of fields array)
    last_bracket = content.rfind("  ],")
    if last_bracket == -1:
        # Try without leading spaces
        last_bracket = content.rfind("],")

    if last_bracket == -1:
        print(f"  WARN {form_id}: could not find fields array end")
        return 0

    content = content[:last_bracket] + insert_block + content[last_bracket:]
    ts_path.write_text(content)
    return len(entries)


def main():
    total_injected = 0

    for json_file in sorted(GENERATED_DIR.glob("*.json")):
        if json_file.name.startswith("_"):
            continue  # skip summary

        form_id = json_file.stem
        with open(json_file) as f:
            entries = json.load(f)

        if not entries:
            continue

        count = inject_into_ts_file(form_id, entries)
        if count > 0:
            print(f"  {form_id}: injected {count} entries")
        total_injected += count

    print(f"\nTotal injected: {total_injected} entries across all forms")


if __name__ == "__main__":
    main()
