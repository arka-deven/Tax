import type { TaxFact } from "../models/index.js";

interface QBOReportRow {
  ColData: { value: string; id?: string }[];
  Rows?: { Row: QBOReportRow[] };
  type?: string;
  group?: string;
  Summary?: { ColData: { value: string }[] };
  Header?: { ColData: { value: string }[] };
}

interface QBOReport {
  Header: Record<string, unknown>;
  Columns: { Column: { ColTitle: string; ColType: string }[] };
  Rows: { Row: QBOReportRow[] };
}

interface ValidationResult {
  source: string;
  reportValue: number;
  computedValue: number;
  difference: number;
  withinTolerance: boolean;
}

/**
 * Extract the total from a QBO report section by group name.
 * Walks the nested row structure looking for a section header matching the name,
 * then reads the Summary row's amount.
 */
function extractSectionTotal(report: QBOReport, sectionName: string): number | null {
  // Walk all rows looking for the section
  function walk(rows: QBOReportRow[]): number | null {
    for (const row of rows) {
      // Check if this is a section header matching our name
      const headerText = row.Header?.ColData?.[0]?.value ?? row.ColData?.[0]?.value ?? "";
      if (headerText.toLowerCase().includes(sectionName.toLowerCase())) {
        // Look for Summary row
        if (row.Summary?.ColData?.[1]?.value) {
          return parseFloat(row.Summary.ColData[1].value) || 0;
        }
        // Or if the value is directly in ColData
        if (row.ColData?.[1]?.value) {
          return parseFloat(row.ColData[1].value) || 0;
        }
      }
      // Recurse into sub-rows
      if (row.Rows?.Row) {
        const found = walk(row.Rows.Row);
        if (found !== null) return found;
      }
    }
    return null;
  }
  return walk(report.Rows?.Row ?? []);
}

/**
 * Extract the grand total from a QBO report (last row / Net Income / Total).
 */
function extractGrandTotal(report: QBOReport): number | null {
  const rows = report.Rows?.Row ?? [];
  // The last row is typically the grand total
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row.Summary?.ColData?.[1]?.value) {
      return parseFloat(row.Summary.ColData[1].value) || 0;
    }
    if (row.type === "Section" && row.group === "GrandTotal") {
      const val = row.ColData?.[1]?.value;
      if (val) return parseFloat(val) || 0;
    }
  }
  return null;
}

/**
 * Validate our computed tax facts against QBO's authoritative reports.
 * Returns a list of discrepancies.
 */
export function validateAgainstReports(
  facts: TaxFact[],
  plReport: QBOReport | null,
  bsReport: QBOReport | null,
  tolerance: number = 100
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const getFact = (name: string): number => {
    const f = facts.find((f) => f.fact_name === name);
    return typeof f?.fact_value_json === "number" ? f.fact_value_json : 0;
  };

  if (plReport) {
    // Validate total income against P&L
    const plIncome = extractSectionTotal(plReport, "Income") ?? extractSectionTotal(plReport, "Total Income");
    if (plIncome !== null) {
      const computed = getFact("gross_receipts_total");
      results.push({
        source: "P&L Total Income vs gross_receipts_total",
        reportValue: plIncome,
        computedValue: computed,
        difference: Math.abs(plIncome - computed),
        withinTolerance: Math.abs(plIncome - computed) <= tolerance,
      });
    }

    // Validate total expenses
    const plExpenses = extractSectionTotal(plReport, "Expenses") ?? extractSectionTotal(plReport, "Total Expenses");
    if (plExpenses !== null) {
      const computed = getFact("total_deductions");
      results.push({
        source: "P&L Total Expenses vs total_deductions",
        reportValue: Math.abs(plExpenses),
        computedValue: computed,
        difference: Math.abs(Math.abs(plExpenses) - computed),
        withinTolerance: Math.abs(Math.abs(plExpenses) - computed) <= tolerance,
      });
    }

    // Net income
    const plNetIncome = extractGrandTotal(plReport);
    if (plNetIncome !== null) {
      const computed = getFact("net_income_before_tax");
      results.push({
        source: "P&L Net Income vs net_income_before_tax",
        reportValue: plNetIncome,
        computedValue: computed,
        difference: Math.abs(plNetIncome - computed),
        withinTolerance: Math.abs(plNetIncome - computed) <= tolerance,
      });
    }
  }

  if (bsReport) {
    // Validate total assets
    const bsAssets = extractSectionTotal(bsReport, "Total Assets") ?? extractSectionTotal(bsReport, "TOTAL ASSETS");
    if (bsAssets !== null) {
      const computed = getFact("total_assets_bs") || getFact("total_assets");
      results.push({
        source: "Balance Sheet Total Assets vs total_assets",
        reportValue: bsAssets,
        computedValue: computed,
        difference: Math.abs(bsAssets - computed),
        withinTolerance: Math.abs(bsAssets - computed) <= tolerance,
      });
    }

    // Validate total liabilities
    const bsLiabilities = extractSectionTotal(bsReport, "Total Liabilities") ?? extractSectionTotal(bsReport, "TOTAL LIABILITIES");
    if (bsLiabilities !== null) {
      const computed = getFact("total_liabilities");
      results.push({
        source: "Balance Sheet Total Liabilities vs total_liabilities",
        reportValue: Math.abs(bsLiabilities),
        computedValue: computed,
        difference: Math.abs(Math.abs(bsLiabilities) - computed),
        withinTolerance: Math.abs(Math.abs(bsLiabilities) - computed) <= tolerance,
      });
    }

    // Validate total equity
    const bsEquity = extractSectionTotal(bsReport, "Total Equity") ?? extractSectionTotal(bsReport, "TOTAL EQUITY");
    if (bsEquity !== null) {
      const computedEquity = Math.abs(getFact("capital_stock_total")) + Math.abs(getFact("retained_earnings_total"));
      results.push({
        source: "Balance Sheet Total Equity vs computed equity",
        reportValue: Math.abs(bsEquity),
        computedValue: computedEquity,
        difference: Math.abs(Math.abs(bsEquity) - computedEquity),
        withinTolerance: Math.abs(Math.abs(bsEquity) - computedEquity) <= tolerance,
      });
    }
  }

  return results;
}
