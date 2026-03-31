import type { TaxFact } from "../models/index.js";

/**
 * Balance Sheet Engine — derives BOY/EOY facts for Schedule L.
 *
 * Schedule L has 27 lines × 4 columns (BOY amount, BOY net, EOY amount, EOY net).
 * EOY values come from current-year trial balance. BOY values come from prior-year
 * ending balances (stored in tax_facts with "boy_" prefix or from carryforward data).
 *
 * This engine produces factNames for EVERY Schedule L cell.
 */

interface BalanceSheetLine {
  line: string;
  description: string;
  eoyFact: string;      // current year ending balance fact
  boyFact: string;      // beginning of year fact (prior year EOY)
  isContra: boolean;     // contra accounts show as parenthetical
  section: "assets" | "liabilities" | "equity";
}

const SCHEDULE_L_LINES: BalanceSheetLine[] = [
  // ── Assets ────────────────────────────────────────────────────────────────
  { line: "1",   description: "Cash",                                 eoyFact: "cash_total",                 boyFact: "boy_cash_total",                 isContra: false, section: "assets" },
  { line: "2a",  description: "Trade notes & accounts receivable",    eoyFact: "accounts_receivable_total",  boyFact: "boy_accounts_receivable_total",  isContra: false, section: "assets" },
  { line: "2b",  description: "Less allowance for bad debts",         eoyFact: "allowance_bad_debts_total",  boyFact: "boy_allowance_bad_debts_total",  isContra: true,  section: "assets" },
  { line: "3",   description: "Inventories",                          eoyFact: "inventory_total",            boyFact: "boy_inventory_total",            isContra: false, section: "assets" },
  { line: "4",   description: "U.S. government obligations",          eoyFact: "us_govt_obligations_total",  boyFact: "boy_us_govt_obligations_total",  isContra: false, section: "assets" },
  { line: "5",   description: "Tax-exempt securities",                eoyFact: "tax_exempt_securities_total",boyFact: "boy_tax_exempt_securities_total",isContra: false, section: "assets" },
  { line: "6",   description: "Other current assets",                 eoyFact: "other_current_assets_total", boyFact: "boy_other_current_assets_total", isContra: false, section: "assets" },
  { line: "7",   description: "Loans to shareholders",                eoyFact: "loans_to_officers_total",    boyFact: "boy_loans_to_officers_total",    isContra: false, section: "assets" },
  { line: "8",   description: "Mortgage and real estate loans",       eoyFact: "mortgage_loans_total",       boyFact: "boy_mortgage_loans_total",       isContra: false, section: "assets" },
  { line: "9a",  description: "Buildings and other depreciable assets",eoyFact: "buildings_depreciable_total",boyFact: "boy_buildings_depreciable_total",isContra: false, section: "assets" },
  { line: "9b",  description: "Less accumulated depreciation",        eoyFact: "accum_depreciation_total",   boyFact: "boy_accum_depreciation_total",   isContra: true,  section: "assets" },
  { line: "10a", description: "Depletable assets",                    eoyFact: "depletable_assets_total",    boyFact: "boy_depletable_assets_total",    isContra: false, section: "assets" },
  { line: "10b", description: "Less accumulated depletion",           eoyFact: "accum_depletion_total",      boyFact: "boy_accum_depletion_total",      isContra: true,  section: "assets" },
  { line: "11",  description: "Land (net of any amortization)",       eoyFact: "land_total",                 boyFact: "boy_land_total",                 isContra: false, section: "assets" },
  { line: "12a", description: "Intangible assets (amortizable only)", eoyFact: "intangible_assets_total",    boyFact: "boy_intangible_assets_total",    isContra: false, section: "assets" },
  { line: "12b", description: "Less accumulated amortization",        eoyFact: "accum_amortization_total",   boyFact: "boy_accum_amortization_total",   isContra: true,  section: "assets" },
  { line: "13",  description: "Other assets",                         eoyFact: "other_assets_total",         boyFact: "boy_other_assets_total",         isContra: false, section: "assets" },

  // ── Liabilities ───────────────────────────────────────────────────────────
  { line: "15",  description: "Accounts payable",                     eoyFact: "accounts_payable_total",     boyFact: "boy_accounts_payable_total",     isContra: false, section: "liabilities" },
  { line: "16",  description: "Mortgages, notes, bonds payable < 1yr",eoyFact: "short_term_notes_total",     boyFact: "boy_short_term_notes_total",     isContra: false, section: "liabilities" },
  { line: "17",  description: "Other current liabilities",            eoyFact: "other_current_liabilities_total", boyFact: "boy_other_current_liabilities_total", isContra: false, section: "liabilities" },
  { line: "18",  description: "Loans from shareholders",              eoyFact: "shareholder_loans_total",    boyFact: "boy_shareholder_loans_total",    isContra: false, section: "liabilities" },
  { line: "19",  description: "Mortgages, notes, bonds payable ≥ 1yr",eoyFact: "long_term_liabilities_total",boyFact: "boy_long_term_liabilities_total",isContra: false, section: "liabilities" },
  { line: "20",  description: "Other liabilities",                    eoyFact: "other_liabilities_total",    boyFact: "boy_other_liabilities_total",    isContra: false, section: "liabilities" },

  // ── Equity (1120-S uses lines 22-26; 1065 uses different numbering) ───────
  { line: "22",  description: "Capital stock",                        eoyFact: "capital_stock_total",        boyFact: "boy_capital_stock_total",        isContra: false, section: "equity" },
  { line: "23",  description: "Additional paid-in capital",           eoyFact: "additional_paid_in_capital", boyFact: "boy_additional_paid_in_capital", isContra: false, section: "equity" },
  { line: "24",  description: "Retained earnings",                    eoyFact: "retained_earnings_total",    boyFact: "boy_retained_earnings_total",    isContra: false, section: "equity" },
  { line: "25",  description: "Adjustments to shareholders' equity",  eoyFact: "equity_adjustments_total",   boyFact: "boy_equity_adjustments_total",   isContra: false, section: "equity" },
  { line: "26",  description: "Less cost of treasury stock",          eoyFact: "treasury_stock_total",       boyFact: "boy_treasury_stock_total",       isContra: true,  section: "equity" },
];

