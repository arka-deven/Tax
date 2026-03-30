/**
 * IRS form field definitions — maps each form line to a tax fact or computation.
 * Used by the interactive form canvas to auto-populate and allow manual edits.
 */

export type FieldType = "currency" | "text" | "boolean" | "percent" | "heading";

export interface FormFieldDef {
  line: string;
  label: string;
  type: FieldType;
  /** Auto-populate from this tax fact name */
  factName?: string;
  /** Compute from other line values: ["+", "1a", "1b"] for sum, ["-", "1a", "1b"] for 1a minus 1b */
  compute?: [op: "+" | "-", ...lines: string[]];
  /** Section divider — not an input, just a label */
  section?: boolean;
  /** Visual emphasis */
  bold?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM 1120 — U.S. Corporation Income Tax Return
// ═══════════════════════════════════════════════════════════════════════════════

const FORM_1120: FormFieldDef[] = [
  { line: "_inc", label: "Income",                                     type: "heading", section: true },
  { line: "1a",  label: "Gross receipts or sales",                     type: "currency", factName: "gross_receipts_total" },
  { line: "1b",  label: "Returns and allowances",                      type: "currency" },
  { line: "1c",  label: "Balance (1a minus 1b)",                       type: "currency", compute: ["-", "1a", "1b"], bold: true },
  { line: "2",   label: "Cost of goods sold (Form 1125-A)",            type: "currency", factName: "cogs_total" },
  { line: "3",   label: "Gross profit (1c minus 2)",                   type: "currency", compute: ["-", "1c", "2"], bold: true },
  { line: "4",   label: "Dividends and inclusions (Schedule C)",       type: "currency", factName: "dividend_income_total" },
  { line: "5",   label: "Interest",                                    type: "currency", factName: "interest_income_total" },
  { line: "6",   label: "Gross rents",                                 type: "currency" },
  { line: "7",   label: "Gross royalties",                             type: "currency" },
  { line: "8",   label: "Capital gain net income (Schedule D)",        type: "currency" },
  { line: "9",   label: "Net gain or (loss) (Form 4797)",              type: "currency" },
  { line: "10",  label: "Other income",                                type: "currency", factName: "other_income_total" },
  { line: "11",  label: "Total income (lines 3 through 10)",           type: "currency", compute: ["+", "3", "4", "5", "6", "7", "8", "9", "10"], bold: true },

  { line: "_ded", label: "Deductions",                                 type: "heading", section: true },
  { line: "12",  label: "Compensation of officers (Form 1125-E)",      type: "currency", factName: "officer_compensation_total" },
  { line: "13",  label: "Salaries and wages",                          type: "currency", factName: "wages_total" },
  { line: "14",  label: "Repairs and maintenance",                     type: "currency", factName: "repairs_total" },
  { line: "15",  label: "Bad debts",                                   type: "currency", factName: "bad_debt_total" },
  { line: "16",  label: "Rents",                                       type: "currency", factName: "rent_building_total" },
  { line: "17",  label: "Taxes and licenses",                          type: "currency", factName: "taxes_licenses_total" },
  { line: "18",  label: "Interest",                                    type: "currency", factName: "interest_expense_total" },
  { line: "19",  label: "Charitable contributions",                    type: "currency", factName: "charitable_contributions_total" },
  { line: "20",  label: "Depreciation (Form 4562)",                    type: "currency", factName: "depreciation_total" },
  { line: "21",  label: "Depletion",                                   type: "currency" },
  { line: "22",  label: "Advertising",                                 type: "currency", factName: "advertising_total" },
  { line: "23",  label: "Pension, profit-sharing, etc., plans",        type: "currency" },
  { line: "24",  label: "Employee benefit programs",                   type: "currency" },
  { line: "25",  label: "Reserved for future use",                     type: "currency" },
  { line: "26",  label: "Other deductions (attach statement)",         type: "currency", factName: "general_deduction_total" },
  { line: "27",  label: "Total deductions (lines 12 through 26)",      type: "currency", compute: ["+", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26"], bold: true },

  { line: "_tax", label: "Tax Computation",                            type: "heading", section: true },
  { line: "28",  label: "Taxable income before NOL (line 11 minus 27)", type: "currency", compute: ["-", "11", "27"], bold: true },
  { line: "29a", label: "Net operating loss deduction",                type: "currency" },
  { line: "29b", label: "Special deductions (Schedule C, line 24)",    type: "currency" },
  { line: "30",  label: "Taxable income (28 minus 29a and 29b)",       type: "currency", compute: ["-", "28", "29a", "29b"], bold: true },
  { line: "31",  label: "Total tax (Schedule J)",                      type: "currency" },
  { line: "32",  label: "Total payments, credits, and section 267A",   type: "currency" },
  { line: "33",  label: "Estimated tax penalty",                       type: "currency" },
  { line: "34",  label: "Amount owed (31 minus 32 plus 33)",           type: "currency", compute: ["+", "31", "33", "-32_neg"] },
  { line: "35",  label: "Overpayment",                                 type: "currency" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FORM 1120-S — U.S. Income Tax Return for an S Corporation
// ═══════════════════════════════════════════════════════════════════════════════

const FORM_1120S: FormFieldDef[] = [
  { line: "_inc", label: "Income",                                     type: "heading", section: true },
  { line: "1a",  label: "Gross receipts or sales",                     type: "currency", factName: "gross_receipts_total" },
  { line: "1b",  label: "Returns and allowances",                      type: "currency" },
  { line: "1c",  label: "Balance (1a minus 1b)",                       type: "currency", compute: ["-", "1a", "1b"], bold: true },
  { line: "2",   label: "Cost of goods sold (Form 1125-A)",            type: "currency", factName: "cogs_total" },
  { line: "3",   label: "Gross profit (1c minus 2)",                   type: "currency", compute: ["-", "1c", "2"], bold: true },
  { line: "4",   label: "Net gain (loss) (Form 4797)",                 type: "currency" },
  { line: "5",   label: "Other income (loss)",                         type: "currency", factName: "other_income_total" },
  { line: "6",   label: "Total income (loss) (3 through 5)",           type: "currency", compute: ["+", "3", "4", "5"], bold: true },

  { line: "_ded", label: "Deductions",                                 type: "heading", section: true },
  { line: "7",   label: "Compensation of officers",                    type: "currency", factName: "officer_compensation_total" },
  { line: "8",   label: "Salaries and wages",                          type: "currency", factName: "wages_total" },
  { line: "9",   label: "Repairs and maintenance",                     type: "currency", factName: "repairs_total" },
  { line: "10",  label: "Bad debts",                                   type: "currency", factName: "bad_debt_total" },
  { line: "11",  label: "Rents",                                       type: "currency", factName: "rent_building_total" },
  { line: "12",  label: "Taxes and licenses",                          type: "currency", factName: "taxes_licenses_total" },
  { line: "13",  label: "Interest",                                    type: "currency", factName: "interest_expense_total" },
  { line: "14",  label: "Depreciation (Form 4562)",                    type: "currency", factName: "depreciation_total" },
  { line: "15",  label: "Depletion",                                   type: "currency" },
  { line: "16",  label: "Advertising",                                 type: "currency", factName: "advertising_total" },
  { line: "17",  label: "Pension, profit-sharing, etc., plans",        type: "currency" },
  { line: "18",  label: "Employee benefit programs",                   type: "currency" },
  { line: "19",  label: "Other deductions (attach statement)",         type: "currency", factName: "general_deduction_total" },
  { line: "20",  label: "Total deductions (lines 7 through 19)",       type: "currency", compute: ["+", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"], bold: true },

  { line: "_inc2", label: "Tax and Payments",                          type: "heading", section: true },
  { line: "21",  label: "Ordinary business income (loss) (6 minus 20)", type: "currency", compute: ["-", "6", "20"], bold: true },
  { line: "22a", label: "Excess net passive income tax",               type: "currency" },
  { line: "22b", label: "Built-in gains tax (Schedule D)",             type: "currency" },
  { line: "22c", label: "Total tax (22a + 22b)",                       type: "currency", compute: ["+", "22a", "22b"] },
  { line: "23",  label: "Total payments, credits",                     type: "currency" },
  { line: "24",  label: "Estimated tax penalty",                       type: "currency" },
  { line: "25",  label: "Amount owed",                                 type: "currency" },
  { line: "26",  label: "Overpayment",                                 type: "currency" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FORM 1065 — U.S. Return of Partnership Income
// ═══════════════════════════════════════════════════════════════════════════════

const FORM_1065: FormFieldDef[] = [
  { line: "_inc", label: "Income",                                     type: "heading", section: true },
  { line: "1a",  label: "Gross receipts or sales",                     type: "currency", factName: "gross_receipts_total" },
  { line: "1b",  label: "Returns and allowances",                      type: "currency" },
  { line: "1c",  label: "Balance (1a minus 1b)",                       type: "currency", compute: ["-", "1a", "1b"], bold: true },
  { line: "2",   label: "Cost of goods sold (Form 1125-A)",            type: "currency", factName: "cogs_total" },
  { line: "3",   label: "Gross profit (1c minus 2)",                   type: "currency", compute: ["-", "1c", "2"], bold: true },
  { line: "4",   label: "Ordinary income (loss) from other partnerships", type: "currency" },
  { line: "5",   label: "Net farm profit (loss)",                      type: "currency" },
  { line: "6",   label: "Net gain (loss) (Form 4797)",                 type: "currency" },
  { line: "7",   label: "Other income (loss)",                         type: "currency", factName: "other_income_total" },
  { line: "8",   label: "Total income (loss) (3 through 7)",           type: "currency", compute: ["+", "3", "4", "5", "6", "7"], bold: true },

  { line: "_ded", label: "Deductions",                                 type: "heading", section: true },
  { line: "9",   label: "Salaries and wages",                          type: "currency", factName: "wages_total" },
  { line: "10",  label: "Guaranteed payments to partners",             type: "currency" },
  { line: "11",  label: "Repairs and maintenance",                     type: "currency", factName: "repairs_total" },
  { line: "12",  label: "Bad debts",                                   type: "currency", factName: "bad_debt_total" },
  { line: "13",  label: "Rent",                                        type: "currency", factName: "rent_building_total" },
  { line: "14",  label: "Taxes and licenses",                          type: "currency", factName: "taxes_licenses_total" },
  { line: "15",  label: "Interest",                                    type: "currency", factName: "interest_expense_total" },
  { line: "16a", label: "Depreciation (Form 4562)",                    type: "currency", factName: "depreciation_total" },
  { line: "16b", label: "Less depreciation on Form 1125-A and elsewhere", type: "currency" },
  { line: "16c", label: "Net depreciation (16a minus 16b)",            type: "currency", compute: ["-", "16a", "16b"] },
  { line: "17",  label: "Depletion (not oil and gas)",                 type: "currency" },
  { line: "18",  label: "Retirement plans, etc.",                      type: "currency" },
  { line: "19",  label: "Employee benefit programs",                   type: "currency" },
  { line: "20",  label: "Other deductions (attach statement)",         type: "currency", factName: "general_deduction_total" },
  { line: "21",  label: "Total deductions (9 through 20)",             type: "currency", compute: ["+", "9", "10", "11", "12", "13", "14", "15", "16c", "17", "18", "19", "20"], bold: true },
  { line: "22",  label: "Ordinary business income (loss) (8 minus 21)", type: "currency", compute: ["-", "8", "21"], bold: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE C — Profit or Loss from Business (Sole Proprietors / Single-Member LLC)
// ═══════════════════════════════════════════════════════════════════════════════

const SCHEDULE_C: FormFieldDef[] = [
  { line: "_inc", label: "Income",                                     type: "heading", section: true },
  { line: "1",   label: "Gross receipts or sales",                     type: "currency", factName: "gross_receipts_total" },
  { line: "2",   label: "Returns and allowances",                      type: "currency" },
  { line: "3",   label: "Subtract line 2 from line 1",                 type: "currency", compute: ["-", "1", "2"], bold: true },
  { line: "4",   label: "Cost of goods sold (line 42)",                type: "currency", factName: "cogs_total" },
  { line: "5",   label: "Gross profit (3 minus 4)",                    type: "currency", compute: ["-", "3", "4"], bold: true },
  { line: "6",   label: "Other income",                                type: "currency", factName: "other_income_total" },
  { line: "7",   label: "Gross income (5 plus 6)",                     type: "currency", compute: ["+", "5", "6"], bold: true },

  { line: "_exp", label: "Expenses",                                   type: "heading", section: true },
  { line: "8",   label: "Advertising",                                 type: "currency", factName: "advertising_total" },
  { line: "9",   label: "Car and truck expenses",                      type: "currency" },
  { line: "10",  label: "Commissions and fees",                        type: "currency", factName: "commission_total" },
  { line: "11",  label: "Contract labor",                              type: "currency" },
  { line: "12",  label: "Depletion",                                   type: "currency" },
  { line: "13",  label: "Depreciation and Section 179 (Form 4562)",    type: "currency", factName: "depreciation_total" },
  { line: "14",  label: "Employee benefit programs",                   type: "currency" },
  { line: "15",  label: "Insurance (other than health)",               type: "currency", factName: "insurance_total" },
  { line: "16a", label: "Mortgage interest paid to financial institutions", type: "currency" },
  { line: "16b", label: "Other interest",                              type: "currency", factName: "interest_expense_total" },
  { line: "17",  label: "Legal and professional services",             type: "currency", factName: "professional_fees_total" },
  { line: "18",  label: "Office expense",                              type: "currency", factName: "office_expense_total" },
  { line: "19",  label: "Pension and profit-sharing plans",            type: "currency" },
  { line: "20a", label: "Rent — vehicles, machinery, equipment",       type: "currency", factName: "rent_equipment_total" },
  { line: "20b", label: "Rent — other business property",              type: "currency", factName: "rent_building_total" },
  { line: "21",  label: "Repairs and maintenance",                     type: "currency", factName: "repairs_total" },
  { line: "22",  label: "Supplies (not in COGS)",                      type: "currency" },
  { line: "23",  label: "Taxes and licenses",                          type: "currency", factName: "taxes_licenses_total" },
  { line: "24a", label: "Travel",                                      type: "currency", factName: "travel_total" },
  { line: "24b", label: "Deductible meals (50% limit)",                type: "currency", factName: "meals_subject_to_limitation_total" },
  { line: "25",  label: "Utilities",                                   type: "currency", factName: "utilities_total" },
  { line: "26",  label: "Wages (less employment credits)",             type: "currency", factName: "wages_total" },
  { line: "27a", label: "Other expenses (from line 48)",               type: "currency", factName: "general_deduction_total" },
  { line: "28",  label: "Total expenses (8 through 27a)",              type: "currency", compute: ["+", "8", "9", "10", "11", "12", "13", "14", "15", "16a", "16b", "17", "18", "19", "20a", "20b", "21", "22", "23", "24a", "24b", "25", "26", "27a"], bold: true },

  { line: "_net", label: "Net Profit or Loss",                         type: "heading", section: true },
  { line: "29",  label: "Tentative profit (loss) (7 minus 28)",        type: "currency", compute: ["-", "7", "28"], bold: true },
  { line: "30",  label: "Expenses for business use of your home (Form 8829)", type: "currency" },
  { line: "31",  label: "Net profit or (loss) (29 minus 30)",          type: "currency", compute: ["-", "29", "30"], bold: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FORM 990 — Return of Organization Exempt from Income Tax (Summary Part I)
// ═══════════════════════════════════════════════════════════════════════════════

const FORM_990: FormFieldDef[] = [
  { line: "_rev", label: "Revenue",                                    type: "heading", section: true },
  { line: "8",   label: "Contributions and grants",                    type: "currency", factName: "gross_receipts_total" },
  { line: "9",   label: "Program service revenue",                     type: "currency" },
  { line: "10",  label: "Investment income",                           type: "currency", factName: "interest_income_total" },
  { line: "11",  label: "Other revenue",                               type: "currency", factName: "other_income_total" },
  { line: "12",  label: "Total revenue (add lines 8 through 11)",      type: "currency", compute: ["+", "8", "9", "10", "11"], bold: true },

  { line: "_exp", label: "Expenses",                                   type: "heading", section: true },
  { line: "13",  label: "Grants and similar amounts paid",             type: "currency" },
  { line: "14",  label: "Benefits paid to or for members",             type: "currency" },
  { line: "15",  label: "Salaries, other compensation, employee benefits", type: "currency", factName: "wages_total" },
  { line: "16a", label: "Professional fundraising fees",               type: "currency" },
  { line: "16b", label: "Total fundraising expenses",                  type: "currency" },
  { line: "17",  label: "Other expenses",                              type: "currency", factName: "general_deduction_total" },
  { line: "18",  label: "Total expenses (add lines 13 through 17)",    type: "currency", compute: ["+", "13", "14", "15", "16a", "17"], bold: true },
  { line: "19",  label: "Revenue less expenses (line 12 minus 18)",    type: "currency", compute: ["-", "12", "18"], bold: true },

  { line: "_bal", label: "Net Assets / Fund Balances",                 type: "heading", section: true },
  { line: "20",  label: "Total assets (end of year)",                  type: "currency", factName: "total_assets" },
  { line: "21",  label: "Total liabilities (end of year)",             type: "currency" },
  { line: "22",  label: "Net assets or fund balances (20 minus 21)",   type: "currency", compute: ["-", "20", "21"], bold: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE L — Balance Sheet per Books
// ═══════════════════════════════════════════════════════════════════════════════

const SCHEDULE_L: FormFieldDef[] = [
  { line: "_a",  label: "Assets",                                      type: "heading", section: true },
  { line: "1",   label: "Cash",                                        type: "currency" },
  { line: "2a",  label: "Trade notes and accounts receivable",         type: "currency" },
  { line: "2b",  label: "Less allowance for bad debts",                type: "currency" },
  { line: "5",   label: "Tax-exempt securities",                       type: "currency" },
  { line: "6",   label: "Other current assets",                        type: "currency" },
  { line: "9a",  label: "Buildings and other depreciable assets",       type: "currency" },
  { line: "9b",  label: "Less accumulated depreciation",               type: "currency" },
  { line: "10a", label: "Land",                                        type: "currency" },
  { line: "13",  label: "Other assets",                                type: "currency" },
  { line: "14",  label: "Total assets",                                type: "currency", factName: "total_assets", bold: true },

  { line: "_l",  label: "Liabilities and Equity",                      type: "heading", section: true },
  { line: "15",  label: "Accounts payable",                            type: "currency" },
  { line: "17",  label: "Other current liabilities",                   type: "currency" },
  { line: "19",  label: "Loans from shareholders",                     type: "currency" },
  { line: "20",  label: "Mortgages, notes, bonds payable (≥ 1 year)",  type: "currency" },
  { line: "21",  label: "Other liabilities",                           type: "currency" },
  { line: "22",  label: "Capital stock",                               type: "currency" },
  { line: "23",  label: "Additional paid-in capital",                   type: "currency" },
  { line: "24",  label: "Retained earnings — appropriated",            type: "currency" },
  { line: "25",  label: "Retained earnings — unappropriated",          type: "currency" },
  { line: "27",  label: "Total liabilities and shareholders' equity",   type: "currency", bold: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE M-1 — Reconciliation of Income (Loss) per Books with Income per Return
// ═══════════════════════════════════════════════════════════════════════════════

const SCHEDULE_M1: FormFieldDef[] = [
  { line: "1",   label: "Net income (loss) per books",                 type: "currency", factName: "net_income_before_tax" },
  { line: "2",   label: "Federal income tax per books",                type: "currency", factName: "income_tax_expense_total" },
  { line: "3",   label: "Excess of capital losses over capital gains",  type: "currency" },
  { line: "4",   label: "Income subject to tax not recorded on books", type: "currency" },
  { line: "5a",  label: "Expenses recorded on books not on return — depreciation", type: "currency" },
  { line: "5b",  label: "Expenses recorded on books not on return — charitable", type: "currency" },
  { line: "5c",  label: "Expenses recorded on books not on return — travel & entertainment", type: "currency", factName: "meals_subject_to_limitation_total" },
  { line: "6",   label: "Add lines 1 through 5c",                      type: "currency", compute: ["+", "1", "2", "3", "4", "5a", "5b", "5c"], bold: true },
  { line: "7a",  label: "Income recorded on books not on return — tax-exempt interest", type: "currency" },
  { line: "7b",  label: "Income recorded on books not on return — other", type: "currency" },
  { line: "8",   label: "Deductions on return not charged against book income", type: "currency" },
  { line: "9",   label: "Add lines 7a through 8",                      type: "currency", compute: ["+", "7a", "7b", "8"] },
  { line: "10",  label: "Income (line 28, Form 1120) — line 6 minus 9", type: "currency", compute: ["-", "6", "9"], bold: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE M-2 — Analysis of Unappropriated Retained Earnings per Books
// ═══════════════════════════════════════════════════════════════════════════════

const SCHEDULE_M2: FormFieldDef[] = [
  { line: "1",   label: "Balance at beginning of year",                type: "currency" },
  { line: "2",   label: "Net income (loss) per books",                 type: "currency", factName: "net_income_before_tax" },
  { line: "3",   label: "Other increases",                             type: "currency" },
  { line: "4",   label: "Total of lines 1, 2, and 3",                  type: "currency", compute: ["+", "1", "2", "3"], bold: true },
  { line: "5",   label: "Distributions: (a) Cash",                     type: "currency" },
  { line: "6",   label: "Distributions: (b) Stock",                    type: "currency" },
  { line: "7",   label: "Other decreases",                             type: "currency" },
  { line: "8",   label: "Balance at end of year (4 minus 5, 6, 7)",    type: "currency", compute: ["-", "4", "5", "6", "7"], bold: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FORM 1125-A — Cost of Goods Sold
// ═══════════════════════════════════════════════════════════════════════════════

const FORM_1125A: FormFieldDef[] = [
  { line: "1",   label: "Inventory at beginning of year",              type: "currency" },
  { line: "2",   label: "Purchases",                                   type: "currency" },
  { line: "3",   label: "Cost of labor",                               type: "currency" },
  { line: "4a",  label: "Additional section 263A costs",               type: "currency" },
  { line: "4b",  label: "Other costs",                                 type: "currency" },
  { line: "5",   label: "Total (add lines 1 through 4b)",              type: "currency", compute: ["+", "1", "2", "3", "4a", "4b"], bold: true },
  { line: "6",   label: "Inventory at end of year",                    type: "currency" },
  { line: "7",   label: "Cost of goods sold (5 minus 6)",              type: "currency", compute: ["-", "5", "6"], bold: true },
  { line: "8",   label: "Valuation method: Cost / Lower of cost or market", type: "text" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE SE — Self-Employment Tax
// ═══════════════════════════════════════════════════════════════════════════════

const SCHEDULE_SE: FormFieldDef[] = [
  { line: "1a",  label: "Net farm profit or (loss) (Schedule F)",      type: "currency" },
  { line: "1b",  label: "Social security tips (if applicable)",        type: "currency" },
  { line: "2",   label: "Net profit or (loss) from Schedule C",        type: "currency", factName: "net_income_before_tax" },
  { line: "3",   label: "Combine lines 1a, 1b, and 2",                type: "currency", compute: ["+", "1a", "1b", "2"] },
  { line: "4a",  label: "If line 3 is more than zero, multiply by 92.35%", type: "currency" },
  { line: "5a",  label: "Social Security tax (6.2% on first $176,100)", type: "currency" },
  { line: "5b",  label: "Medicare tax (1.45% of line 4a)",             type: "currency" },
  { line: "6",   label: "Self-employment tax (add 5a and 5b)",         type: "currency", compute: ["+", "5a", "5b"], bold: true },
  { line: "7",   label: "Deductible part of SE tax (50% of line 6)",   type: "currency" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FORM 4562 — Depreciation and Amortization (Summary)
// ═══════════════════════════════════════════════════════════════════════════════

const FORM_4562: FormFieldDef[] = [
  { line: "_179", label: "Part I — Election to Expense (Section 179)", type: "heading", section: true },
  { line: "1",   label: "Maximum amount (2025: $1,250,000)",           type: "currency" },
  { line: "2",   label: "Total cost of section 179 property placed in service", type: "currency" },
  { line: "3",   label: "Threshold cost (2025: $3,130,000)",           type: "currency" },
  { line: "5",   label: "Dollar limitation for tax year",              type: "currency" },
  { line: "11",  label: "Business income limitation",                  type: "currency" },
  { line: "12",  label: "Section 179 expense deduction",               type: "currency" },

  { line: "_bonus", label: "Part II — Special Depreciation Allowance", type: "heading", section: true },
  { line: "14",  label: "Special (bonus) depreciation (2025: 40%)",    type: "currency" },

  { line: "_macrs", label: "Part III — MACRS Depreciation",            type: "heading", section: true },
  { line: "17",  label: "MACRS deductions for assets placed in service in prior years", type: "currency" },
  { line: "19",  label: "MACRS deductions for assets placed in service this year", type: "currency" },
  { line: "21",  label: "Listed property (Part V, line 28)",           type: "currency" },
  { line: "22",  label: "Total (add 12, 14, 17, 19, 20, 21)",         type: "currency", compute: ["+", "12", "14", "17", "19", "21"], bold: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE D — Capital Gains and Losses (Summary lines)
// ═══════════════════════════════════════════════════════════════════════════════

const SCHEDULE_D: FormFieldDef[] = [
  { line: "_st", label: "Part I — Short-Term Capital Gains and Losses", type: "heading", section: true },
  { line: "1",   label: "Short-term totals from broker statements",    type: "currency" },
  { line: "4",   label: "Short-term gain from like-kind exchanges",    type: "currency" },
  { line: "5",   label: "Net short-term capital gain (loss)",          type: "currency", bold: true },

  { line: "_lt", label: "Part II — Long-Term Capital Gains and Losses", type: "heading", section: true },
  { line: "8a",  label: "Long-term totals from broker statements",     type: "currency" },
  { line: "11",  label: "Long-term gain from like-kind exchanges",     type: "currency" },
  { line: "12",  label: "Net long-term capital gain (loss)",           type: "currency", bold: true },

  { line: "_sum", label: "Summary",                                    type: "heading", section: true },
  { line: "16",  label: "Combine lines 5 and 12",                      type: "currency", compute: ["+", "5", "12"], bold: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FORM 8995 — Qualified Business Income Deduction (Simplified)
// ═══════════════════════════════════════════════════════════════════════════════

const FORM_8995: FormFieldDef[] = [
  { line: "1",   label: "Trade, business, or aggregation name",        type: "text" },
  { line: "2",   label: "EIN",                                        type: "text", factName: "ein" },
  { line: "3",   label: "Qualified business income or (loss)",         type: "currency", factName: "net_income_before_tax" },
  { line: "4",   label: "Total qualified business income or (loss)",   type: "currency" },
  { line: "5",   label: "Qualified business net income (loss)",        type: "currency" },
  { line: "10",  label: "QBI component (multiply line 5 by 20%)",     type: "currency" },
  { line: "11",  label: "Taxable income before QBI deduction",        type: "currency" },
  { line: "12",  label: "Net capital gain",                            type: "currency" },
  { line: "13",  label: "Subtract line 12 from line 11 (if greater than zero)", type: "currency", compute: ["-", "11", "12"] },
  { line: "14",  label: "Income limitation (multiply line 13 by 20%)", type: "currency" },
  { line: "15",  label: "QBI deduction (smaller of line 10 or 14)",    type: "currency", bold: true },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map from a form code (as used in FORMS_BY_ENTITY on the page) to its field definitions.
 * Use the IRS form number or schedule name as the key.
 */
export const FORM_FIELD_DEFS: Record<string, FormFieldDef[]> = {
  "1120":    FORM_1120,
  "1120-S":  FORM_1120S,
  "1065":    FORM_1065,
  "Sch C":   SCHEDULE_C,
  "990":     FORM_990,
  "Sch L":   SCHEDULE_L,
  "Sch M-1": SCHEDULE_M1,
  "Sch M-2": SCHEDULE_M2,
  "1125-A":  FORM_1125A,
  "Sch SE":  SCHEDULE_SE,
  "4562":    FORM_4562,
  "Sch D":   SCHEDULE_D,
  "8995":    FORM_8995,
};

/**
 * Given a fact map, auto-populate form field values.
 * Returns a map: formCode → { line → value }.
 */
export function computeFormValues(
  formCode: string,
  facts: Record<string, unknown>
): Record<string, string> {
  const defs = FORM_FIELD_DEFS[formCode];
  if (!defs) return {};

  const values: Record<string, string> = {};

  // First pass: populate from facts
  for (const f of defs) {
    if (f.section) continue;
    if (f.factName && facts[f.factName] != null) {
      const v = facts[f.factName];
      if (f.type === "currency" && typeof v === "number") {
        values[f.line] = v.toFixed(2);
      } else if (f.type === "boolean") {
        values[f.line] = String(v);
      } else {
        values[f.line] = String(v);
      }
    }
  }

  // Second pass: compute derived values
  for (const f of defs) {
    if (!f.compute || f.section) continue;
    const [op, ...lines] = f.compute;
    const nums = lines.map((l) => parseFloat(values[l] || "0") || 0);
    let result: number;
    if (op === "+") {
      result = nums.reduce((a, b) => a + b, 0);
    } else {
      result = nums[0] - nums.slice(1).reduce((a, b) => a + b, 0);
    }
    // Only set computed value if not already manually set
    if (!values[f.line]) {
      values[f.line] = result.toFixed(2);
    }
  }

  return values;
}

/**
 * Recompute any computed fields based on current values.
 * Called after manual edits to update subtotals.
 */
export function recomputeFields(
  formCode: string,
  values: Record<string, string>
): Record<string, string> {
  const defs = FORM_FIELD_DEFS[formCode];
  if (!defs) return values;

  const updated = { ...values };

  for (const f of defs) {
    if (!f.compute || f.section) continue;
    const [op, ...lines] = f.compute;
    const nums = lines.map((l) => parseFloat(updated[l] || "0") || 0);
    let result: number;
    if (op === "+") {
      result = nums.reduce((a, b) => a + b, 0);
    } else {
      result = nums[0] - nums.slice(1).reduce((a, b) => a + b, 0);
    }
    updated[f.line] = result.toFixed(2);
  }

  return updated;
}
