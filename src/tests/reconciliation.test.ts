import { describe, it, expect } from "vitest";
import { deriveM1Facts, deriveM2Facts, M1_LINES, M2_LINES } from "../engines/ReconciliationEngine";
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

describe("M-1 Reconciliation", () => {
  it("derives M-1 facts from existing tax facts", () => {
    const existing: TaxFact[] = [
      makeFact("ordinary_business_income", 150000),
      makeFact("income_tax_expense_total", 5000),
      makeFact("meals_subject_to_limitation_total", 8000),
      makeFact("nondeductible_total", 2000),
    ];

    const m1Facts = deriveM1Facts("e1", 2024, existing);
    const byName = new Map(m1Facts.map((f) => [f.fact_name, f.fact_value_json]));

    // Line 1: Net income per books = ordinary_business_income
    expect(byName.get("m1_net_income_per_books")).toBe(150000);

    // Line 2: Federal income tax = income_tax_expense_total
    expect(byName.get("m1_federal_income_tax")).toBe(5000);

    // Line 5c: 50% of meals = 8000 * 0.50 = 4000
    expect(byName.get("m1_travel_entertainment_book")).toBe(4000);

    // Line 5a: Nondeductible expenses
    expect(byName.get("m1_expenses_on_books_not_return")).toBe(2000);
  });

  it("computes left total and income per return", () => {
    const existing: TaxFact[] = [
      makeFact("ordinary_business_income", 100000),
      makeFact("income_tax_expense_total", 0),
      makeFact("meals_subject_to_limitation_total", 0),
      makeFact("nondeductible_total", 0),
    ];

    const m1Facts = deriveM1Facts("e1", 2024, existing);
    const byName = new Map(m1Facts.map((f) => [f.fact_name, f.fact_value_json]));

    // Left total = sum of left-side lines
    expect(byName.get("m1_left_total")).toBe(100000);

    // Right total = 0 (no adjustments)
    expect(byName.get("m1_right_total")).toBe(0);

    // Income per return = left - right
    expect(byName.get("m1_income_per_return")).toBe(100000);
  });

  it("produces all M-1 line facts plus totals", () => {
    const m1Facts = deriveM1Facts("e1", 2024, []);
    // Should have all M1_LINES + left_total + right_total + income_per_return
    expect(m1Facts.length).toBe(M1_LINES.length + 3);
  });
});

describe("M-2 AAA Reconciliation", () => {
  it("computes M-2 EOY balance correctly", () => {
    const current: TaxFact[] = [
      makeFact("sk_ordinary_business_income", 200000),
      makeFact("sk_tax_exempt_interest", 1000),
      makeFact("owner_distributions_total", 80000),
      makeFact("sk_nondeductible_expenses", 3000),
    ];

    const prior: TaxFact[] = [
      makeFact("m2_eoy_balance", 100000), // last year's ending = this year's beginning
    ];

    const m2Facts = deriveM2Facts("e1", 2024, current, prior);
    const byName = new Map(m2Facts.map((f) => [f.fact_name, f.fact_value_json]));

    // BOY = prior year EOY = 100000
    expect(byName.get("m2_boy_balance")).toBe(100000);

    // Line 2: ordinary income = 200000
    expect(byName.get("m2_ordinary_income")).toBe(200000);

    // Line 3: other additions = 1000
    expect(byName.get("m2_other_additions")).toBe(1000);

    // Line 4: loss = 0 (income is positive)
    expect(byName.get("m2_loss")).toBe(0);

    // Line 5a: distributions = 80000
    expect(byName.get("m2_distributions_cash")).toBe(80000);

    // Line 6: other reductions = 3000
    expect(byName.get("m2_other_reductions")).toBe(3000);

    // Line 7: EOY = 100000 + 200000 + 1000 - 0 - 80000 - 0 - 3000 = 218000
    expect(byName.get("m2_eoy_balance")).toBe(218000);
  });

  it("handles loss year (negative ordinary income)", () => {
    const current: TaxFact[] = [
      makeFact("sk_ordinary_business_income", -50000),
      makeFact("owner_distributions_total", 0),
    ];

    const prior: TaxFact[] = [
      makeFact("m2_eoy_balance", 75000),
    ];

    const m2Facts = deriveM2Facts("e1", 2024, current, prior);
    const byName = new Map(m2Facts.map((f) => [f.fact_name, f.fact_value_json]));

    // Line 2: ordinary income = 0 (loss goes to line 4)
    expect(byName.get("m2_ordinary_income")).toBe(0);

    // Line 4: loss = 50000
    expect(byName.get("m2_loss")).toBe(50000);

    // EOY = 75000 + 0 + 0 - 50000 - 0 - 0 - 0 = 25000
    expect(byName.get("m2_eoy_balance")).toBe(25000);
  });

  it("defaults BOY to 0 when no prior year data", () => {
    const m2Facts = deriveM2Facts("e1", 2024, [], []);
    const byName = new Map(m2Facts.map((f) => [f.fact_name, f.fact_value_json]));
    expect(byName.get("m2_boy_balance")).toBe(0);
  });
});
