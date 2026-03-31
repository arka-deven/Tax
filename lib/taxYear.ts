/**
 * Tax year utilities — shared logic for year detection and availability.
 * Mirrors backend/forms/tax_year.py exactly.
 */

/**
 * Return the active tax year based on today's date.
 * Rule: if today is any date in year Y, the active tax year is Y - 1.
 * Example: any date in 2026 → returns 2025.
 */
export function activeTaxYear(today?: Date): number {
  const d = today ?? new Date();
  return d.getFullYear() - 1;
}

interface SyncRow {
  tax_year: number;
  status: string;
}

/**
 * Return years that have forms marked "available" in the DB.
 */
export function availableTaxYears(syncRows: SyncRow[]): number[] {
  const years = new Set<number>();
  for (const row of syncRows) {
    if (row.status === "available") {
      years.add(row.tax_year);
    }
  }
  return Array.from(years).sort((a, b) => a - b);
}

/**
 * A year is unlocked if the DB has at least one row for that year
 * with status="available".
 */
export function isNewYearUnlocked(year: number, syncRows: SyncRow[]): boolean {
  return syncRows.some(
    (row) => row.tax_year === year && row.status === "available"
  );
}
