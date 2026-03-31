#!/usr/bin/env python3
"""Generate complete PDF mapping entries for all unmapped AcroForm fields.

Reads the field inventory (field_inventory.json) and the existing TS mapping
files, identifies gaps, and generates mapping entries using form-structure
heuristics:

- Page 1 entity header fields → compute from ctx.meta
- Checkbox fields (c*) → sbCheck or manual
- Signature/preparer page fields → manual
- Table row fields (repeating patterns) → indexed compute from arrays
- Remaining text fields → staticValue: "" (blank until wired)

Output: One JSON file per form in scripts/generated_mappings/ with entries
ready to be inserted into the TS mapping files.
"""

import json
import re
import subprocess
from pathlib import Path
from collections import defaultdict

SCRIPTS_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPTS_DIR.parent
INVENTORY_PATH = SCRIPTS_DIR / "field_inventory.json"
OUTPUT_DIR = SCRIPTS_DIR / "generated_mappings"
MAPPING_DIR = PROJECT_DIR / "lib" / "pdf" / "pdf-mappings"

# Fields already mapped in TS files
def get_existing_mapped_fields() -> set[str]:
    """Extract all pdfFieldName values from existing TS mapping files."""
    mapped = set()
    for ts_file in MAPPING_DIR.glob("*.ts"):
        content = ts_file.read_text()
        # Match both template literal and string literal field names
        for m in re.finditer(r'pdfFieldName:\s*[`"\']([^`"\']+)[`"\']', content):
            mapped.add(m.group(1))
        # Also match template expressions like `${P3}f3_1[0]`
        for m in re.finditer(r'pdfFieldName:\s*`\$\{[^}]+\}([^`]+)`', content):
            # These are partial — skip for now, they're already counted
            pass
    return mapped


def classify_field(form_id: str, field_name: str, field_type: str, page: int) -> dict:
    """Classify a single unmapped field and generate its mapping entry."""
    entry = {
        "pdfFieldName": field_name,
        "page": page,
    }

    # Extract the short field ID (e.g., "f1_4[0]", "c1_2[0]")
    parts = field_name.split(".")
    short = parts[-1] if parts else field_name

    # Signature / preparer fields (usually last page, specific naming)
    if any(kw in field_name.lower() for kw in ["sign", "preparer", "ptin", "paid_prep"]):
        entry["manual"] = True
        entry["reason"] = "signature_or_preparer"
        return entry

    # Third-party designee
    if "designee" in field_name.lower() or "third" in field_name.lower():
        entry["manual"] = True
        entry["reason"] = "third_party_designee"
        return entry

    # Banking / direct deposit
    if any(kw in field_name.lower() for kw in ["routing", "account_num", "direct_dep"]):
        entry["manual"] = True
        entry["reason"] = "banking_info"
        return entry

    # Checkbox fields
    if field_type == "Button" or short.startswith("c"):
        entry["type"] = "checkbox"
        # Schedule B question checkboxes follow patterns like c2_1, c2_2, etc.
        m = re.match(r'c(\d+)_(\d+)', short)
        if m:
            page_num, q_num = m.group(1), m.group(2)
            entry["source"] = "scheduleBAnswer"
            entry["questionKey"] = f"p{page_num}_q{q_num}"
            entry["reason"] = "schedule_b_checkbox"
        else:
            entry["source"] = "scheduleBAnswer"
            entry["reason"] = "checkbox"
        return entry

    # Table row fields — detect repeating index patterns
    # e.g., Table_SchM-2[0].Line1[0].f5_19[0] → table row
    # e.g., Table_Assets[0].Line1[0].f4_5[0] → balance sheet row
    if "Table" in field_name:
        entry["source"] = "table_row"
        entry["reason"] = "table_structure"
        # Try to extract the table name and line
        table_match = re.search(r'Table_(\w+)\[0\]\.Line(\w+)\[0\]', field_name)
        if table_match:
            entry["table"] = table_match.group(1)
            entry["tableLine"] = table_match.group(2)
        return entry

    # Officer/shareholder table patterns (1125-E, 990 Part VII)
    if form_id in ("f1125e",) and page == 1:
        # 1125-E has 20 rows × 6 columns
        m = re.match(r'f1_(\d+)', short)
        if m:
            field_num = int(m.group(1))
            if field_num >= 3:  # After header fields
                row_idx = (field_num - 3) // 6
                col_idx = (field_num - 3) % 6
                col_names = ["name", "ssn", "percent_time", "percent_stock_common", "percent_stock_preferred", "compensation"]
                if row_idx < 20 and col_idx < len(col_names):
                    entry["source"] = "officer_array"
                    entry["rowIndex"] = row_idx
                    entry["column"] = col_names[col_idx]
                    entry["reason"] = "officer_table_row"
                    return entry

    # 8825 rental property columns (4 properties)
    if form_id == "f8825":
        # Fields are organized by property (columns A-D) and expense line
        entry["source"] = "rental_property"
        entry["reason"] = "rental_property_grid"
        return entry

    # 4797 asset sale rows
    if form_id == "f4797":
        entry["source"] = "capital_transaction"
        entry["reason"] = "asset_sale_row"
        return entry

    # 4562 depreciation table
    if form_id == "f4562":
        entry["source"] = "asset_depreciation"
        entry["reason"] = "depreciation_table"
        return entry

    # K-1 fields
    if form_id in ("f1065sk1", "f1120ssk"):
        if page == 1:
            # Part I/II header → entity/owner info
            entry["source"] = "owner_info"
            entry["reason"] = "k1_entity_owner_info"
        else:
            entry["source"] = "k1_allocation"
            entry["reason"] = "k1_distributive_share"
        return entry

    # 990 specific — large grids
    if form_id == "f990":
        if page >= 7 and page <= 9:
            entry["source"] = "np_functional_expense"
            entry["reason"] = "990_part_ix_grid"
            return entry
        if page >= 9 and page <= 10:
            entry["source"] = "np_balance_sheet"
            entry["reason"] = "990_part_x_balance"
            return entry

    # Default: blank/unmapped text field
    entry["staticValue"] = ""
    entry["reason"] = "unmapped_blank"
    return entry


