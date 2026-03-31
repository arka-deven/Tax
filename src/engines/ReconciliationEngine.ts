import type { TaxFact } from "../models/index.js";

/**
 * M-1 and M-2 reconciliation engines.
 *
 * M-1: Reconciliation of income (loss) per books with income (loss) per return.
 * M-2: Analysis of Accumulated Adjustments Account (AAA) for S-Corps,
 *       or Partners' Capital Accounts for partnerships.
 */

// ── Schedule M-1 ────────────────────────────────────────────────────────────

interface M1Line {
  line: string;
  factName: string;
  description: string;
  side: "left" | "right"; // left = additions to book income, right = subtractions
}

const M1_LINES: M1Line[] = [
  // Left side: Book income → Return income (additions)
  { line: "1",  factName: "m1_net_income_per_books",        description: "Net income (loss) per books",           side: "left" },
  { line: "2",  factName: "m1_federal_income_tax",          description: "Federal income tax per books",          side: "left" },
  { line: "3",  factName: "m1_excess_capital_losses",        description: "Excess of capital losses over capital gains", side: "left" },
  { line: "4",  factName: "m1_income_not_on_books",          description: "Income included on return not on books", side: "left" },
  { line: "5a", factName: "m1_expenses_on_books_not_return", description: "Expenses on books not on return",       side: "left" },
  { line: "5b", factName: "m1_depreciation_book_excess",     description: "Depreciation (book exceeds return)",    side: "left" },
  { line: "5c", factName: "m1_travel_entertainment_book",    description: "Travel and entertainment (nondeductible)", side: "left" },

  // Right side: Return income → Book income (subtractions)
  { line: "7",  factName: "m1_income_on_return_not_books",   description: "Income on return not in books",         side: "right" },
  { line: "8a", factName: "m1_deductions_not_on_books",      description: "Deductions on return not charged against book income", side: "right" },
  { line: "8b", factName: "m1_depreciation_return_excess",   description: "Depreciation (return exceeds books)",   side: "right" },
];

/**
 * Derive M-1 facts. Most M-1 items require manual input or
 * are computed from the difference between book and tax amounts.
 */
export function deriveM1Facts(
  entityId: string,
  taxYear: number,
  existingFacts: TaxFact[],
): TaxFact[] {
  const get = (name: string): number => {
    const f = existingFacts.find((f) => f.fact_name === name);
    return typeof f?.fact_value_json === "number" ? f.fact_value_json : 0;
  };

  const results: TaxFact[] = [];

  // Line 1: Net income per books ≈ ordinary_business_income (simplified)
  const netIncomeBooks = get("ordinary_business_income");
  results.push(makeFact(entityId, taxYear, "m1_net_income_per_books", netIncomeBooks, "M-1 Line 1: Net income (loss) per books"));

  // Line 2: Federal income tax per books (nondeductible for C-Corps)
  const fedTax = get("income_tax_expense_total");
  results.push(makeFact(entityId, taxYear, "m1_federal_income_tax", fedTax, "M-1 Line 2: Federal income tax per books"));

  // Line 5c: Travel and entertainment — 50% meals disallowance
  const mealsDisallowed = get("meals_subject_to_limitation_total") * 0.50;
  results.push(makeFact(entityId, taxYear, "m1_travel_entertainment_book", mealsDisallowed, "M-1 Line 5c: 50% meals limitation per IRC §274(n)"));

  // Lines 5a: Other book expenses not deducted on return = nondeductible total
  const nondeductible = get("nondeductible_total");
  results.push(makeFact(entityId, taxYear, "m1_expenses_on_books_not_return", nondeductible, "M-1 Line 5a: Nondeductible expenses on books"));

  // Remaining M-1 lines default to 0 (require manual adjustment or are uncommon)
  for (const line of M1_LINES) {
    if (!results.find((r) => r.fact_name === line.factName)) {
      results.push(makeFact(entityId, taxYear, line.factName, 0, `M-1 Line ${line.line}: ${line.description} (default 0)`));
    }
  }

  // Line 6 (left total) = Lines 1 + 2 + 3 + 4 + 5a + 5b + 5c
  const leftTotal = results
    .filter((r) => M1_LINES.find((l) => l.factName === r.fact_name && l.side === "left"))
    .reduce((acc, r) => acc + (typeof r.fact_value_json === "number" ? r.fact_value_json : 0), 0);
  results.push(makeFact(entityId, taxYear, "m1_left_total", leftTotal, "M-1 Line 6: Total of Lines 1 through 5c"));

  // Line 9 (right total) = Lines 7 + 8a + 8b
  const rightTotal = results
    .filter((r) => M1_LINES.find((l) => l.factName === r.fact_name && l.side === "right"))
    .reduce((acc, r) => acc + (typeof r.fact_value_json === "number" ? r.fact_value_json : 0), 0);
  results.push(makeFact(entityId, taxYear, "m1_right_total", rightTotal, "M-1 Line 9: Total of Lines 7 through 8b"));

  // Line 10: Income per return = Line 6 - Line 9
  const incomePerReturn = leftTotal - rightTotal;
  results.push(makeFact(entityId, taxYear, "m1_income_per_return", incomePerReturn, "M-1 Line 10: Income (loss) per return = Line 6 - Line 9"));

  return results;
}

