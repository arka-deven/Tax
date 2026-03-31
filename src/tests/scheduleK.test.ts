import { describe, it, expect } from "vitest";
import { deriveScheduleKFacts, allocateK1, SCHEDULE_K_LINES } from "../engines/ScheduleKEngine";
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

describe("ScheduleKEngine", () => {
  it("derives Schedule K facts from existing tax facts", () => {
    const existingFacts: TaxFact[] = [
      makeFact("ordinary_business_income", 250000),
      makeFact("interest_income_total", 5000),
      makeFact("dividend_income_total", 3000),
      makeFact("charitable_contributions_total", 10000),
      makeFact("nondeductible_total", 1500),
      makeFact("owner_distributions_total", 50000),
    ];

    const skFacts = deriveScheduleKFacts("e1", 2024, existingFacts);

    // Should have one fact per SCHEDULE_K_LINES entry
    expect(skFacts.length).toBe(SCHEDULE_K_LINES.length);

    // Check key values
    const byName = new Map(skFacts.map((f) => [f.fact_name, f.fact_value_json]));
    expect(byName.get("sk_ordinary_business_income")).toBe(250000);
    expect(byName.get("sk_interest_income")).toBe(5000);
    expect(byName.get("sk_ordinary_dividends")).toBe(3000);
    expect(byName.get("sk_charitable_contributions")).toBe(10000);
    expect(byName.get("sk_nondeductible_expenses")).toBe(1500);
    expect(byName.get("sk_distributions")).toBe(50000);
  });

  it("defaults to 0 when source fact is missing", () => {
    const skFacts = deriveScheduleKFacts("e1", 2024, []);
    const byName = new Map(skFacts.map((f) => [f.fact_name, f.fact_value_json]));
    expect(byName.get("sk_ordinary_business_income")).toBe(0);
    expect(byName.get("sk_section_179")).toBe(0);
  });

  it("handles expression-based derivations", () => {
    const existingFacts: TaxFact[] = [
      makeFact("gross_receipts_total", 1000000),
      makeFact("interest_income_total", 5000),
      makeFact("dividend_income_total", 2000),
    ];

    const skFacts = deriveScheduleKFacts("e1", 2024, existingFacts);
    const byName = new Map(skFacts.map((f) => [f.fact_name, f.fact_value_json]));
    // sk_foreign_gross_income = gross_receipts_total + interest_income_total + dividend_income_total
    expect(byName.get("sk_foreign_gross_income")).toBe(1007000);
  });
});

describe("K-1 Allocation", () => {
  it("allocates Schedule K totals to owners by percentage", () => {
    const skFacts: TaxFact[] = [
      { ...makeFact("sk_ordinary_business_income", 100000), fact_name: "sk_ordinary_business_income" },
      { ...makeFact("sk_interest_income", 5000), fact_name: "sk_interest_income" },
    ];

    const owners = [
      { owner_id: "o1", profit_share_pct: 60, loss_share_pct: 60 },
      { owner_id: "o2", profit_share_pct: 40, loss_share_pct: 40 },
    ];

    const k1Facts = allocateK1("e1", 2024, skFacts, owners);

    // 2 K lines × 2 owners = 4 facts
    expect(k1Facts.length).toBe(4);

    const byName = new Map(k1Facts.map((f) => [f.fact_name, f.fact_value_json]));
    expect(byName.get("k1_o1_sk_ordinary_business_income")).toBe(60000);
    expect(byName.get("k1_o2_sk_ordinary_business_income")).toBe(40000);
    expect(byName.get("k1_o1_sk_interest_income")).toBe(3000);
    expect(byName.get("k1_o2_sk_interest_income")).toBe(2000);
  });

  it("uses loss_share_pct for negative amounts", () => {
    const skFacts: TaxFact[] = [
      { ...makeFact("sk_ordinary_business_income", -50000), fact_name: "sk_ordinary_business_income" },
    ];

    const owners = [
      { owner_id: "o1", profit_share_pct: 60, loss_share_pct: 80 },
      { owner_id: "o2", profit_share_pct: 40, loss_share_pct: 20 },
    ];

    const k1Facts = allocateK1("e1", 2024, skFacts, owners);
    const byName = new Map(k1Facts.map((f) => [f.fact_name, f.fact_value_json]));

    // Negative amount uses loss_share_pct
    expect(byName.get("k1_o1_sk_ordinary_business_income")).toBe(-40000); // -50000 × 80%
    expect(byName.get("k1_o2_sk_ordinary_business_income")).toBe(-10000); // -50000 × 20%
  });

  it("handles single owner at 100%", () => {
    const skFacts: TaxFact[] = [
      { ...makeFact("sk_ordinary_business_income", 200000), fact_name: "sk_ordinary_business_income" },
    ];

    const owners = [
      { owner_id: "sole", profit_share_pct: 100, loss_share_pct: 100 },
    ];

    const k1Facts = allocateK1("e1", 2024, skFacts, owners);
    expect(k1Facts[0].fact_value_json).toBe(200000);
  });
});
