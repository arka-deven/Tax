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
  // ── Income ────────────────────────────────────────────────────────────────
  // Form 1120 line 1a; Form 1120-S line 1a; Form 1065 line 1a; Schedule C line 1
  "Income":                             { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "1120",       schedule: null,   line: "1a" },
  "Income|SalesOfProductIncome":        { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "1120",       schedule: null,   line: "1a" },
  "Income|ServiceFeeIncome":            { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "1120",       schedule: null,   line: "1a" },
  "Income|DiscountsRefundsGiven":       { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS_REDUCTION", form: "1120",      schedule: null,   line: "1b" },
  "Income|NonProfitIncome":             { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "990",        schedule: null,   line: "PartVIII_12" },
  "Income|OtherPrimaryIncome":          { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "1120",       schedule: null,   line: "1a" },
  "Income|UnappliedCashPaymentIncome":  { semantic_category: "gross_receipts",          tax_code: "GROSS_RECEIPTS",          form: "1120",       schedule: null,   line: "1a" },

  // Other income — 1120 lines 4-10; 1120-S lines 4-5; Schedule C line 4
  "Other Income":                       { semantic_category: "other_income",            tax_code: "OTHER_INCOME",            form: "1120",       schedule: null,   line: "10" },
  "Other Income|DividendIncome":        { semantic_category: "dividend_income",         tax_code: "DIVIDEND_INCOME",         form: "1120",       schedule: "C",    line: "4" },
  "Other Income|InterestEarned":        { semantic_category: "interest_income",         tax_code: "INTEREST_INCOME",         form: "1120",       schedule: null,   line: "5" },
  "Other Income|OtherMiscIncome":       { semantic_category: "other_income",            tax_code: "OTHER_INCOME",            form: "1120",       schedule: null,   line: "10" },
  "Other Income|TaxExemptInterest":     { semantic_category: "tax_exempt_interest",     tax_code: "TAX_EXEMPT_INTEREST",     form: "1120",       schedule: "M-1",  line: "7a" },
  "Other Income|GainLossOnSaleOfAssets":{ semantic_category: "capital_gain_loss",       tax_code: "CAPITAL_GAIN",            form: "4797",       schedule: null,   line: "9" },
  "Other Income|RentalIncome":          { semantic_category: "rent_income",             tax_code: "RENT_INCOME",             form: "1120",       schedule: null,   line: "6" },

  // ── Cost of Goods Sold ────────────────────────────────────────────────────
  // 1120 line 2 (from Form 1125-A); 1120-S line 2; 1065 line 2; Schedule C lines 35/42
  "Cost of Goods Sold":                 { semantic_category: "cost_of_goods_sold",      tax_code: "COGS",                    form: "1125-A",     schedule: null,   line: "8" },
  "Cost of Goods Sold|SuppliesMaterialsCogs": { semantic_category: "cost_of_goods_sold", tax_code: "COGS",                  form: "1125-A",     schedule: null,   line: "5" },
  "Cost of Goods Sold|CostOfLabor":     { semantic_category: "cost_of_goods_sold",      tax_code: "COGS_LABOR",              form: "1125-A",     schedule: null,   line: "3" },
  "Cost of Goods Sold|FreightAndDeliveryCost": { semantic_category: "cost_of_goods_sold", tax_code: "COGS",                 form: "1125-A",     schedule: null,   line: "5" },
  "Cost of Goods Sold|OtherCostsOfServicesCogs": { semantic_category: "cost_of_goods_sold", tax_code: "COGS",               form: "1125-A",     schedule: null,   line: "5" },

  // ── Expenses — cross-referenced to 1120/1120-S/1065/Schedule C ───────────
  "Expenses":                           { semantic_category: "general_expenses",        tax_code: "GENERAL_DEDUCTION",       form: "1120",       schedule: null,   line: "26" },
  "Expenses|AdvertisingPromotional":    { semantic_category: "general_expenses",        tax_code: "ADVERTISING",             form: "1120",       schedule: null,   line: "22" },   // Sched C: line 8
  "Expenses|BadDebts":                  { semantic_category: "bad_debt",                tax_code: "BAD_DEBT",                form: "1120",       schedule: null,   line: "15" },   // 1120-S: 10; Sched C: implied other
  "Expenses|BankCharges":               { semantic_category: "general_expenses",        tax_code: "GENERAL_DEDUCTION",       form: "1120",       schedule: null,   line: "26" },
  "Expenses|CharitableContributions":   { semantic_category: "charitable_contributions", tax_code: "CHARITABLE_CONTRIBUTION", form: "1120",      schedule: null,   line: "19" },   // 10% of TI limit for C-Corp
  "Expenses|CommissionsAndFees":        { semantic_category: "general_expenses",        tax_code: "COMMISSION",              form: "Schedule C", schedule: null,   line: "10" },   // Sched C: line 10 (commissions); 1120: line 26
  "Expenses|Depreciation":             { semantic_category: "depreciation",             tax_code: "DEPRECIATION",            form: "1120",       schedule: null,   line: "20" },   // 1120-S: 14; 1065: 16c; 4562: Part II
  "Expenses|AmortizationDepreciation": { semantic_category: "depreciation",             tax_code: "AMORTIZATION",            form: "4562",       schedule: null,   line: "28" },   // 4562 Part III line 28
  "Expenses|EntertainmentMeals":       { semantic_category: "meals_entertainment",      tax_code: "MEALS_50PCT",             form: "1120",       schedule: "M-1",  line: "5c" },   // 50% disallowance on M-1 line 5c; Sched C line 24b
  "Expenses|EquipmentRental":          { semantic_category: "general_expenses",         tax_code: "RENT_EQUIPMENT",          form: "1120",       schedule: null,   line: "26" },   // Sched C: line 20a
  "Expenses|InsuranceGeneralLiability":{ semantic_category: "general_expenses",         tax_code: "INSURANCE",               form: "1120",       schedule: null,   line: "26" },   // Sched C: line 15
  "Expenses|InterestPaid":             { semantic_category: "interest_expense",         tax_code: "INTEREST_EXPENSE",        form: "1120",       schedule: null,   line: "18" },   // 1120-S: 13; 1065: 15; Sched C: 16b
  "Expenses|LegalAndProfessionalFees": { semantic_category: "general_expenses",         tax_code: "PROFESSIONAL_FEES",       form: "1120",       schedule: null,   line: "26" },   // Sched C: line 17
  "Expenses|OfficeGeneralAdministrative": { semantic_category: "general_expenses",      tax_code: "OFFICE_EXPENSE",          form: "1120",       schedule: null,   line: "26" },   // Sched C: line 18
  "Expenses|OfficerCompensation":      { semantic_category: "officer_compensation",     tax_code: "OFFICER_COMPENSATION",    form: "1120",       schedule: null,   line: "12" },   // 1120-S: line 7; attach 1125-E if >$500K gross
  "Expenses|OtherBusinessExpenses":    { semantic_category: "general_expenses",         tax_code: "GENERAL_DEDUCTION",       form: "1120",       schedule: null,   line: "26" },
  "Expenses|PayrollExpenses":          { semantic_category: "wages",                    tax_code: "WAGES",                   form: "1120",       schedule: null,   line: "13" },   // 1120-S: 8; 1065: 9; Sched C: 26
  "Expenses|PenaltiesSettlements":     { semantic_category: "nondeductible",            tax_code: "NONDEDUCTIBLE",           form: "1120",       schedule: "M-1",  line: "3" },    // Nondeductible — M-1 addback
  "Expenses|RentOrLeaseOfBuildings":   { semantic_category: "rent_expense",             tax_code: "RENT_BUILDING",           form: "1120",       schedule: null,   line: "16" },   // 1120-S: 11; 1065: 13; Sched C: 20b
  "Expenses|RepairsAndMaintenance":    { semantic_category: "general_expenses",         tax_code: "REPAIRS",                 form: "1120",       schedule: null,   line: "14" },   // 1120-S: 9; 1065: 11; Sched C: 21
  "Expenses|Taxes":                    { semantic_category: "taxes_and_licenses",       tax_code: "TAXES_LICENSES",          form: "1120",       schedule: null,   line: "17" },   // 1120-S: 12; 1065: 14; Sched C: 23
  "Expenses|Travel":                   { semantic_category: "travel",                   tax_code: "TRAVEL",                  form: "Schedule C", schedule: null,   line: "24a" },  // 1120: line 26; Sched C: 24a
  "Expenses|Utilities":                { semantic_category: "general_expenses",         tax_code: "UTILITIES",               form: "1120",       schedule: null,   line: "26" },   // Sched C: line 25

  // ── Other Expense ─────────────────────────────────────────────────────────
  "Other Expense":                     { semantic_category: "other_expense",            tax_code: "OTHER_EXPENSE",           form: "1120",       schedule: null,   line: "26" },
  "Other Expense|OtherMiscExpense":    { semantic_category: "other_expense",            tax_code: "OTHER_EXPENSE",           form: "1120",       schedule: null,   line: "26" },
  "Other Expense|IncomeTaxExpense":    { semantic_category: "income_tax_expense",       tax_code: "INCOME_TAX_NONDEDUCTIBLE", form: "1120",      schedule: "M-1",  line: "2" },    // M-1 line 2: federal income tax per books (nondeductible)

  // ── Fixed / Long-Term Assets ──────────────────────────────────────────────
  // Balance sheet items — appear on Schedule L; depreciated via Form 4562
  "Fixed Asset":                       { semantic_category: "fixed_assets",             tax_code: "FIXED_ASSET",             form: "4562",       schedule: null,   line: "19c" },  // 4562: 7-year MACRS (most equipment)
  "Fixed Asset|Machinery":             { semantic_category: "fixed_assets",             tax_code: "FIXED_ASSET",             form: "4562",       schedule: null,   line: "19c" },  // 4562: 7-year MACRS
  "Fixed Asset|Vehicles":              { semantic_category: "fixed_assets",             tax_code: "FIXED_ASSET_VEHICLE",     form: "4562",       schedule: null,   line: "19b" },  // 4562: 5-year MACRS + listed property Part V
  "Fixed Asset|Buildings":             { semantic_category: "fixed_assets",             tax_code: "FIXED_ASSET_BUILDING",    form: "4562",       schedule: null,   line: "19i" },  // 4562: 39-year nonresidential real property
  "Fixed Asset|LeaseholdImprovements": { semantic_category: "fixed_assets",             tax_code: "FIXED_ASSET_QIP",         form: "4562",       schedule: null,   line: "19e" },  // 4562: 15-year QIP (eligible for bonus)
  "Fixed Asset|FurnitureAndFixtures":  { semantic_category: "fixed_assets",             tax_code: "FIXED_ASSET",             form: "4562",       schedule: null,   line: "19c" },  // 4562: 7-year MACRS

  // ── Equity / Retained Earnings ─────────────────────────────────────────────
  // Schedule L (balance sheet); M-2 (retained earnings reconciliation)
  "Equity":                            { semantic_category: "equity",                   tax_code: "EQUITY",                  form: "1120",       schedule: "L",    line: "36" },   // Sched L line 36: Additional paid-in capital
  "Equity|RetainedEarnings":           { semantic_category: "retained_earnings",        tax_code: "RETAINED_EARNINGS",       form: "1120",       schedule: "M-2",  line: "8" },    // M-2 line 8: balance at end of year
  "Equity|OpeningBalanceEquity":       { semantic_category: "equity",                   tax_code: "EQUITY",                  form: "1120",       schedule: "L",    line: "36" },
  "Equity|PartnersEquity":             { semantic_category: "equity",                   tax_code: "EQUITY",                  form: "1065",       schedule: "M-2",  line: "11" },   // 1065 M-2 line 11: balance at end of year
  "Equity|ShareholdersEquity":         { semantic_category: "equity",                   tax_code: "EQUITY",                  form: "1120-S",     schedule: "M-2",  line: "9" },    // 1120-S M-2 (AAA) line 9

  // ── Bank / Cash ───────────────────────────────────────────────────────────
  // Schedule L line 1
  "Bank":                              { semantic_category: "cash",                     tax_code: "CASH",                    form: "1120",       schedule: "L",    line: "1" },
  "Bank|Checking":                     { semantic_category: "cash",                     tax_code: "CASH",                    form: "1120",       schedule: "L",    line: "1" },
  "Bank|Savings":                      { semantic_category: "cash",                     tax_code: "CASH",                    form: "1120",       schedule: "L",    line: "1" },
  "Bank|MoneyMarket":                  { semantic_category: "cash",                     tax_code: "CASH",                    form: "1120",       schedule: "L",    line: "1" },
  "Bank|CashOnHand":                   { semantic_category: "cash",                     tax_code: "CASH",                    form: "1120",       schedule: "L",    line: "1" },
  "Bank|TrustAccount":                 { semantic_category: "cash",                     tax_code: "CASH",                    form: "1120",       schedule: "L",    line: "1" },

  // ── Accounts Receivable ───────────────────────────────────────────────────
  // Schedule L lines 2a / 2b
  "Accounts Receivable":               { semantic_category: "accounts_receivable",      tax_code: "ACCOUNTS_RECEIVABLE",     form: "1120",       schedule: "L",    line: "2a" },

  // ── Other Current Assets ──────────────────────────────────────────────────
  // Schedule L lines 3, 6, 7
  "Other Current Asset":               { semantic_category: "other_current_assets",     tax_code: "OTHER_CURRENT_ASSETS",    form: "1120",       schedule: "L",    line: "6" },
  "Other Current Asset|Inventory":     { semantic_category: "inventory",                tax_code: "INVENTORY",               form: "1120",       schedule: "L",    line: "3" },
  "Other Current Asset|PrepaidExpenses": { semantic_category: "prepaid_expenses",       tax_code: "PREPAID_EXPENSES",        form: "1120",       schedule: "L",    line: "6" },
  "Other Current Asset|UndepositedFunds": { semantic_category: "other_current_assets",  tax_code: "OTHER_CURRENT_ASSETS",    form: "1120",       schedule: "L",    line: "6" },
  "Other Current Asset|AllowanceForBadDebts": { semantic_category: "allowance_bad_debts", tax_code: "ALLOWANCE_BAD_DEBTS",  form: "1120",       schedule: "L",    line: "2b" },
  "Other Current Asset|LoansToOfficers": { semantic_category: "loans_to_officers",      tax_code: "LOANS_TO_OFFICERS",       form: "1120",       schedule: "L",    line: "7" },
  "Other Current Asset|OtherCurrentAssets": { semantic_category: "other_current_assets", tax_code: "OTHER_CURRENT_ASSETS",  form: "1120",       schedule: "L",    line: "6" },

  // ── Other Assets (non-current / intangible) ───────────────────────────────
  // Schedule L lines 12, 12b, 14
  "Other Asset":                       { semantic_category: "other_assets",             tax_code: "OTHER_ASSETS",            form: "1120",       schedule: "L",    line: "14" },
  "Other Asset|Goodwill":              { semantic_category: "intangible_assets",        tax_code: "INTANGIBLE_ASSETS",       form: "1120",       schedule: "L",    line: "12" },
  "Other Asset|Licenses":              { semantic_category: "intangible_assets",        tax_code: "INTANGIBLE_ASSETS",       form: "1120",       schedule: "L",    line: "12" },
  "Other Asset|OtherAsset":            { semantic_category: "other_assets",             tax_code: "OTHER_ASSETS",            form: "1120",       schedule: "L",    line: "14" },
  "Other Asset|SecurityDeposits":      { semantic_category: "other_assets",             tax_code: "OTHER_ASSETS",            form: "1120",       schedule: "L",    line: "14" },
  "Other Asset|AccumulatedAmortization": { semantic_category: "accum_amortization",     tax_code: "ACCUM_AMORTIZATION",      form: "1120",       schedule: "L",    line: "12b" },
  "Other Asset|AccumulatedDepletion":  { semantic_category: "accum_amortization",       tax_code: "ACCUM_AMORTIZATION",      form: "1120",       schedule: "L",    line: "12b" },

  // Fixed Asset accumulated depreciation (contra-asset on Schedule L line 9b)
  "Fixed Asset|AccumulatedDepreciation": { semantic_category: "accum_depreciation",     tax_code: "ACCUM_DEPRECIATION",      form: "1120",       schedule: "L",    line: "9b" },

  // ── Accounts Payable ──────────────────────────────────────────────────────
  // Schedule L line 16
  "Accounts Payable":                  { semantic_category: "accounts_payable",         tax_code: "ACCOUNTS_PAYABLE",        form: "1120",       schedule: "L",    line: "16" },

  // ── Credit Card (current liability) ──────────────────────────────────────
  // Schedule L line 17
  "Credit Card":                       { semantic_category: "credit_card_liability",    tax_code: "CREDIT_CARD_LIABILITY",   form: "1120",       schedule: "L",    line: "17" },

  // ── Other Current Liabilities ─────────────────────────────────────────────
  // Schedule L lines 17-18
  "Other Current Liability":           { semantic_category: "other_current_liabilities", tax_code: "OTHER_CURRENT_LIABS",   form: "1120",       schedule: "L",    line: "18" },
  "Other Current Liability|PayrollTaxPayable": { semantic_category: "other_current_liabilities", tax_code: "OTHER_CURRENT_LIABS", form: "1120", schedule: "L",    line: "18" },
  "Other Current Liability|SalesTaxPayable": { semantic_category: "other_current_liabilities", tax_code: "OTHER_CURRENT_LIABS",  form: "1120", schedule: "L",    line: "18" },
  "Other Current Liability|LineOfCredit": { semantic_category: "other_current_liabilities", tax_code: "OTHER_CURRENT_LIABS",    form: "1120", schedule: "L",    line: "18" },
  "Other Current Liability|PayrollClearing": { semantic_category: "other_current_liabilities", tax_code: "OTHER_CURRENT_LIABS", form: "1120", schedule: "L",    line: "18" },
  "Other Current Liability|OtherCurrentLiabilities": { semantic_category: "other_current_liabilities", tax_code: "OTHER_CURRENT_LIABS", form: "1120", schedule: "L", line: "18" },

  // ── Long-Term Liabilities ─────────────────────────────────────────────────
  // Schedule L lines 19-20
  "Long Term Liability":               { semantic_category: "long_term_liabilities",    tax_code: "LONG_TERM_LIABILITIES",   form: "1120",       schedule: "L",    line: "20" },
  "Long Term Liability|NotesPayable":  { semantic_category: "long_term_liabilities",    tax_code: "LONG_TERM_LIABILITIES",   form: "1120",       schedule: "L",    line: "20" },
  "Long Term Liability|ShareholderNotesPayable": { semantic_category: "shareholder_loans", tax_code: "SHAREHOLDER_LOANS",    form: "1120",       schedule: "L",    line: "19" },
  "Long Term Liability|OtherLongTermLiabilities": { semantic_category: "long_term_liabilities", tax_code: "LONG_TERM_LIABILITIES", form: "1120", schedule: "L",   line: "20" },
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
