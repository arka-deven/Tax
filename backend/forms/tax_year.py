"""Tax year utilities — shared logic for year detection and availability."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any


def active_tax_year(today: date | None = None) -> int:
    """Return the active tax year based on today's date.

    Rule: if today is any date in year Y, the active tax year is Y - 1.
    Example: any date in 2026 → returns 2025.
    """
    if today is None:
        today = date.today()
    return today.year - 1


def available_tax_years(sync_rows: list[dict[str, Any]]) -> list[int]:
    """Return years that have forms marked available in the DB.

    *sync_rows* is a list of dicts from ``forms_sync_status`` with at
    least ``tax_year`` and ``status`` keys.
    """
    years: set[int] = set()
    for row in sync_rows:
        if row.get("status") == "available":
            years.add(int(row["tax_year"]))
    return sorted(years)


def is_new_year_unlocked(
    year: int, sync_rows: list[dict[str, Any]]
) -> bool:
    """A year is unlocked if the DB has at least one row for that year
    with ``status='available'``.
    """
    for row in sync_rows:
        if int(row.get("tax_year", 0)) == year and row.get("status") == "available":
            return True
    return False