/**
 * Derive BOY facts from prior year EOY facts.
 * BOY for year Y = EOY for year Y-1.
 * If prior year facts are not available, BOY defaults to 0.
 */
export function deriveBOYFacts(
  entityId: string,
  taxYear: number,
  priorYearFacts: TaxFact[],
): TaxFact[] {
  const priorMap = new Map<string, number>();
  for (const f of priorYearFacts) {
    if (typeof f.fact_value_json === "number") {
      priorMap.set(f.fact_name, f.fact_value_json);
    }
  }

  const results: TaxFact[] = [];

  for (const line of SCHEDULE_L_LINES) {
    // BOY fact = prior year's EOY value
    const priorEOY = priorMap.get(line.eoyFact) ?? 0;

    results.push({
      tax_fact_id: `fact_${entityId}_${taxYear}_${line.boyFact}`,
      entity_id: entityId,
      tax_year: taxYear,
      fact_name: line.boyFact,
      fact_value_json: priorEOY,
      value_type: "number",
      confidence_score: priorEOY !== 0 ? 0.9 : 0.5,
      is_unknown: priorEOY === 0,
      derived_from_mapping_ids: [],
      derived_from_adjustment_ids: [],
      explanation: `BOY ${line.description} = prior year EOY ${line.eoyFact}`,
    });
  }

  return results;
}

/**
 * Derive the computed total lines (total assets, total liabilities + equity).
 */
export function deriveTotalFacts(
  entityId: string,
  taxYear: number,
  allFacts: TaxFact[],
): TaxFact[] {
  const get = (name: string): number => {
    const f = allFacts.find((f) => f.fact_name === name);
    return typeof f?.fact_value_json === "number" ? f.fact_value_json : 0;
  };

  const results: TaxFact[] = [];

  // Total assets (Line 14) = sum of all asset lines
  const assetLines = SCHEDULE_L_LINES.filter((l) => l.section === "assets");
  const totalAssetsEOY = assetLines.reduce((acc, l) => {
    const val = get(l.eoyFact);
    return acc + (l.isContra ? val : val); // contra values are already negative
  }, 0);
  const totalAssetsBOY = assetLines.reduce((acc, l) => {
    const val = get(l.boyFact);
    return acc + val;
  }, 0);

  results.push(makeFact(entityId, taxYear, "total_assets_eoy", totalAssetsEOY, "Total assets end of year (Schedule L Line 14d)"));
  results.push(makeFact(entityId, taxYear, "boy_total_assets", totalAssetsBOY, "Total assets beginning of year (Schedule L Line 14b)"));

  // Total liabilities + equity (Line 27)
  const liabLines = SCHEDULE_L_LINES.filter((l) => l.section === "liabilities");
  const equityLines = SCHEDULE_L_LINES.filter((l) => l.section === "equity");
  const totalLiabEquityEOY =
    liabLines.reduce((acc, l) => acc + Math.abs(get(l.eoyFact)), 0) +
    equityLines.reduce((acc, l) => acc + (l.isContra ? -Math.abs(get(l.eoyFact)) : Math.abs(get(l.eoyFact))), 0);

  results.push(makeFact(entityId, taxYear, "total_liabilities_equity_eoy", totalLiabEquityEOY, "Total liabilities and equity EOY (Schedule L Line 27d)"));

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

export { SCHEDULE_L_LINES };
export type { BalanceSheetLine };
