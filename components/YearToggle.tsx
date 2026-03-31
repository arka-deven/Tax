"use client";

import { activeTaxYear, availableTaxYears } from "@/lib/taxYear";

interface SyncRow {
  tax_year: number;
  status: string;
}

interface YearToggleProps {
  syncRows: SyncRow[];
  selectedYear: number;
  onYearChange: (year: number) => void;
}

/**
 * Data-driven year toggle tabs. Tabs only render for years with
 * status="available" in the DB. No manual wiring needed.
 */
export default function YearToggle({
  syncRows,
  selectedYear,
  onYearChange,
}: YearToggleProps) {
  const years = availableTaxYears(syncRows);

  if (years.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No tax years available. Run a form sync to get started.
      </div>
    );
  }

  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1" role="tablist">
      {years.map((year) => (
        <button
          key={year}
          role="tab"
          aria-selected={year === selectedYear}
          onClick={() => onYearChange(year)}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            year === selectedYear
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          TY {year}
        </button>
      ))}
    </div>
  );
}