// ── Schedule M-2 (AAA Analysis for S-Corps) ─────────────────────────────────

interface M2Line {
  line: string;
  factName: string;
  description: string;
}

const M2_LINES: M2Line[] = [
  { line: "1",  factName: "m2_boy_balance",          description: "Balance at beginning of tax year" },
  { line: "2",  factName: "m2_ordinary_income",      description: "Ordinary income" },
  { line: "3",  factName: "m2_other_additions",      description: "Other additions" },
  { line: "4",  factName: "m2_loss",                 description: "Loss" },
  { line: "5a", factName: "m2_distributions_cash",   description: "Distributions — cash" },
  { line: "5b", factName: "m2_distributions_property",description: "Distributions — property" },
  { line: "6",  factName: "m2_other_reductions",     description: "Other reductions" },
  { line: "7",  factName: "m2_eoy_balance",          description: "Balance at end of tax year" },
];

/**
 * Derive M-2 (AAA) facts.
 * Line 7 = Line 1 + Line 2 + Line 3 - Line 4 - Line 5a - Line 5b - Line 6
 */
export function deriveM2Facts(
  entityId: string,
  taxYear: number,
  existingFacts: TaxFact[],
  priorYearFacts: TaxFact[],
): TaxFact[] {
  const get = (name: string): number => {
    const f = existingFacts.find((f) => f.fact_name === name);
    return typeof f?.fact_value_json === "number" ? f.fact_value_json : 0;
  };

  const getPrior = (name: string): number => {
    const f = priorYearFacts.find((f) => f.fact_name === name);
    return typeof f?.fact_value_json === "number" ? f.fact_value_json : 0;
  };

  const results: TaxFact[] = [];

  // Line 1: BOY balance = prior year EOY balance
  const boyBalance = getPrior("m2_eoy_balance");
  results.push(makeFact(entityId, taxYear, "m2_boy_balance", boyBalance, "M-2 Line 1: BOY balance from prior year"));

  // Line 2: Ordinary income from Schedule K Line 1
  const ordinaryIncome = Math.max(0, get("sk_ordinary_business_income") || get("ordinary_business_income"));
  results.push(makeFact(entityId, taxYear, "m2_ordinary_income", ordinaryIncome, "M-2 Line 2: Ordinary income from Sch K Line 1"));

  // Line 3: Other additions (tax-exempt interest, etc.)
  const otherAdditions = get("sk_tax_exempt_interest");
  results.push(makeFact(entityId, taxYear, "m2_other_additions", otherAdditions, "M-2 Line 3: Other additions (tax-exempt interest)"));

  // Line 4: Loss
  const loss = Math.max(0, -(get("sk_ordinary_business_income") || get("ordinary_business_income")));
  results.push(makeFact(entityId, taxYear, "m2_loss", loss, "M-2 Line 4: Loss (if ordinary income is negative)"));

  // Line 5a: Distributions (cash)
  const distributions = get("owner_distributions_total") || get("sk_distributions");
  results.push(makeFact(entityId, taxYear, "m2_distributions_cash", distributions, "M-2 Line 5a: Cash distributions to shareholders"));

  // Line 5b: Property distributions (usually 0 unless manual)
  results.push(makeFact(entityId, taxYear, "m2_distributions_property", 0, "M-2 Line 5b: Property distributions (default 0)"));

  // Line 6: Other reductions (nondeductible expenses)
  const otherReductions = get("sk_nondeductible_expenses") || get("nondeductible_total");
  results.push(makeFact(entityId, taxYear, "m2_other_reductions", otherReductions, "M-2 Line 6: Other reductions (nondeductible expenses)"));

  // Line 7: EOY balance = 1 + 2 + 3 - 4 - 5a - 5b - 6
  const eoyBalance = boyBalance + ordinaryIncome + otherAdditions - loss - distributions - 0 - otherReductions;
  results.push(makeFact(entityId, taxYear, "m2_eoy_balance", eoyBalance, "M-2 Line 7: EOY balance = L1 + L2 + L3 - L4 - L5a - L5b - L6"));

  return results;
}

function makeFact(entityId: string, taxYear: number, name: string, value: number, explanation: string): TaxFact {
  return {
    tax_fact_id: `fact_${entityId}_${taxYear}_${name}`,
    entity_id: entityId,
    tax_year: taxYear,
    fact_name: name,
    fact_value_json: value,
    value_type: "number",
    confidence_score: 0.85,
    is_unknown: false,
    derived_from_mapping_ids: [],
    derived_from_adjustment_ids: [],
    explanation,
  };
}

export { M1_LINES, M2_LINES };
export type { M1Line, M2Line };