def main():
    with open(INVENTORY_PATH) as f:
        inventory = json.load(f)

    existing_mapped = get_existing_mapped_fields()
    print(f"Already mapped in TS files: {len(existing_mapped)} fields")

    OUTPUT_DIR.mkdir(exist_ok=True)
    total_new = 0
    summary = {}

    for form_id, form_data in sorted(inventory.items()):
        new_entries = []
        for field in form_data["fields"]:
            fname = field["name"]
            # Skip if already mapped
            if fname in existing_mapped:
                continue
            # Also skip if a partial match exists (template literal expansion)
            short = fname.split(".")[-1]
            if any(short in mapped for mapped in existing_mapped):
                continue

            entry = classify_field(
                form_id, fname, field["type"], field["page"]
            )
            new_entries.append(entry)

        if new_entries:
            out_path = OUTPUT_DIR / f"{form_id}.json"
            with open(out_path, "w") as f:
                json.dump(new_entries, f, indent=2)

        reasons = defaultdict(int)
        for e in new_entries:
            reasons[e.get("reason", "unknown")] += 1

        summary[form_id] = {
            "total_pdf_fields": form_data["total"],
            "already_mapped": form_data["total"] - len(new_entries),
            "new_entries": len(new_entries),
            "breakdown": dict(reasons),
        }
        total_new += len(new_entries)

    # Write summary
    with open(OUTPUT_DIR / "_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\nGenerated mappings for {total_new} new fields across {len(inventory)} forms")
    print(f"\nPer-form breakdown:")
    for form_id, s in sorted(summary.items()):
        if s["new_entries"] > 0:
            print(f"  {form_id}: {s['new_entries']} new ({s['already_mapped']} already mapped)")
            for reason, count in sorted(s["breakdown"].items()):
                print(f"    {reason}: {count}")


if __name__ == "__main__":
    main()
