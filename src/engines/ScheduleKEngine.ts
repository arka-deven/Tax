import type { TaxFact } from "../models/index.js";

/**
 * Schedule K computation engine.
 * Takes entity-level tax facts and produces Schedule K line items
 * (the shareholders'/partners' distributive share totals).
 *
 * These are ENTITY-level totals. Per-owner allocation happens in K1Engine.
 */

interface ScheduleKLine {
  line: string;
  factName: string;
  description: string;
  derivation: string; // how to compute from existing facts
}

/**
 * Schedule K line definitions for S-Corps (1120-S) and Partnerships (1065).
 * Each line maps to one or more existing factNames.
 */
const SCHEDULE_K_LINES: ScheduleKLine[] = [
  // ── Income (Loss) ─────────────────────────────────────────────────────────
  { line: "1",   factName: "sk_ordinary_business_income",  description: "Ordinary business income (loss)",     derivation: "ordinary_business_income" },
  { line: "2",   factName: "sk_net_rental_real_estate",    description: "Net rental real estate income (loss)", derivation: "rental_income_total - rental_expense_total" },
  { line: "3a",  factName: "sk_other_net_rental",          description: "Other gross rental income (loss)",     derivation: "other_rental_income_total" },
  { line: "4",   factName: "sk_interest_income",           description: "Interest income",                      derivation: "interest_income_total" },
  { line: "5a",  factName: "sk_ordinary_dividends",        description: "Ordinary dividends",                   derivation: "dividend_income_total" },
  { line: "5b",  factName: "sk_qualified_dividends",       description: "Qualified dividends",                  derivation: "qualified_dividends_total" },
  { line: "6",   factName: "sk_royalties",                 description: "Royalties",                            derivation: "royalty_income_total" },
  { line: "7",   factName: "sk_net_stcg",                  description: "Net short-term capital gain (loss)",   derivation: "stcg_total" },
  { line: "8a",  factName: "sk_net_ltcg",                  description: "Net long-term capital gain (loss)",    derivation: "ltcg_total" },
  { line: "9",   factName: "sk_net_section_1231",          description: "Net section 1231 gain (loss)",         derivation: "section_1231_gain_total" },
  { line: "10",  factName: "sk_other_income",              description: "Other income (loss)",                  derivation: "other_income_total" },

  // ── Deductions ────────────────────────────────────────────────────────────
  { line: "11",  factName: "sk_section_179",               description: "Section 179 deduction",                derivation: "depr_section_179_total" },
  { line: "12a", factName: "sk_charitable_contributions",  description: "Charitable contributions",             derivation: "charitable_contributions_total" },
  { line: "12b", factName: "sk_investment_interest",       description: "Investment interest expense",          derivation: "investment_interest_total" },

  // ── Credits ───────────────────────────────────────────────────────────────
  { line: "13a", factName: "sk_low_income_housing_credit", description: "Low-income housing credit (§42(j)(5))", derivation: "0" },
  { line: "13b", factName: "sk_low_income_housing_other",  description: "Low-income housing credit (other)",     derivation: "0" },
  { line: "13c", factName: "sk_qualified_rehab",           description: "Qualified rehabilitation expenditures", derivation: "0" },
  { line: "13d", factName: "sk_other_rental_credits",      description: "Other rental real estate credits",      derivation: "0" },
  { line: "13e", factName: "sk_other_credits",             description: "Other credits",                         derivation: "0" },

  // ── Foreign Transactions ──────────────────────────────────────────────────
  { line: "14a", factName: "sk_foreign_country",           description: "Name of country or U.S. possession",    derivation: "foreign_country_name" },
  { line: "14b", factName: "sk_foreign_gross_income",      description: "Gross income from all sources",         derivation: "gross_receipts_total + interest_income_total + dividend_income_total" },
  { line: "14c", factName: "sk_foreign_gross_income_sourced", description: "Gross income sourced at shareholder level", derivation: "0" },
  { line: "14f", factName: "sk_foreign_taxes_paid",        description: "Total foreign taxes paid",               derivation: "foreign_tax_paid_total" },

  // ── AMT Items ─────────────────────────────────────────────────────────────
  { line: "15a", factName: "sk_amt_post_1986_depreciation", description: "Post-1986 depreciation adjustment", derivation: "0" },
  { line: "15b", factName: "sk_amt_adjusted_gain_loss",     description: "Adjusted gain or loss",              derivation: "0" },

  // ── Items Affecting Shareholder Basis ─────────────────────────────────────
  { line: "16a", factName: "sk_tax_exempt_interest",       description: "Tax-exempt interest income",           derivation: "tax_exempt_interest_total" },
  { line: "16b", factName: "sk_other_tax_exempt",          description: "Other tax-exempt income",              derivation: "0" },
  { line: "16c", factName: "sk_nondeductible_expenses",    description: "Nondeductible expenses",               derivation: "nondeductible_total + income_tax_expense_total" },
  { line: "16d", factName: "sk_distributions",             description: "Distributions (cash + property)",      derivation: "owner_distributions_total" },
];

