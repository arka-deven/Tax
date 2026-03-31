import type { TaxFact } from "../models/index.js";

/**
 * Form 990 Part IX — Functional Expense Allocation Engine.
 *
 * Nonprofits must allocate expenses across three functional categories:
 *   (A) Total  (B) Program services  (C) Management & general  (D) Fundraising
 *
 * The allocation uses ratios from the entity profile or defaults:
 *   - Program services: 75-85% (IRS expects >65% for good standing)
 *   - Management & general: 10-20%
 *   - Fundraising: 5-15%
 */

interface AllocationRatios {
  program: number;    // e.g. 0.80
  management: number; // e.g. 0.15
  fundraising: number; // e.g. 0.05
}

const DEFAULT_RATIOS: AllocationRatios = {
  program: 0.80,
  management: 0.15,
  fundraising: 0.05,
};

/**
 * 990 Part IX expense line definitions.
 * Each line maps to a factName for the total, then gets allocated.
 */
interface ExpenseLine {
  line: string;
  description: string;
  totalFactName: string;
  /** If true, this line is 100% one category (not split) */
  fixedCategory?: "program" | "management" | "fundraising";
}

const EXPENSE_LINES: ExpenseLine[] = [
  { line: "1",  description: "Grants and other assistance to domestic organizations", totalFactName: "grants_paid_total", fixedCategory: "program" },
  { line: "2",  description: "Grants and other assistance to domestic individuals",   totalFactName: "np_grants_individuals_total", fixedCategory: "program" },
  { line: "3",  description: "Grants and other assistance to foreign organizations",  totalFactName: "np_grants_foreign_total", fixedCategory: "program" },
  { line: "4",  description: "Benefits paid to or for members",                       totalFactName: "member_benefits_total", fixedCategory: "program" },
  { line: "5",  description: "Compensation of current officers, directors, trustees", totalFactName: "officer_compensation_total" },
  { line: "6",  description: "Compensation not included above to disqualified persons", totalFactName: "np_disqualified_comp_total" },
  { line: "7",  description: "Other salaries and wages",                              totalFactName: "wages_total" },
  { line: "8",  description: "Pension plan accruals and contributions",               totalFactName: "pension_profitsharing_total" },
  { line: "9",  description: "Other employee benefits",                               totalFactName: "employee_benefits_total" },
  { line: "10", description: "Payroll taxes",                                          totalFactName: "taxes_licenses_total" },
  { line: "11a",description: "Fees for services: management",                         totalFactName: "np_mgmt_fees_total", fixedCategory: "management" },
  { line: "11b",description: "Fees for services: legal",                              totalFactName: "professional_fees_total" },
  { line: "11c",description: "Fees for services: accounting",                         totalFactName: "np_accounting_fees_total" },
  { line: "11d",description: "Fees for services: lobbying",                           totalFactName: "np_lobbying_total" },
  { line: "11e",description: "Fees for services: professional fundraising",           totalFactName: "fundraising_expense_total", fixedCategory: "fundraising" },
  { line: "11f",description: "Fees for services: investment management",              totalFactName: "np_investment_mgmt_total", fixedCategory: "management" },
  { line: "11g",description: "Fees for services: other",                              totalFactName: "np_other_fees_total" },
  { line: "12", description: "Advertising and promotion",                             totalFactName: "advertising_total" },
  { line: "13", description: "Office expenses",                                       totalFactName: "office_expense_total" },
  { line: "14", description: "Information technology",                                totalFactName: "np_it_expense_total" },
  { line: "15", description: "Royalties",                                             totalFactName: "np_royalties_paid_total" },
  { line: "16", description: "Occupancy",                                             totalFactName: "rent_building_total" },
  { line: "17", description: "Travel",                                                totalFactName: "travel_total" },
  { line: "18", description: "Payments of travel for officials",                      totalFactName: "np_official_travel_total" },
  { line: "19", description: "Conferences, conventions, and meetings",                totalFactName: "np_conferences_total" },
  { line: "20", description: "Interest",                                              totalFactName: "interest_expense_total" },
  { line: "21", description: "Payments to affiliates",                                totalFactName: "np_affiliate_payments_total" },
  { line: "22", description: "Depreciation, depletion, and amortization",             totalFactName: "depreciation_total" },
  { line: "23", description: "Insurance",                                             totalFactName: "insurance_total" },
  { line: "24a",description: "Other expenses (itemize): line a",                      totalFactName: "np_other_expense_a_total" },
  { line: "24b",description: "Other expenses: line b",                                totalFactName: "np_other_expense_b_total" },
  { line: "24c",description: "Other expenses: line c",                                totalFactName: "np_other_expense_c_total" },
  { line: "24d",description: "Other expenses: line d",                                totalFactName: "np_other_expense_d_total" },
  { line: "25", description: "Total functional expenses (add lines 1-24d)",           totalFactName: "np_total_functional_expenses" },
];

