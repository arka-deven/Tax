import { describe, it, expect } from "vitest";
import { runFullPipeline } from "../engines/PipelineOrchestrator";
import type { TaxCodeMapping, TrialBalanceLine } from "../models/index";

/**
 * End-to-end pipeline test — synthetic QBO data through all engines.
 * Verifies that the full pipeline produces facts for every schedule.
 */

// Synthetic trial balance lines for an S-Corp
function makeTBLine(id: string, balance: number): TrialBalanceLine {
  return {
    tb_line_id: id,
    entity_id: "e1",
    account_id: `acct_${id}`,
    tax_year: 2024,
    beginning_balance: 0,
    activity_debits: balance > 0 ? balance : 0,
    activity_credits: balance < 0 ? Math.abs(balance) : 0,
    ending_balance: balance,
    adjusted_balance: balance,
    adjustment_ids: [],
    source_refs: [],
  };
}

function makeMapping(
  tbLineId: string,
  category: string,
  taxCode: string,
): TaxCodeMapping {
  return {
    mapping_id: `map_${tbLineId}`,
    tb_line_id: tbLineId,
    entity_id: "e1",
    tax_year: 2024,
    semantic_category: category,
    tax_code: taxCode,
    target_form: "1120-S",
    target_schedule: null,
    target_line: "",
    mapping_method: "deterministic",
    confidence_score: 0.95,
    requires_review: false,
    review_reason_code: null,
    explanation: "test",
    source_refs: [],
  };
}

