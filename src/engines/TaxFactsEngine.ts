import type { TaxCodeMapping, TaxFact, TrialBalanceLine } from "../models/index.js";

/**
 * Derives TaxFacts from mapped + adjusted trial balance lines.
 * The rule engine must only consume TaxFacts — never raw account names or ledger entries.
 */
export function deriveTaxFacts(
  entityId: string,
  taxYear: number,
  mappings: TaxCodeMapping[],
  tbLines: TrialBalanceLine[] = []
): TaxFact[] {
  const facts: TaxFact[] = [];

  // Build a quick lookup: tb_line_id → adjusted_balance
  const balanceByLine = new Map<string, number>(
    tbLines.map((l) => [l.tb_line_id, l.adjusted_balance])
  );

  // Helper: sum adjusted balances for all mappings matching a semantic category
  function sumCategory(category: string): { total: number; mappingIds: string[] } {
    const matched = mappings.filter((m) => m.semantic_category === category);
    const total = matched.reduce((acc, m) => {
      const balance = balanceByLine.get(m.tb_line_id) ?? 0;
      // Revenue accounts carry a credit (negative debit-basis) balance — take absolute value
      return acc + Math.abs(balance);
    }, 0);
    return { total, mappingIds: matched.map((m) => m.mapping_id) };
  }

  function fact(
    name: string,
    value: unknown,
    valueType: TaxFact["value_type"],
    mappingIds: string[],
    explanation: string,
    confidence = 0.9
  ): TaxFact {
    return {
      tax_fact_id: `fact_${entityId}_${taxYear}_${name}`,
      entity_id: entityId,
      tax_year: taxYear,
      fact_name: name,
      fact_value_json: value,
      value_type: valueType,
      confidence_score: confidence,
      is_unknown: false,
      derived_from_mapping_ids: mappingIds,
      derived_from_adjustment_ids: [],
      explanation,
    };
  }

  // ── Core income/expense facts ─────────────────────────────────────────────

  const grossReceipts = sumCategory("gross_receipts");
  facts.push(fact(
    "gross_receipts_total",
    grossReceipts.total,
    "number",
    grossReceipts.mappingIds,
    "Sum of all gross_receipts mappings"
  ));

  const cogs = sumCategory("cost_of_goods_sold");
  facts.push(fact(
    "cogs_total",
    cogs.total,
    "number",
    cogs.mappingIds,
    "Sum of all cost_of_goods_sold mappings"
  ));

  const meals = sumCategory("meals_entertainment");
  facts.push(fact(
    "meals_subject_to_limitation_total",
    meals.total,
    "number",
    meals.mappingIds,
    "Meals expense subject to 50% IRC §274(n) limitation"
  ));

  const charitable = sumCategory("charitable_contributions");
  facts.push(fact(
    "charitable_contributions_total",
    charitable.total,
    "number",
    charitable.mappingIds,
    "Sum of charitable contribution mappings"
  ));

  const officerComp = sumCategory("officer_compensation");
  facts.push(fact(
    "officer_compensation_total",
    officerComp.total,
    "number",
    officerComp.mappingIds,
    "Sum of officer compensation mappings"
  ));

  const depreciation = sumCategory("depreciation");
  const hasDepreciableAssets = depreciation.total > 0;
  facts.push(fact(
    "has_depreciable_assets",
    hasDepreciableAssets,
    "boolean",
    depreciation.mappingIds,
    "True when depreciation expense is present in the trial balance"
  ));

  const foreignIncome = sumCategory("foreign_income");
  const foreignExpense = sumCategory("foreign_expense");
  const hasForeignActivity = foreignIncome.total > 0 || foreignExpense.total > 0;
  facts.push(fact(
    "foreign_activity_present",
    hasForeignActivity,
    "boolean",
    [...foreignIncome.mappingIds, ...foreignExpense.mappingIds],
    "True when any foreign income or expense is mapped"
  ));

  const rentIncome = sumCategory("rent_income");
  facts.push(fact(
    "rental_income_present",
    rentIncome.total > 0,
    "boolean",
    rentIncome.mappingIds,
    "True when rental income is present"
  ));

  const interestIncome = sumCategory("interest_income");
  facts.push(fact(
    "interest_income_total",
    interestIncome.total,
    "number",
    interestIncome.mappingIds,
    "Sum of interest income mappings"
  ));

  const dividendIncome = sumCategory("dividend_income");
  facts.push(fact(
    "dividend_income_total",
    dividendIncome.total,
    "number",
    dividendIncome.mappingIds,
    "Sum of dividend income mappings"
  ));

  // ── Derived facts ─────────────────────────────────────────────────────────

  const netIncome = grossReceipts.total - cogs.total;
  facts.push(fact(
    "net_income_before_tax",
    netIncome,
    "number",
    [...grossReceipts.mappingIds, ...cogs.mappingIds],
    "Gross receipts minus cost of goods sold"
  ));

  const unmappedCount = mappings.filter((m) => m.tax_code === "UNMAPPED").length;
  facts.push(fact(
    "unmapped_account_count",
    unmappedCount,
    "number",
    mappings.filter((m) => m.tax_code === "UNMAPPED").map((m) => m.mapping_id),
    "Number of trial balance lines with no tax mapping",
    unmappedCount === 0 ? 1.0 : 0.5
  ));

  return facts;
}
