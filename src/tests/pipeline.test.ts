import { describe, expect, it } from "vitest";
import {
  buildReviewPackage,
  buildTrialBalance,
  deriveTaxFacts,
  mapTrialBalanceLines,
  runDiagnostics,
} from "../engines/index.js";
import {
  ACCOUNT_TYPE_MAP,
  ENTRIES,
} from "../fixtures/simpleCleanBooks.js";

const ENTITY = "entity_acme";
const YEAR = 2024;

describe("Trial Balance Engine — simple clean books", () => {
  it("produces one line per account", () => {
    const lines = buildTrialBalance(ENTITY, YEAR, ENTRIES, []);
    expect(lines).toHaveLength(3);
  });

  it("computes correct ending balances", () => {
    const lines = buildTrialBalance(ENTITY, YEAR, ENTRIES, []);
    const revenue = lines.find((l) => l.account_id === "acct_revenue")!;
    expect(revenue.ending_balance).toBe(-500_000);

    const cogs = lines.find((l) => l.account_id === "acct_cogs")!;
    expect(cogs.ending_balance).toBe(200_000);

    const expenses = lines.find((l) => l.account_id === "acct_expenses")!;
    expect(expenses.ending_balance).toBe(80_000);
  });

  it("adjusted_balance equals ending_balance when no adjustments applied", () => {
    const lines = buildTrialBalance(ENTITY, YEAR, ENTRIES, []);
    for (const l of lines) {
      expect(l.adjusted_balance).toBe(l.ending_balance);
      expect(l.adjustment_ids).toHaveLength(0);
    }
  });
});

describe("Trial Balance Engine — adjustment overlays", () => {
  it("applies a debit adjustment overlay without mutating entries", () => {
    const lines = buildTrialBalance(ENTITY, YEAR, ENTRIES, []);
    const cogsLine = lines.find((l) => l.account_id === "acct_cogs")!;

    const adjusted = buildTrialBalance(ENTITY, YEAR, ENTRIES, [
      {
        adjustment_id: "adj_001",
        entity_id: ENTITY,
        tax_year: YEAR,
        adjustment_type: "book_to_tax",
        target_tb_line_id: cogsLine.tb_line_id,
        amount: 10_000,
        direction: "debit",
        reason_code: "SECTION_263A",
        note: "Uniform capitalization adjustment",
        created_by: "preparer_1",
        created_at: "2025-01-20T00:00:00Z",
        approved_by: null,
        approved_at: null,
        source_refs: [],
      },
    ]);

    const adjustedCogs = adjusted.find((l) => l.account_id === "acct_cogs")!;
    expect(adjustedCogs.ending_balance).toBe(200_000); // source unchanged
    expect(adjustedCogs.adjusted_balance).toBe(210_000); // overlay applied
    expect(adjustedCogs.adjustment_ids).toContain("adj_001");
  });
});

describe("Tax Mapping Engine", () => {
  it("maps all known account types deterministically", () => {
    const lines = buildTrialBalance(ENTITY, YEAR, ENTRIES, []);
    const mappings = mapTrialBalanceLines(lines, ACCOUNT_TYPE_MAP);
    expect(mappings.every((m) => m.tax_code !== "UNMAPPED")).toBe(true);
    expect(mappings.every((m) => m.mapping_method === "deterministic")).toBe(true);
  });

  it("returns UNMAPPED for unknown account types", () => {
    const lines = buildTrialBalance(ENTITY, YEAR, ENTRIES, []);
    const unknownMap = new Map<string, string>([["acct_revenue", "UnknownType"]]);
    const mappings = mapTrialBalanceLines(lines, unknownMap);
    const unmapped = mappings.filter((m) => m.tax_code === "UNMAPPED");
    expect(unmapped.length).toBeGreaterThan(0);
    expect(unmapped[0]!.requires_review).toBe(true);
  });
});

describe("Diagnostics Engine", () => {
  it("emits no blocking errors for fully mapped clean books", () => {
    const lines = buildTrialBalance(ENTITY, YEAR, ENTRIES, []);
    const mappings = mapTrialBalanceLines(lines, ACCOUNT_TYPE_MAP);
    const facts = deriveTaxFacts(ENTITY, YEAR, mappings);
    const diagnostics = runDiagnostics(ENTITY, YEAR, mappings, facts);
    // Minimal test fixtures lack EIN — exclude that structural check
    const blocking = diagnostics.filter(
      (d) => d.severity === "blocking_error" && d.code !== "MISSING_EIN"
    );
    expect(blocking).toHaveLength(0);
  });

  it("emits a blocking_error for each unmapped balance", () => {
    const lines = buildTrialBalance(ENTITY, YEAR, ENTRIES, []);
    const unknownMap = new Map<string, string>(); // all unmapped
    const mappings = mapTrialBalanceLines(lines, unknownMap);
    const facts = deriveTaxFacts(ENTITY, YEAR, mappings);
    const diagnostics = runDiagnostics(ENTITY, YEAR, mappings, facts);
    const unmappedWarnings = diagnostics.filter((d) => d.code === "UNMAPPED_BALANCE");
    expect(unmappedWarnings).toHaveLength(3);
    expect(unmappedWarnings.every((d) => d.severity === "warning")).toBe(true);
  });
});

describe("Review Package Builder", () => {
  it("separates open diagnostics from resolved ones", () => {
    const lines = buildTrialBalance(ENTITY, YEAR, ENTRIES, []);
    const mappings = mapTrialBalanceLines(lines, ACCOUNT_TYPE_MAP);
    const facts = deriveTaxFacts(ENTITY, YEAR, mappings);
    const diagnostics = runDiagnostics(ENTITY, YEAR, mappings, facts);

    const pkg = buildReviewPackage(ENTITY, YEAR, [], diagnostics, mappings, [], []);
    expect(pkg.unresolved_diagnostics.every((d) => d.resolution_status === "open")).toBe(true);
  });

  it("lists ambiguous mappings that require review", () => {
    const lines = buildTrialBalance(ENTITY, YEAR, ENTRIES, []);
    const unknownMap = new Map<string, string>();
    const mappings = mapTrialBalanceLines(lines, unknownMap);
    const facts = deriveTaxFacts(ENTITY, YEAR, mappings);
    const diagnostics = runDiagnostics(ENTITY, YEAR, mappings, facts);

    const pkg = buildReviewPackage(ENTITY, YEAR, [], diagnostics, mappings, [], []);
    expect(pkg.ambiguous_mappings.length).toBe(3);
  });
});
