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

  // ── Granular expense facts (keyed by tax_code for per-line form population) ─

  function sumByTaxCode(code: string): { total: number; mappingIds: string[] } {
    const matched = mappings.filter((m) => m.tax_code === code);
    const total = matched.reduce((acc, m) => {
      const balance = balanceByLine.get(m.tb_line_id) ?? 0;
      return acc + Math.abs(balance);
    }, 0);
    return { total, mappingIds: matched.map((m) => m.mapping_id) };
  }

  const taxCodeFacts: [string, string, string][] = [
    ["advertising_total",         "ADVERTISING",         "Sum of advertising expense mappings"],
    ["wages_total",               "WAGES",               "Sum of wages / payroll mappings"],
    ["rent_building_total",       "RENT_BUILDING",       "Sum of building rent mappings"],
    ["rent_equipment_total",      "RENT_EQUIPMENT",      "Sum of equipment rent mappings"],
    ["insurance_total",           "INSURANCE",           "Sum of insurance mappings"],
    ["professional_fees_total",   "PROFESSIONAL_FEES",   "Sum of legal / professional fee mappings"],
    ["office_expense_total",      "OFFICE_EXPENSE",      "Sum of office / admin expense mappings"],
    ["utilities_total",           "UTILITIES",           "Sum of utility mappings"],
    ["repairs_total",             "REPAIRS",             "Sum of repairs & maintenance mappings"],
    ["travel_total",              "TRAVEL",              "Sum of travel expense mappings"],
    ["taxes_licenses_total",      "TAXES_LICENSES",      "Sum of taxes & licenses mappings"],
    ["interest_expense_total",    "INTEREST_EXPENSE",    "Sum of interest expense mappings"],
    ["depreciation_total",        "DEPRECIATION",        "Sum of depreciation expense mappings"],
    ["amortization_total",        "AMORTIZATION",        "Sum of amortization expense mappings"],
    ["bad_debt_total",            "BAD_DEBT",            "Sum of bad debt expense mappings"],
    ["commission_total",          "COMMISSION",          "Sum of commissions & fees mappings"],
    ["general_deduction_total",   "GENERAL_DEDUCTION",   "Sum of other / general deduction mappings"],
    ["other_income_total",        "OTHER_INCOME",        "Sum of other income mappings"],
    ["nondeductible_total",       "NONDEDUCTIBLE",       "Sum of nondeductible expense mappings"],
    ["income_tax_expense_total",  "INCOME_TAX_NONDEDUCTIBLE", "Sum of federal income tax (nondeductible) per books"],
  ];

  for (const [name, code, explanation] of taxCodeFacts) {
    const s = sumByTaxCode(code);
    facts.push(fact(name, s.total, "number", s.mappingIds, explanation));
  }

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

  // has_asset_sales — true when any capital gain/loss or asset-sale mapping is present with a non-zero balance
  const assetSaleMappings = mappings.filter(
    (m) => m.semantic_category === "capital_gain_loss" || m.semantic_category === "fixed_assets"
  );
  const hasAssetSales = assetSaleMappings.some((m) => {
    const balance = balanceByLine.get(m.tb_line_id) ?? 0;
    return Math.abs(balance) > 0;
  });
  facts.push(fact(
    "has_asset_sales",
    hasAssetSales,
    "boolean",
    assetSaleMappings.map((m) => m.mapping_id),
    "True when capital gain/loss or fixed asset disposal balances are present in the trial balance"
  ));

  // total_assets — sum of all asset-category balances (used for M-1 vs M-3 threshold)
  const assetMappings = mappings.filter(
    (m) =>
      m.semantic_category === "fixed_assets" ||
      m.semantic_category === "equity" ||
      m.semantic_category === "retained_earnings"
  );
  const totalAssets = assetMappings.reduce((acc, m) => {
    const balance = balanceByLine.get(m.tb_line_id) ?? 0;
    return acc + Math.abs(balance);
  }, 0);
  facts.push(fact(
    "total_assets",
    totalAssets,
    "number",
    assetMappings.map((m) => m.mapping_id),
    "Approximate total assets derived from fixed asset and equity trial balance lines. Use balance sheet data for precise M-1/M-3 determination.",
    0.6 // lower confidence — proper total assets require full balance sheet
  ));

  return facts;
}