/**
 * Derive Schedule K facts from existing tax facts.
 * Returns new TaxFact entries for each Schedule K line.
 */
export function deriveScheduleKFacts(
  entityId: string,
  taxYear: number,
  existingFacts: TaxFact[],
): TaxFact[] {
  const factMap = new Map<string, number>();
  for (const f of existingFacts) {
    if (typeof f.fact_value_json === "number") {
      factMap.set(f.fact_name, f.fact_value_json);
    }
  }

  const get = (name: string): number => factMap.get(name) ?? 0;

  const results: TaxFact[] = [];

  for (const kLine of SCHEDULE_K_LINES) {
    let value: number;

    // Simple derivations: single factName reference
    if (!kLine.derivation.includes(" ") && !kLine.derivation.includes("+") && !kLine.derivation.includes("-")) {
      if (kLine.derivation === "0") {
        value = 0;
      } else {
        value = get(kLine.derivation);
      }
    } else {
      // Expression-based derivation: evaluate simple + and -
      value = evaluateSimpleExpression(kLine.derivation, get);
    }

    results.push({
      tax_fact_id: `fact_${entityId}_${taxYear}_${kLine.factName}`,
      entity_id: entityId,
      tax_year: taxYear,
      fact_name: kLine.factName,
      fact_value_json: value,
      value_type: "number",
      confidence_score: value === 0 ? 0.5 : 0.85,
      is_unknown: false,
      derived_from_mapping_ids: [],
      derived_from_adjustment_ids: [],
      explanation: `Schedule K Line ${kLine.line}: ${kLine.description}`,
    });
  }

  return results;
}

/**
 * Evaluate a simple arithmetic expression with fact name references.
 * Supports: factName + factName - factName * number
 */
function evaluateSimpleExpression(
  expr: string,
  get: (name: string) => number,
): number {
  // Split on + and - while keeping the operator
  const tokens = expr.split(/\s*([+-])\s*/);
  let result = resolveToken(tokens[0].trim(), get);
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const val = resolveToken(tokens[i + 1]?.trim() ?? "0", get);
    if (op === "+") result += val;
    else if (op === "-") result -= val;
  }
  return result;
}

function resolveToken(token: string, get: (name: string) => number): number {
  if (!token) return 0;
  const num = Number(token);
  if (!isNaN(num)) return num;
  return get(token);
}

/**
 * Allocate Schedule K totals to individual K-1s based on ownership percentages.
 */
export function allocateK1(
  entityId: string,
  taxYear: number,
  scheduleKFacts: TaxFact[],
  owners: Array<{ owner_id: string; profit_share_pct: number; loss_share_pct: number }>,
): TaxFact[] {
  const results: TaxFact[] = [];

  for (const owner of owners) {
    for (const kFact of scheduleKFacts) {
      const amount = typeof kFact.fact_value_json === "number" ? kFact.fact_value_json : 0;
      const pct = amount >= 0 ? owner.profit_share_pct : owner.loss_share_pct;
      const allocated = Math.round((amount * pct / 100) * 100) / 100;

      const k1FactName = `k1_${owner.owner_id}_${kFact.fact_name}`;
      results.push({
        tax_fact_id: `fact_${entityId}_${taxYear}_${k1FactName}`,
        entity_id: entityId,
        tax_year: taxYear,
        fact_name: k1FactName,
        fact_value_json: allocated,
        value_type: "number",
        confidence_score: kFact.confidence_score,
        is_unknown: false,
        derived_from_mapping_ids: [],
        derived_from_adjustment_ids: [],
        explanation: `K-1 allocation: ${kFact.fact_name} × ${pct}% for owner ${owner.owner_id}`,
      });
    }
  }

  return results;
}

export { SCHEDULE_K_LINES };
export type { ScheduleKLine };
