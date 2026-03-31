import { describe, it, expect } from "vitest";
import {
  activeTaxYear,
  availableTaxYears,
  isNewYearUnlocked,
} from "@/lib/taxYear";

describe("activeTaxYear", () => {
  it("returns Y-1 for Jan 1", () => {
    expect(activeTaxYear(new Date(2026, 0, 1))).toBe(2025);
  });

  it("returns Y-1 for June 15", () => {
    expect(activeTaxYear(new Date(2026, 5, 15))).toBe(2025);
  });

  it("returns Y-1 for Dec 31", () => {
    expect(activeTaxYear(new Date(2026, 11, 31))).toBe(2025);
  });

  it("boundary: Dec 31 2026 → 2025; Jan 1 2027 → 2026", () => {
    expect(activeTaxYear(new Date(2026, 11, 31))).toBe(2025);
    expect(activeTaxYear(new Date(2027, 0, 1))).toBe(2026);
  });

  it("defaults to today when no arg", () => {
    const result = activeTaxYear();
    expect(result).toBe(new Date().getFullYear() - 1);
  });
});

describe("availableTaxYears", () => {
  it("returns only years with status=available", () => {
    const rows = [
      { tax_year: 2024, status: "available" },
      { tax_year: 2023, status: "available" },
      { tax_year: 2022, status: "failed" },
      { tax_year: 2025, status: "pending" },
    ];
    expect(availableTaxYears(rows)).toEqual([2023, 2024]);
  });

  it("returns empty for no rows", () => {
    expect(availableTaxYears([])).toEqual([]);
  });

  it("returns empty when no available status", () => {
    expect(availableTaxYears([{ tax_year: 2024, status: "pending" }])).toEqual(
      []
    );
  });

  it("deduplicates", () => {
    const rows = [
      { tax_year: 2024, status: "available" },
      { tax_year: 2024, status: "available" },
    ];
    expect(availableTaxYears(rows)).toEqual([2024]);
  });
});

describe("isNewYearUnlocked", () => {
  it("returns true when year has available row", () => {
    expect(
      isNewYearUnlocked(2024, [{ tax_year: 2024, status: "available" }])
    ).toBe(true);
  });

  it("returns false when year has no available row", () => {
    expect(
      isNewYearUnlocked(2024, [{ tax_year: 2024, status: "pending" }])
    ).toBe(false);
  });

  it("returns false when year not in rows", () => {
    expect(
      isNewYearUnlocked(2025, [{ tax_year: 2024, status: "available" }])
    ).toBe(false);
  });

  it("new year tab does not appear until sync complete", () => {
    // Simulate: 2025 not yet synced
    const rows = [
      { tax_year: 2024, status: "available" },
      { tax_year: 2025, status: "pending" },
    ];
    expect(availableTaxYears(rows)).toEqual([2024]);
    expect(isNewYearUnlocked(2025, rows)).toBe(false);

    // After sync completes
    rows.push({ tax_year: 2025, status: "available" });
    expect(availableTaxYears(rows)).toEqual([2024, 2025]);
    expect(isNewYearUnlocked(2025, rows)).toBe(true);
  });
});
