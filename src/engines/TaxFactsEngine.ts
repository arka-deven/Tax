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

  const cogsPurchases = sumByTaxCode("COGS_PURCHASES");
  facts.push(fact("cogs_purchases_total", cogsPurchases.total, "number", cogsPurchases.mappingIds, "Purchases component of COGS (Form 1125-A Line 2)"));

  const cogsLabor = sumByTaxCode("COGS_LABOR");
  facts.push(fact("cogs_labor_total", cogsLabor.total, "number", cogsLabor.mappingIds, "Cost of labor component of COGS (Form 1125-A Line 3)"));

  // COGS other = total COGS minus purchases minus labor
  const cogsOther = Math.max(0, cogs.total - cogsPurchases.total - cogsLabor.total);
  facts.push(fact("cogs_other_total", cogsOther, "number", cogs.mappingIds, "Other costs component of COGS (Form 1125-A Line 4b)"));

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

  // NOTE: Charitable contribution limitation (IRC §170(b)(2)) is computed below
  // after total_income and deduction components are available.

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
    ["pension_profitsharing_total","PENSION_PROFITSHARING","Sum of pension & profit-sharing plans (1120 Line 23)"],
    ["employee_benefits_total",   "EMPLOYEE_BENEFITS",   "Sum of employee benefit programs (1120 Line 24)"],
    ["contract_labor_total",      "CONTRACT_LABOR",      "Sum of contract labor / 1099 subcontractors (Sch C Line 11)"],
    ["royalty_income_total",      "ROYALTY_INCOME",      "Sum of gross royalty income (1120 Line 7)"],
    ["other_income_total",        "OTHER_INCOME",        "Sum of other income mappings"],
    ["nondeductible_total",       "NONDEDUCTIBLE",       "Sum of nondeductible expense mappings"],
    ["income_tax_expense_total",  "INCOME_TAX_NONDEDUCTIBLE", "Sum of federal income tax (nondeductible) per books"],
    ["auto_expense_total",        "AUTO_EXPENSE",        "Sum of car and truck expenses (Schedule C Line 9)"],
    ["supplies_total",            "SUPPLIES",            "Sum of supplies expense (Schedule C Line 22)"],
    ["guaranteed_payments_total", "GUARANTEED_PAYMENTS", "Sum of guaranteed payments to partners (Form 1065 Line 10)"],
    ["program_service_revenue_total", "PROGRAM_SERVICE_REVENUE", "Program service revenue (Form 990 Line 9)"],
    ["grant_income_total",           "GRANT_INCOME",            "Grant income (Form 990 Line 8 component)"],
    ["grants_paid_total",            "GRANTS_PAID",             "Grants and similar amounts paid (Form 990 Line 13)"],
    ["fundraising_expense_total",    "FUNDRAISING_EXPENSE",     "Professional fundraising fees (Form 990 Line 16a)"],
    ["member_benefits_total",        "MEMBER_BENEFITS",         "Benefits paid to or for members (Form 990 Line 14)"],
  ];

  for (const [name, code, explanation] of taxCodeFacts) {
    const s = sumByTaxCode(code);
    facts.push(fact(name, s.total, "number", s.mappingIds, explanation));
  }

  // ── Interest Expense Limitation Proxy (IRC §163(j)) ─────────────────────
  // §163(j) proxy: 30% of adjusted taxable income (simplified — ATI approximated
  // as taxable income + interest expense + depreciation + amortization add-backs).
  // This is a rough estimate — full §163(j) computation requires Form 8990.
  {
    const interestExpForLimit = sumByTaxCode("INTEREST_EXPENSE");
    const depreciationForLimit = sumByTaxCode("DEPRECIATION");
    const amortizationForLimit = sumByTaxCode("AMORTIZATION");
    // ATI will be recomputed more precisely once taxable_income is known;
    // at this stage we use gross_receipts - cogs as a stand-in for taxable income.
    const roughTaxableIncome = grossReceipts.total - cogs.total;
    const adjustedTaxableIncome =
      roughTaxableIncome +
      interestExpForLimit.total +
      depreciationForLimit.total +
      amortizationForLimit.total;
    const interestExpenseLimit30 = adjustedTaxableIncome * 0.30;
    const interestExpenseDisallowed = Math.max(0, interestExpForLimit.total - interestExpenseLimit30);

    facts.push(fact(
      "adjusted_taxable_income_163j",
      adjustedTaxableIncome,
      "number",
      [...interestExpForLimit.mappingIds, ...depreciationForLimit.mappingIds, ...amortizationForLimit.mappingIds],
      "Adjusted taxable income for §163(j) (simplified ATI = TI + interest + depreciation + amortization)"
    ));
    facts.push(fact(
      "interest_expense_limitation_30pct",
      interestExpenseLimit30,
      "number",
      interestExpForLimit.mappingIds,
      "§163(j) business interest limitation — 30% of ATI (Form 8990)"
    ));
    facts.push(fact(
      "interest_expense_disallowed",
      interestExpenseDisallowed,
      "number",
      interestExpForLimit.mappingIds,
      "Business interest expense disallowed under §163(j) — carryforward indefinitely"
    ));
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

  // ── Balance sheet facts (Schedule L) ─────────────────────────────────────
  // Note: Balance sheet accounts use raw balance (not absolute value) because
  // contra accounts (allowance, accumulated depreciation) carry opposite signs.

  function sumCategoryRaw(category: string): { total: number; mappingIds: string[] } {
    const matched = mappings.filter((m) => m.semantic_category === category);
    const total = matched.reduce((acc, m) => {
      const balance = balanceByLine.get(m.tb_line_id) ?? 0;
      return acc + balance; // Keep sign — debit accounts positive, credit accounts negative
    }, 0);
    return { total, mappingIds: matched.map((m) => m.mapping_id) };
  }

  // Sch L line 1
  const cashRaw = sumCategoryRaw("cash");
  facts.push(fact(
    "cash_total",
    cashRaw.total,
    "number",
    cashRaw.mappingIds,
    "Cash and cash equivalents — Schedule L line 1",
    0.85
  ));

  // Sch L line 2a
  const arRaw = sumCategoryRaw("accounts_receivable");
  facts.push(fact(
    "accounts_receivable_total",
    arRaw.total,
    "number",
    arRaw.mappingIds,
    "Trade accounts receivable — Schedule L line 2a",
    0.85
  ));

  // Sch L line 2b
  const allowanceRaw = sumCategoryRaw("allowance_bad_debts");
  facts.push(fact(
    "allowance_bad_debts_total",
    allowanceRaw.total,
    "number",
    allowanceRaw.mappingIds,
    "Allowance for bad debts (contra asset, will be negative) — Schedule L line 2b",
    0.85
  ));

  // Sch L line 3 (also Form 1125-A lines 1/6)
  const inventoryRaw = sumCategoryRaw("inventory");
  facts.push(fact(
    "inventory_total",
    inventoryRaw.total,
    "number",
    inventoryRaw.mappingIds,
    "Inventory — Schedule L line 3; also Form 1125-A lines 1 and 6",
    0.85
  ));

  // Sch L line 6
  const otherCurrentRaw = sumCategoryRaw("other_current_assets");
  const prepaidRaw = sumCategoryRaw("prepaid_expenses");
  facts.push(fact(
    "other_current_assets_total",
    otherCurrentRaw.total + prepaidRaw.total,
    "number",
    [...otherCurrentRaw.mappingIds, ...prepaidRaw.mappingIds],
    "Other current assets including prepaid expenses — Schedule L line 6",
    0.85
  ));

  // Sch L line 7
  const loansOfficersRaw = sumCategoryRaw("loans_to_officers");
  facts.push(fact(
    "loans_to_officers_total",
    loansOfficersRaw.total,
    "number",
    loansOfficersRaw.mappingIds,
    "Loans to officers — Schedule L line 7",
    0.85
  ));

  // Sch L line 9a — fixed assets (raw balance, keeping sign)
  const fixedAssetRaw = mappings
    .filter((m) =>
      m.tax_code === "FIXED_ASSET" ||
      m.tax_code === "FIXED_ASSET_VEHICLE" ||
      m.tax_code === "FIXED_ASSET_BUILDING" ||
      m.tax_code === "FIXED_ASSET_QIP"
    );
  const buildingsDepreciableTotal = fixedAssetRaw.reduce((acc, m) => {
    const balance = balanceByLine.get(m.tb_line_id) ?? 0;
    return acc + balance;
  }, 0);
  facts.push(fact(
    "buildings_depreciable_total",
    buildingsDepreciableTotal,
    "number",
    fixedAssetRaw.map((m) => m.mapping_id),
    "Depreciable buildings and equipment at cost — Schedule L line 9a",
    0.85
  ));

  // Form 4562 detail — derive from fixed asset totals
  const totalPropertyCost = buildingsDepreciableTotal; // already computed above as buildings_depreciable_total
  facts.push(fact("section_179_eligible_cost", totalPropertyCost, "number", [], "Total cost of §179 property placed in service (Form 4562 Line 2)", 0.6));

  // Bonus depreciation: 40% for 2025 (phasing down from 100% in 2022)
  const bonusDepreciationRate = taxYear >= 2027 ? 0 : taxYear === 2026 ? 0.20 : taxYear === 2025 ? 0.40 : taxYear === 2024 ? 0.60 : 0.80;
  const bonusDepreciation = totalPropertyCost * bonusDepreciationRate;
  facts.push(fact("bonus_depreciation_amount", bonusDepreciation, "number", [], `Bonus depreciation at ${bonusDepreciationRate * 100}% for ${taxYear} (Form 4562 Line 14)`, 0.5));

  // Sch L line 9b (will be negative — contra asset)
  const accumDeprecRaw = sumCategoryRaw("accum_depreciation");
  facts.push(fact(
    "accum_depreciation_total",
    accumDeprecRaw.total,
    "number",
    accumDeprecRaw.mappingIds,
    "Accumulated depreciation (contra asset, will be negative) — Schedule L line 9b",
    0.85
  ));

  // Sch L line 10 (placeholder — no specific category yet)
  facts.push(fact(
    "land_total",
    0,
    "number",
    [],
    "Land (placeholder — no land semantic category mapped yet) — Schedule L line 10",
    0.85
  ));

  // Sch L line 12
  const intangibleRaw = sumCategoryRaw("intangible_assets");
  facts.push(fact(
    "intangible_assets_total",
    intangibleRaw.total,
    "number",
    intangibleRaw.mappingIds,
    "Intangible assets — Schedule L line 12",
    0.85
  ));

  // Sch L line 12b
  const accumAmortRaw = sumCategoryRaw("accum_amortization");
  facts.push(fact(
    "accum_amortization_total",
    accumAmortRaw.total,
    "number",
    accumAmortRaw.mappingIds,
    "Accumulated amortization (contra asset, will be negative) — Schedule L line 12b",
    0.85
  ));

  // Sch L line 14
  const otherAssetsRaw = sumCategoryRaw("other_assets");
  facts.push(fact(
    "other_assets_total",
    otherAssetsRaw.total,
    "number",
    otherAssetsRaw.mappingIds,
    "Other assets — Schedule L line 14",
    0.85
  ));

  // Sch L line 16 (credit balance — will be negative)
  const apRaw = sumCategoryRaw("accounts_payable");
  facts.push(fact(
    "accounts_payable_total",
    apRaw.total,
    "number",
    apRaw.mappingIds,
    "Accounts payable (credit balance, will be negative) — Schedule L line 16",
    0.85
  ));

  // Sch L line 17
  const creditCardRaw = sumCategoryRaw("credit_card_liability");
  facts.push(fact(
    "credit_card_total",
    creditCardRaw.total,
    "number",
    creditCardRaw.mappingIds,
    "Credit card liabilities — Schedule L line 17",
    0.85
  ));

  // Sch L line 18
  const otherCurrentLiabRaw = sumCategoryRaw("other_current_liabilities");
  facts.push(fact(
    "other_current_liabilities_total",
    otherCurrentLiabRaw.total,
    "number",
    otherCurrentLiabRaw.mappingIds,
    "Other current liabilities — Schedule L line 18",
    0.85
  ));

  // Sch L line 19
  const shareholderLoansRaw = sumCategoryRaw("shareholder_loans");
  facts.push(fact(
    "shareholder_loans_total",
    shareholderLoansRaw.total,
    "number",
    shareholderLoansRaw.mappingIds,
    "Loans from shareholders — Schedule L line 19",
    0.85
  ));

  // Sch L line 20
  const longTermLiabRaw = sumCategoryRaw("long_term_liabilities");
  facts.push(fact(
    "long_term_liabilities_total",
    longTermLiabRaw.total,
    "number",
    longTermLiabRaw.mappingIds,
    "Long-term liabilities — Schedule L line 20",
    0.85
  ));

  // Sch L line 22 (raw balance — equity accounts carry credit/negative sign)
  const capitalStockRaw = mappings.filter((m) => m.tax_code === "EQUITY");
  const capitalStockTotal = capitalStockRaw.reduce((acc, m) => {
    const balance = balanceByLine.get(m.tb_line_id) ?? 0;
    return acc + balance;
  }, 0);
  facts.push(fact(
    "capital_stock_total",
    capitalStockTotal,
    "number",
    capitalStockRaw.map((m) => m.mapping_id),
    "Capital stock — Schedule L line 22",
    0.85
  ));

  // Sch L line 25 (raw balance)
  const retainedEarningsRaw = mappings.filter((m) => m.tax_code === "RETAINED_EARNINGS");
  const retainedEarningsTotal = retainedEarningsRaw.reduce((acc, m) => {
    const balance = balanceByLine.get(m.tb_line_id) ?? 0;
    return acc + balance;
  }, 0);
  facts.push(fact(
    "retained_earnings_total",
    retainedEarningsTotal,
    "number",
    retainedEarningsRaw.map((m) => m.mapping_id),
    "Retained earnings — Schedule L line 25",
    0.85
  ));

  const distributions = sumByTaxCode("OWNER_DISTRIBUTIONS");
  facts.push(fact("owner_distributions_total", Math.abs(distributions.total), "number", distributions.mappingIds, "Cash distributions to owners/partners/shareholders (Schedule M-2 Line 5a)"));

  // ── Recomputed total_assets (replaces approximate version above) ──────────
  const totalAssetsProper =
    cashRaw.total +
    arRaw.total +
    allowanceRaw.total + // negative (contra)
    inventoryRaw.total +
    (otherCurrentRaw.total + prepaidRaw.total) +
    buildingsDepreciableTotal +
    accumDeprecRaw.total + // negative (contra)
    0 + // land placeholder
    intangibleRaw.total +
    accumAmortRaw.total + // negative (contra)
    otherAssetsRaw.total +
    loansOfficersRaw.total;
  const totalAssetsMappingIds = [
    ...cashRaw.mappingIds,
    ...arRaw.mappingIds,
    ...allowanceRaw.mappingIds,
    ...inventoryRaw.mappingIds,
    ...otherCurrentRaw.mappingIds,
    ...prepaidRaw.mappingIds,
    ...fixedAssetRaw.map((m) => m.mapping_id),
    ...accumDeprecRaw.mappingIds,
    ...intangibleRaw.mappingIds,
    ...accumAmortRaw.mappingIds,
    ...otherAssetsRaw.mappingIds,
    ...loansOfficersRaw.mappingIds,
  ];
  facts.push(fact(
    "total_assets_bs",
    totalAssetsProper,
    "number",
    totalAssetsMappingIds,
    "Total assets computed from full Schedule L balance sheet lines",
    0.85
  ));

  // ── Total liabilities ─────────────────────────────────────────────────────
  const totalLiabilities =
    Math.abs(apRaw.total) +
    Math.abs(creditCardRaw.total) +
    Math.abs(otherCurrentLiabRaw.total) +
    Math.abs(shareholderLoansRaw.total) +
    Math.abs(longTermLiabRaw.total);
  facts.push(fact(
    "total_liabilities",
    totalLiabilities,
    "number",
    [
      ...apRaw.mappingIds,
      ...creditCardRaw.mappingIds,
      ...otherCurrentLiabRaw.mappingIds,
      ...shareholderLoansRaw.mappingIds,
      ...longTermLiabRaw.mappingIds,
    ],
    "Total liabilities — sum of all liability Schedule L lines",
    0.85
  ));

  // ── Computed Income / Deduction Totals (Form 1120 lines) ─────────────────

  // Form 1120 line 1b
  const returnsAllowances = sumByTaxCode("GROSS_RECEIPTS_REDUCTION");
  facts.push(fact(
    "returns_allowances_total",
    returnsAllowances.total,
    "number",
    returnsAllowances.mappingIds,
    "Returns and allowances — Form 1120 line 1b",
    0.9
  ));

  // Form 1120 line 6
  const rentIncomeCategory = sumCategory("rent_income");
  facts.push(fact(
    "rent_income_total",
    rentIncomeCategory.total,
    "number",
    rentIncomeCategory.mappingIds,
    "Rental income — Form 1120 line 6",
    0.9
  ));

  // Form 1120 line 8
  const capitalGain = sumCategory("capital_gain_loss");
  facts.push(fact(
    "capital_gain_total",
    capitalGain.total,
    "number",
    capitalGain.mappingIds,
    "Net capital gain (loss) — Form 1120 line 8",
    0.9
  ));

  // Form 1120 line 3
  const grossProfit = grossReceipts.total - returnsAllowances.total - cogs.total;
  facts.push(fact(
    "gross_profit",
    grossProfit,
    "number",
    [...grossReceipts.mappingIds, ...returnsAllowances.mappingIds, ...cogs.mappingIds],
    "Gross profit: gross receipts minus returns/allowances minus COGS — Form 1120 line 3",
    0.9
  ));

  // Form 1120 line 11
  const otherIncomeTC = sumByTaxCode("OTHER_INCOME");
  const totalIncome =
    grossProfit +
    dividendIncome.total +
    interestIncome.total +
    otherIncomeTC.total +
    rentIncomeCategory.total +
    capitalGain.total;
  facts.push(fact(
    "total_income",
    totalIncome,
    "number",
    [
      ...grossReceipts.mappingIds,
      ...returnsAllowances.mappingIds,
      ...cogs.mappingIds,
      ...dividendIncome.mappingIds,
      ...interestIncome.mappingIds,
      ...otherIncomeTC.mappingIds,
      ...rentIncomeCategory.mappingIds,
      ...capitalGain.mappingIds,
    ],
    "Total income — Form 1120 line 11",
    0.9
  ));

  // Form 1120 line 27 — deduction components (declared here so charitable limitation can reference them)
  const officerCompTC = sumByTaxCode("OFFICER_COMP");
  const wagesTC = sumByTaxCode("WAGES");
  const repairsTC = sumByTaxCode("REPAIRS");
  const badDebtTC = sumByTaxCode("BAD_DEBT");
  const rentBuildingTC = sumByTaxCode("RENT_BUILDING");
  const taxesLicensesTC = sumByTaxCode("TAXES_LICENSES");
  const interestExpTC = sumByTaxCode("INTEREST_EXPENSE");
  const charitableTC = sumByTaxCode("CHARITABLE");
  const depreciationTC = sumByTaxCode("DEPRECIATION");
  const advertisingTC = sumByTaxCode("ADVERTISING");
  const generalDeductionTC = sumByTaxCode("GENERAL_DEDUCTION");

  // ── Charitable Contribution Limitation (IRC §170(b)(2)) ──────────────────
  // C-Corp charitable deduction limited to 10% of taxable income computed
  // without regard to the charitable deduction itself.
  const deductionsExcludingCharitable =
    officerComp.total +
    wagesTC.total +
    repairsTC.total +
    badDebtTC.total +
    rentBuildingTC.total +
    taxesLicensesTC.total +
    interestExpTC.total +
    depreciationTC.total +
    advertisingTC.total +
    generalDeductionTC.total;
  const taxableIncomeBeforeCharitable = totalIncome - deductionsExcludingCharitable;
  const charitableLimitAmount = taxableIncomeBeforeCharitable * 0.10;
  const charitableAllowable = Math.min(charitable.total, Math.max(0, charitableLimitAmount));
  const charitableExcess = Math.max(0, charitable.total - charitableAllowable);

  facts.push(fact(
    "charitable_contributions_allowable",
    charitableAllowable,
    "number",
    charitable.mappingIds,
    "Charitable contributions allowed after 10% of TI limitation (IRC §170(b)(2))"
  ));
  facts.push(fact(
    "charitable_contributions_excess",
    charitableExcess,
    "number",
    charitable.mappingIds,
    "Charitable contributions in excess of 10% of TI — 5-year carryforward (IRC §170(d))"
  ));

  // Schedule M-1 computed items
  const mealsDisallowance = meals.total * 0.50; // 50% of meals is nondeductible
  facts.push(fact("m1_meals_disallowance", mealsDisallowance, "number", meals.mappingIds, "Schedule M-1 Line 5c: 50% meals disallowance (IRC §274(n))"));

  // M-1 Line 5b: charitable excess (already computed as charitable_contributions_excess)
  // M-1 Line 6: sum of lines 1 through 5e

  const totalDeductions =
    officerComp.total +
    wagesTC.total +
    repairsTC.total +
    badDebtTC.total +
    rentBuildingTC.total +
    taxesLicensesTC.total +
    interestExpTC.total +
    charitable.total +
    depreciationTC.total +
    advertisingTC.total +
    generalDeductionTC.total;

  facts.push(fact(
    "total_deductions",
    totalDeductions,
    "number",
    [
      ...officerComp.mappingIds,
      ...wagesTC.mappingIds,
      ...repairsTC.mappingIds,
      ...badDebtTC.mappingIds,
      ...rentBuildingTC.mappingIds,
      ...taxesLicensesTC.mappingIds,
      ...interestExpTC.mappingIds,
      ...charitable.mappingIds,
      ...depreciationTC.mappingIds,
      ...advertisingTC.mappingIds,
      ...generalDeductionTC.mappingIds,
    ],
    "Total deductions — Form 1120 line 27",
    0.9
  ));

  // Form 1120 line 28
  const taxableIncomeBeforeNol = totalIncome - totalDeductions;
  facts.push(fact(
    "taxable_income_before_nol",
    taxableIncomeBeforeNol,
    "number",
    [],
    "Taxable income before NOL deduction — Form 1120 line 28",
    0.9
  ));

  // Form 1120 line 30 (NOL = 0 for now)
  facts.push(fact(
    "taxable_income",
    taxableIncomeBeforeNol,
    "number",
    [],
    "Taxable income (NOL assumed zero) — Form 1120 line 30",
    0.9
  ));

  // ── Net Operating Loss (NOL) Tracking ────────────────────────────────────
  const nolAvailable = taxableIncomeBeforeNol < 0 ? Math.abs(taxableIncomeBeforeNol) : 0;
  facts.push(fact(
    "net_operating_loss_current_year",
    nolAvailable,
    "number",
    [...grossReceipts.mappingIds, ...cogs.mappingIds],
    "Current year NOL available for carryforward (post-TCJA: 80% limitation on usage, indefinite carryforward per IRC §172)"
  ));

  // Form 1120 line 31 — C-Corp flat 21% rate
  const corporateTax = taxableIncomeBeforeNol * 0.21;
  facts.push(fact(
    "corporate_tax_21pct",
    corporateTax,
    "number",
    [],
    "Corporate income tax at 21% flat rate — Form 1120 line 31",
    0.95
  ));

  // ── Estimated tax payments & amount owed/overpaid ─────────────────────
  const estTaxPayments = sumByTaxCode("ESTIMATED_TAX_PAYMENTS");
  facts.push(fact("estimated_tax_payments_total", estTaxPayments.total, "number", estTaxPayments.mappingIds, "Sum of estimated tax payments made during the year (Form 1120 Line 32)"));

  // Special deductions — Dividends Received Deduction (DRD) for C-Corps
  // IRC §243: 50% of dividends from domestic corporations (simplified)
  const drdAmount = dividendIncome.total * 0.50;
  facts.push(fact("special_deductions_drd", drdAmount, "number", dividendIncome.mappingIds, "Dividends received deduction (50% of domestic dividends per IRC §243)", 0.7));

  // Amount owed or overpayment
  const totalTax = Math.max(0, taxableIncomeBeforeNol * 0.21);
  const amountOwed = Math.max(0, totalTax - estTaxPayments.total);
  const overpayment = Math.max(0, estTaxPayments.total - totalTax);
  facts.push(fact("amount_owed", amountOwed, "number", [], "Tax due: total tax minus payments (Form 1120 Line 34)"));
  facts.push(fact("overpayment_amount", overpayment, "number", [], "Overpayment: payments minus total tax (Form 1120 Line 35)"));

  // ── Schedule SE Computation Facts ─────────────────────────────────────────

  const netSeEarnings = netIncome; // same as net_income_before_tax from Sch C
  facts.push(fact(
    "net_se_earnings",
    netSeEarnings,
    "number",
    [...grossReceipts.mappingIds, ...cogs.mappingIds],
    "Net self-employment earnings — Schedule SE",
    0.9
  ));

  // SE line 4a
  const seTaxBase = netSeEarnings * 0.9235;
  facts.push(fact(
    "se_tax_base",
    seTaxBase,
    "number",
    [],
    "Self-employment tax base (net SE earnings × 92.35%) — Schedule SE line 4a",
    0.95
  ));

  // SE line 5a — 2025 Social Security wage base $176,100
  const ssTax = Math.min(seTaxBase, 176100) * 0.124;
  facts.push(fact(
    "ss_tax",
    ssTax,
    "number",
    [],
    "Social Security tax (12.4% on SE base up to $176,100 wage base) — Schedule SE line 5a",
    0.95
  ));

  // SE line 5b
  const medicareTax = seTaxBase * 0.029;
  facts.push(fact(
    "medicare_tax",
    medicareTax,
    "number",
    [],
    "Medicare tax (2.9% on full SE base) — Schedule SE line 5b",
    0.95
  ));

  // SE line 6
  const selfEmploymentTax = ssTax + medicareTax;
  facts.push(fact(
    "self_employment_tax",
    selfEmploymentTax,
    "number",
    [],
    "Total self-employment tax (SS + Medicare) — Schedule SE line 6",
    0.95
  ));

  // SE line 7
  const seTaxDeduction = selfEmploymentTax * 0.5;
  facts.push(fact(
    "se_tax_deduction",
    seTaxDeduction,
    "number",
    [],
    "Deductible portion of self-employment tax (50%) — Schedule SE line 7",
    0.95
  ));

  // ── Pass-Through Separately Stated Items (K-1 Preparation) ──────────────
  // For S-Corps (Form 1120-S) and Partnerships (Form 1065), income/deduction
  // items that must be separately stated on Schedule K-1.

  facts.push(fact(
    "ordinary_business_income",
    totalIncome - totalDeductions,
    "number",
    [...grossReceipts.mappingIds, ...cogs.mappingIds],
    "Ordinary business income/(loss) for K-1 Line 1"
  ));
  facts.push(fact(
    "separately_stated_interest_income",
    interestIncome.total,
    "number",
    interestIncome.mappingIds,
    "Separately stated interest income for K-1 Line 5"
  ));
  facts.push(fact(
    "separately_stated_dividend_income",
    dividendIncome.total,
    "number",
    dividendIncome.mappingIds,
    "Separately stated dividend income for K-1 Line 6a"
  ));
  facts.push(fact(
    "separately_stated_rental_income",
    rentIncome.total,
    "number",
    rentIncome.mappingIds,
    "Separately stated rental income for K-1 Line 2"
  ));
  facts.push(fact(
    "separately_stated_charitable",
    charitable.total,
    "number",
    charitable.mappingIds,
    "Separately stated charitable contributions for K-1 Line 12a"
  ));

  // ── QBI Deduction Facts (Form 8995) ───────────────────────────────────────

  // Form 8995 line 10
  const qbiComponent = netIncome * 0.20;
  facts.push(fact(
    "qbi_component",
    qbiComponent,
    "number",
    [...grossReceipts.mappingIds, ...cogs.mappingIds],
    "QBI component (20% of net income before tax) — Form 8995 line 10",
    0.95
  ));

  // Form 8995 line 15
  const qbiDeduction = Math.min(qbiComponent, taxableIncomeBeforeNol * 0.20);
  facts.push(fact(
    "qbi_deduction",
    qbiDeduction,
    "number",
    [],
    "QBI deduction — lesser of QBI component and 20% of taxable income — Form 8995 line 15",
    0.95
  ));

  return facts;
}