/**
 * Derive 990 Part IX functional expense facts.
 * Produces 4 factNames per line: {base}_total, {base}_program, {base}_management, {base}_fundraising.
 */
export function deriveNonprofitExpenseFacts(
  entityId: string,
  taxYear: number,
  existingFacts: TaxFact[],
  ratios: AllocationRatios = DEFAULT_RATIOS,
): TaxFact[] {
  const factMap = new Map<string, number>();
  for (const f of existingFacts) {
    if (typeof f.fact_value_json === "number") {
      factMap.set(f.fact_name, f.fact_value_json);
    }
  }

  const get = (name: string): number => factMap.get(name) ?? 0;
  const results: TaxFact[] = [];

  let totalProgram = 0;
  let totalManagement = 0;
  let totalFundraising = 0;
  let grandTotal = 0;

  for (const line of EXPENSE_LINES) {
    if (line.line === "25") continue; // compute total at end

    const total = get(line.totalFactName);
    let program: number, management: number, fundraising: number;

    if (line.fixedCategory === "program") {
      program = total;
      management = 0;
      fundraising = 0;
    } else if (line.fixedCategory === "management") {
      program = 0;
      management = total;
      fundraising = 0;
    } else if (line.fixedCategory === "fundraising") {
      program = 0;
      management = 0;
      fundraising = total;
    } else {
      // Allocate by ratio
      program = Math.round(total * ratios.program * 100) / 100;
      fundraising = Math.round(total * ratios.fundraising * 100) / 100;
      management = total - program - fundraising; // remainder to avoid rounding drift
    }

    totalProgram += program;
    totalManagement += management;
    totalFundraising += fundraising;
    grandTotal += total;

    const base = `np_990_ix_${line.line.replace(/[^a-z0-9]/gi, "")}`;
    results.push(makeFact(entityId, taxYear, `${base}_total`, total, `990 Part IX Line ${line.line}: ${line.description} — Total`));
    results.push(makeFact(entityId, taxYear, `${base}_program`, program, `990 Part IX Line ${line.line} — Program services`));
    results.push(makeFact(entityId, taxYear, `${base}_management`, management, `990 Part IX Line ${line.line} — Management & general`));
    results.push(makeFact(entityId, taxYear, `${base}_fundraising`, fundraising, `990 Part IX Line ${line.line} — Fundraising`));
  }

  // Line 25 totals
  results.push(makeFact(entityId, taxYear, "np_990_ix_25_total", grandTotal, "990 Part IX Line 25: Total functional expenses"));
  results.push(makeFact(entityId, taxYear, "np_990_ix_25_program", totalProgram, "990 Part IX Line 25: Total program services"));
  results.push(makeFact(entityId, taxYear, "np_990_ix_25_management", totalManagement, "990 Part IX Line 25: Total management & general"));
  results.push(makeFact(entityId, taxYear, "np_990_ix_25_fundraising", totalFundraising, "990 Part IX Line 25: Total fundraising"));

  // Part IX Line 26: Joint costs (optional)
  results.push(makeFact(entityId, taxYear, "np_990_ix_26_total", 0, "990 Part IX Line 26: Joint costs"));

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
    confidence_score: value === 0 ? 0.5 : 0.85,
    is_unknown: false,
    derived_from_mapping_ids: [],
    derived_from_adjustment_ids: [],
    explanation,
  };
}

export { EXPENSE_LINES, DEFAULT_RATIOS };
export type { AllocationRatios, ExpenseLine };
