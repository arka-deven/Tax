import { describe, it, expect } from "vitest";
import { deriveBOYFacts, deriveTotalFacts, SCHEDULE_L_LINES } from "../engines/BalanceSheetEngine";
import type { TaxFact } from "../models/index";

function makeFact(name: string, value: number): TaxFact {
  return {
    tax_fact_id: `test_${name}`,
    entity_id: "e1",
    tax_year: 2024,
    fact_name: name,
    fact_value_json: value,
    value_type: "number",
    confidence_score: 0.9,
    is_unknown: false,
    derived_from_mapping_ids: [],
    derived_from_adjustment_ids: [],
    explanation: "test",
  };
}

describe("BalanceSheetEngine — BOY derivation", () => {
  it("derives BOY facts from prior year EOY values", () => {
    const priorYearFacts: TaxFact[] = [
      makeFact("cash_total", 50000),
      makeFact("accounts_receivable_total", 25000),
      makeFact("inventory_total", 10000),
    ];

    const boyFacts = deriveBOYFacts("e1", 2025, priorYearFacts);

    const byName = new Map(boyFacts.map((f) => [f.fact_name, f.fact_value_json]));
    expect(byName.get("boy_cash_total")).toBe(50000);
    expect(byName.get("boy_accounts_receivable_total")).toBe(25000);
    expect(byName.get("boy_inventory_total")).toBe(10000);
  });

  it("defaults to 0 when prior year fact is missing", () => {
    const boyFacts = deriveBOYFacts("e1", 2025, []);
    const byName = new Map(boyFacts.map((f) => [f.fact_name, f.fact_value_json]));
    expect(byName.get("boy_cash_total")).toBe(0);
    expect(byName.get("boy_accounts_receivable_total")).toBe(0);
  });

  it("produces one BOY fact per Schedule L line", () => {
    const boyFacts = deriveBOYFacts("e1", 2025, []);
    expect(boyFacts.length).toBe(SCHEDULE_L_LINES.length);
  });
});

describe("BalanceSheetEngine — totals", () => {
  it("computes total assets EOY", () => {
    const facts: TaxFact[] = [
      makeFact("cash_total", 50000),
      makeFact("accounts_receivable_total", 25000),
      makeFact("allowance_bad_debts_total", -2000),
      makeFact("inventory_total", 10000),
      makeFact("buildings_depreciable_total", 100000),
      makeFact("accum_depreciation_total", -30000),
    ];

    const totals = deriveTotalFacts("e1", 2024, facts);
    const byName = new Map(totals.map((f) => [f.fact_name, f.fact_value_json]));

    // Total assets = 50000 + 25000 + (-2000) + 10000 + 100000 + (-30000) = 153000
    const totalAssets = byName.get("total_assets_eoy");
    expect(totalAssets).toBe(153000);
  });

  it("handles empty facts gracefully", () => {
    const totals = deriveTotalFacts("e1", 2024, []);
    const byName = new Map(totals.map((f) => [f.fact_name, f.fact_value_json]));
    expect(byName.get("total_assets_eoy")).toBe(0);
    expect(byName.get("boy_total_assets")).toBe(0);
  });
});
