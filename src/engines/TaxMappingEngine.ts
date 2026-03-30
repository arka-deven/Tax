import type { TaxCodeMapping, TrialBalanceLine } from "../models/index.js";

/**
 * Maps a QBO AccountType / AccountSubType pair to a semantic tax category.
 * Key format: "AccountType|AccountSubType" — fall back to "AccountType" if subtype not found.
 *
 * Sources: QBO Chart of Accounts type list + IRS form line references.
 */
const SEMANTIC_MAP: Record<
  string,
  { semantic_category: string; tax_code: string; form: string; schedule: string | null; line: string }
> = {
  // ── Income ─────────────────────────────────────────────────────────────────
  "Income":                             { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "1120",       schedule: null,   line: "1a" },
  "Income|SalesOfProductIncome":        { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "1120",       schedule: null,   line: "1a" },
  "Income|ServiceFeeIncome":            { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "1120",       schedule: null,   line: "1a" },
  "Income|DiscountsRefundsGiven":       { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS_REDUCTION", form: "1120",      schedule: null,   line: "1b" },
  "Income|NonProfitIncome":             { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "990",        schedule: null,   line: "8" },
  "Income|OtherPrimaryIncome":          { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "1120",       schedule: null,   line: "1a" },
  "Income|UnappliedCashPaymentIncome":  { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "1120",       schedule: null,   line: "1a" },

  "Other Income":                       { semantic_category: "other_income",            tax_code: "OTHER_INCOME",            form: "1120",       schedule: null,   line: "10" },
  "Other Income|DividendIncome":        { semantic_category: "dividend_income",         tax_code: "DIVIDEND_INCOME",         form: "1120",       schedule: null,   line: "4" },
  "Other Income|InterestEarned":        { semantic_category: "interest_income",         tax_code: "INTEREST_INCOME",         form: "1120",       schedule: null,   line: "5" },
  "Other Income|OtherMiscIncome":       { semantic_category: "other_income",            tax_code: "OTHER_INCOME",            form: "1120",       schedule: null,   line: "10" },
  "Other Income|TaxExemptInterest":     { semantic_category: "tax_exempt_interest",     tax_code: "TAX_EXEMPT_INTEREST",     form: "1120",       schedule: "M-1",  line: "5" },
  "Other Income|GainLossOnSaleOfAssets":{ semantic_category: "capital_gain_loss",       tax_code: "CAPITAL_GAIN",            form: "1120",       schedule: "D",    line: "7" },
  "Other Income|RentalIncome":          { semantic_category: "rent_income",             tax_code: "RENT_INCOME",             form: "1120",       schedule: null,   line: "6" },

  // ── Cost of Goods Sold ─────────────────────────────────────────────────────
  "Cost of Goods Sold":                 { semantic_category: "cost_of_goods_sold",      tax_code: "COGS",                    form: "1120",       schedule: null,   line: "2" },
  "Cost of Goods Sold|SuppliesMaterialsCogs": { semantic_category: "cost_of_goods_sold", tax_code: "COGS",                  form: "1120",       schedule: null,   line: "2" },
  "Cost of Goods Sold|CostOfLabor":     { semantic_category: "cost_of_goods_sold",      tax_code: "COGS_LABOR",              form: "1120",       schedule: null,   line: "2" },
  "Cost of Goods Sold|FreightAndDeliveryCost": { semantic_category: "cost_of_goods_sold", tax_code: "COGS",                 form: "1120",       schedule: null,   line: "2" },
  "Cost of Goods Sold|OtherCostsOfServicesCogs": { semantic_category: "cost_of_goods_sold", tax_code: "COGS",               form: "1120",       schedule: null,   line: "2" },

  // ── Expenses ───────────────────────────────────────────────────────────────
  "Expenses":                           { semantic_category: "general_expenses",        tax_code: "GENERAL_DEDUCTION",       form: "1120",       schedule: null,   line: "26" },
  "Expenses|AdvertisingPromotional":    { semantic_category: "general_expenses",        tax_code: "ADVERTISING",             form: "1120",       schedule: null,   line: "22" },
  "Expenses|BadDebts":                  { semantic_category: "bad_debt",                tax_code: "BAD_DEBT",                form: "1120",       schedule: null,   line: "15" },
  "Expenses|BankCharges":               { semantic_category: "general_expenses",        tax_code: "GENERAL_DEDUCTION",       form: "1120",       schedule: null,   line: "26" },
  "Expenses|CharitableContributions":   { semantic_category: "charitable_contributions", tax_code: "CHARITABLE_CONTRIBUTION", form: "1120",      schedule: null,   line: "19" },
  "Expenses|CommissionsAndFees":        { semantic_category: "general_expenses",        tax_code: "COMMISSION",              form: "1120",       schedule: null,   line: "26" },
  "Expenses|Depreciation":             { semantic_category: "depreciation",             tax_code: "DEPRECIATION",            form: "1120",       schedule: null,   line: "20" },
  "Expenses|AmortizationDepreciation": { semantic_category: "depreciation",             tax_code: "DEPRECIATION",            form: "4562",       schedule: null,   line: "22" },
  "Expenses|EntertainmentMeals":       { semantic_category: "meals_entertainment",      tax_code: "MEALS_50PCT",             form: "1120",       schedule: "M-1",  line: "4b" },
  "Expenses|EquipmentRental":          { semantic_category: "general_expenses",         tax_code: "RENT_EQUIPMENT",          form: "1120",       schedule: null,   line: "26" },
  "Expenses|InsuranceGeneralLiability":{ semantic_category: "general_expenses",         tax_code: "INSURANCE",               form: "1120",       schedule: null,   line: "26" },
  "Expenses|InterestPaid":             { semantic_category: "interest_expense",         tax_code: "INTEREST_EXPENSE",        form: "1120",       schedule: null,   line: "18" },
  "Expenses|LegalAndProfessionalFees": { semantic_category: "general_expenses",         tax_code: "PROFESSIONAL_FEES",       form: "1120",       schedule: null,   line: "26" },
  "Expenses|OfficeGeneralAdministrative": { semantic_category: "general_expenses",      tax_code: "OFFICE_EXPENSE",          form: "1120",       schedule: null,   line: "26" },
  "Expenses|OfficerCompensation":      { semantic_category: "officer_compensation",     tax_code: "OFFICER_COMPENSATION",    form: "1120",       schedule: null,   line: "12" },
  "Expenses|OtherBusinessExpenses":    { semantic_category: "general_expenses",         tax_code: "GENERAL_DEDUCTION",       form: "1120",       schedule: null,   line: "26" },
  "Expenses|PayrollExpenses":          { semantic_category: "wages",                    tax_code: "WAGES",                   form: "1120",       schedule: null,   line: "13" },
  "Expenses|PenaltiesSettlements":     { semantic_category: "nondeductible",            tax_code: "NONDEDUCTIBLE",           form: "1120",       schedule: "M-1",  line: "3" },
  "Expenses|RentOrLeaseOfBuildings":   { semantic_category: "rent_expense",             tax_code: "RENT_BUILDING",           form: "1120",       schedule: null,   line: "17" },
  "Expenses|RepairsAndMaintenance":    { semantic_category: "general_expenses",         tax_code: "REPAIRS",                 form: "1120",       schedule: null,   line: "14" },
  "Expenses|Taxes":                    { semantic_category: "taxes_and_licenses",       tax_code: "TAXES_LICENSES",          form: "1120",       schedule: null,   line: "17" },
  "Expenses|Travel":                   { semantic_category: "travel",                   tax_code: "TRAVEL",                  form: "1120",       schedule: null,   line: "26" },
  "Expenses|Utilities":                { semantic_category: "general_expenses",         tax_code: "UTILITIES",               form: "1120",       schedule: null,   line: "26" },

  // ── Other Expense ──────────────────────────────────────────────────────────
  "Other Expense":                     { semantic_category: "other_expense",            tax_code: "OTHER_EXPENSE",           form: "1120",       schedule: null,   line: "26" },
  "Other Expense|OtherMiscExpense":    { semantic_category: "other_expense",            tax_code: "OTHER_EXPENSE",           form: "1120",       schedule: null,   line: "26" },
  "Other Expense|IncomeTaxExpense":    { semantic_category: "income_tax_expense",       tax_code: "INCOME_TAX_NONDEDUCTIBLE", form: "1120",      schedule: "M-1",  line: "7" },

  // ── Assets (balance sheet — not directly on income return but flagged) ─────
  "Fixed Asset":                       { semantic_category: "fixed_assets",             tax_code: "FIXED_ASSET",             form: "4562",       schedule: null,   line: "1" },
  "Fixed Asset|Machinery":             { semantic_category: "fixed_assets",             tax_code: "FIXED_ASSET",             form: "4562",       schedule: null,   line: "1" },
  "Fixed Asset|Vehicles":              { semantic_category: "fixed_assets",             tax_code: "FIXED_ASSET_VEHICLE",     form: "4562",       schedule: null,   line: "26" },
  "Fixed Asset|Buildings":             { semantic_category: "fixed_assets",             tax_code: "FIXED_ASSET_BUILDING",    form: "4562",       schedule: null,   line: "1" },

  // ── Equity / Retained Earnings ─────────────────────────────────────────────
  "Equity":                            { semantic_category: "equity",                   tax_code: "EQUITY",                  form: "1120",       schedule: "L",    line: "26" },
  "Equity|RetainedEarnings":           { semantic_category: "retained_earnings",        tax_code: "RETAINED_EARNINGS",       form: "1120",       schedule: "M-2",  line: "3" },
  "Equity|OpeningBalanceEquity":       { semantic_category: "equity",                   tax_code: "EQUITY",                  form: "1120",       schedule: "L",    line: "26" },
};

export function mapTrialBalanceLines(
  lines: TrialBalanceLine[],
  accountTypeByAccountId: Map<string, string>,
  accountSubtypeByAccountId?: Map<string, string>
): TaxCodeMapping[] {
  const mappings: TaxCodeMapping[] = [];

  for (const line of lines) {
    const accountType = accountTypeByAccountId.get(line.account_id);
    const accountSubtype = accountSubtypeByAccountId?.get(line.account_id);

    // Try full "Type|Subtype" key first, then fall back to "Type"
    const key =
      (accountType && accountSubtype && SEMANTIC_MAP[`${accountType}|${accountSubtype}`])
        ? `${accountType}|${accountSubtype}`
        : accountType;

    const entry = key ? SEMANTIC_MAP[key] : undefined;

    if (entry) {
      mappings.push({
        mapping_id: `map_${line.tb_line_id}`,
        entity_id: line.entity_id,
        tax_year: line.tax_year,
        tb_line_id: line.tb_line_id,
        semantic_category: entry.semantic_category,
        tax_code: entry.tax_code,
        target_form: entry.form,
        target_schedule: entry.schedule,
        target_line: entry.line,
        mapping_method: "deterministic",
        confidence_score: 0.9,
        requires_review: false,
        review_reason_code: null,
        explanation: `Mapped by account type "${key}"`,
        source_refs: line.source_refs,
      });
    } else {
      mappings.push({
        mapping_id: `map_${line.tb_line_id}`,
        entity_id: line.entity_id,
        tax_year: line.tax_year,
        tb_line_id: line.tb_line_id,
        semantic_category: "unmapped",
        tax_code: "UNMAPPED",
        target_form: "UNKNOWN",
        target_schedule: null,
        target_line: "UNKNOWN",
        mapping_method: "heuristic",
        confidence_score: 0.0,
        requires_review: true,
        review_reason_code: "NO_MAPPING_FOUND",
        explanation: `No mapping found for account ${line.account_id} (type: ${accountType ?? "unknown"})`,
        source_refs: line.source_refs,
      });
    }
  }

  return mappings;
}