describe("Full Pipeline — S-Corp", () => {
  const tbLines: TrialBalanceLine[] = [
    makeTBLine("sales", -500000),       // credit balance (income)
    makeTBLine("cogs", 150000),         // debit balance (expense)
    makeTBLine("wages", 80000),
    makeTBLine("rent", 24000),
    makeTBLine("depreciation", 15000),
    makeTBLine("interest_exp", 5000),
    makeTBLine("cash", 120000),         // asset
    makeTBLine("ar", 45000),            // asset
    makeTBLine("equipment", 200000),    // fixed asset
    makeTBLine("accum_depr", -60000),   // contra asset
    makeTBLine("ap", -25000),           // liability (credit)
    makeTBLine("equity", -100000),      // equity (credit)
    makeTBLine("retained", -50000),     // retained earnings (credit)
    makeTBLine("distributions", 30000), // distribution (debit)
  ];

  const mappings: TaxCodeMapping[] = [
    makeMapping("sales", "gross_receipts", "GROSS_RECEIPTS"),
    makeMapping("cogs", "cost_of_goods_sold", "COGS"),
    makeMapping("wages", "wages", "WAGES"),
    makeMapping("rent", "rent_expense", "RENT_BUILDING"),
    makeMapping("depreciation", "depreciation", "DEPRECIATION"),
    makeMapping("interest_exp", "interest_expense", "INTEREST_EXPENSE"),
    makeMapping("cash", "cash", "CASH"),
    makeMapping("ar", "accounts_receivable", "ACCOUNTS_RECEIVABLE"),
    makeMapping("equipment", "fixed_assets", "FIXED_ASSET"),
    makeMapping("accum_depr", "accum_depreciation", "ACCUM_DEPRECIATION"),
    makeMapping("ap", "accounts_payable", "ACCOUNTS_PAYABLE"),
    makeMapping("equity", "equity", "EQUITY"),
    makeMapping("retained", "retained_earnings", "RETAINED_EARNINGS"),
    makeMapping("distributions", "equity", "OWNER_DISTRIBUTIONS"),
  ];

  const owners = [
    { owner_id: "o1", profit_share_pct: 60, loss_share_pct: 60 },
    { owner_id: "o2", profit_share_pct: 40, loss_share_pct: 40 },
  ];

  it("produces facts from all 7 engines", () => {
    const result = runFullPipeline({
      entityId: "e1",
      taxYear: 2024,
      mappings,
      tbLines,
      owners,
      priorYearFacts: [],
    });

    expect(result.counts.core).toBeGreaterThan(40);
    expect(result.counts.scheduleK).toBeGreaterThan(20);
    expect(result.counts.k1).toBeGreaterThan(0);
    expect(result.counts.balanceSheetBOY).toBeGreaterThan(20);
    expect(result.counts.balanceSheetTotals).toBeGreaterThan(0);
    expect(result.counts.m1).toBeGreaterThan(5);
    expect(result.counts.m2).toBeGreaterThan(5);
  });

  it("core income facts are correct", () => {
    const result = runFullPipeline({
      entityId: "e1", taxYear: 2024, mappings, tbLines, owners, priorYearFacts: [],
    });
    const facts = new Map(result.allFacts.map((f) => [f.fact_name, f.fact_value_json]));

    expect(facts.get("gross_receipts_total")).toBe(500000);
    expect(facts.get("cogs_total")).toBe(150000);
    expect(facts.get("wages_total")).toBe(80000);
    expect(facts.get("depreciation_total")).toBe(15000);
  });

  it("balance sheet facts are populated", () => {
    const result = runFullPipeline({
      entityId: "e1", taxYear: 2024, mappings, tbLines, owners, priorYearFacts: [],
    });
    const facts = new Map(result.allFacts.map((f) => [f.fact_name, f.fact_value_json]));

    expect(facts.get("cash_total")).toBe(120000);
    expect(facts.get("accounts_receivable_total")).toBe(45000);
    expect(facts.get("buildings_depreciable_total")).toBe(200000);
    expect(facts.get("accum_depreciation_total")).toBe(-60000);
  });

  it("Schedule K facts are derived", () => {
    const result = runFullPipeline({
      entityId: "e1", taxYear: 2024, mappings, tbLines, owners, priorYearFacts: [],
    });
    const facts = new Map(result.allFacts.map((f) => [f.fact_name, f.fact_value_json]));

    // sk_ordinary_business_income comes from ordinary_business_income
    const skOBI = facts.get("sk_ordinary_business_income");
    expect(skOBI).toBeDefined();
    expect(typeof skOBI).toBe("number");
  });

  it("K-1 allocations are produced for each owner", () => {
    const result = runFullPipeline({
      entityId: "e1", taxYear: 2024, mappings, tbLines, owners, priorYearFacts: [],
    });
    const facts = new Map(result.allFacts.map((f) => [f.fact_name, f.fact_value_json]));

    // Owner 1 gets 60% of Schedule K ordinary income
    const k1O1 = facts.get("k1_o1_sk_ordinary_business_income");
    const k1O2 = facts.get("k1_o2_sk_ordinary_business_income");
    expect(k1O1).toBeDefined();
    expect(k1O2).toBeDefined();
    // 60% + 40% = 100% of Schedule K ordinary income
    expect(Number(k1O1) + Number(k1O2)).toBeCloseTo(
      Number(facts.get("sk_ordinary_business_income")),
      2,
    );
  });

  it("M-1 reconciliation produces all expected facts", () => {
    const result = runFullPipeline({
      entityId: "e1", taxYear: 2024, mappings, tbLines, owners, priorYearFacts: [],
    });
    const factNames = new Set(result.allFacts.map((f) => f.fact_name));

    expect(factNames.has("m1_net_income_per_books")).toBe(true);
    expect(factNames.has("m1_left_total")).toBe(true);
    expect(factNames.has("m1_right_total")).toBe(true);
    expect(factNames.has("m1_income_per_return")).toBe(true);
  });

  it("M-2 equity analysis produces BOY through EOY", () => {
    const result = runFullPipeline({
      entityId: "e1", taxYear: 2024, mappings, tbLines, owners, priorYearFacts: [],
    });
    const factNames = new Set(result.allFacts.map((f) => f.fact_name));

    expect(factNames.has("m2_boy_balance")).toBe(true);
    expect(factNames.has("m2_ordinary_income")).toBe(true);
    expect(factNames.has("m2_distributions_cash")).toBe(true);
    expect(factNames.has("m2_eoy_balance")).toBe(true);
  });

  it("total fact count exceeds 150 (full pipeline coverage)", () => {
    const result = runFullPipeline({
      entityId: "e1", taxYear: 2024, mappings, tbLines, owners, priorYearFacts: [],
    });
    expect(result.allFacts.length).toBeGreaterThan(150);
  });
});
