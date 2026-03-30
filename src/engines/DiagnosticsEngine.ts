import type { Diagnostic, TaxCodeMapping, TaxFact } from "../models/index.js";

/** Generate unique diagnostic IDs using entity+year+code to avoid PK collisions across runs */
function makeDiagId(entityId: string, taxYear: number, code: string, idx: number): string {
  return `diag_${entityId}_${taxYear}_${code}_${idx}`;
}

/* ------------------------------------------------------------------ */
/*  Helper: build a Diagnostic record with sensible defaults          */
/* ------------------------------------------------------------------ */
let _diagSeq = 0;
function makeDiag(
  base: Pick<
    Diagnostic,
    "entity_id" | "tax_year" | "severity" | "category" | "code" | "title" | "message"
  > &
    Partial<Diagnostic>,
  now: string
): Diagnostic {
  _diagSeq++;
  return {
    diagnostic_id: makeDiagId(base.entity_id, base.tax_year, base.code, _diagSeq),
    affected_forms: [],
    affected_lines: [],
    source_rule_ids: [],
    source_mapping_ids: [],
    source_tb_line_ids: [],
    resolution_status: "open",
    resolution_note: null,
    created_at: now,
    resolved_at: null,
    resolved_by: null,
    ...base,
  };
}

/* ------------------------------------------------------------------ */
/*  Helper: safely read a numeric fact (returns undefined when absent)*/
/* ------------------------------------------------------------------ */
function num(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Runs all diagnostic checks and returns typed Diagnostic records.
 * Severity is never downgraded automatically.
 */
export function runDiagnostics(
  entityId: string,
  taxYear: number,
  mappings: TaxCodeMapping[],
  facts: TaxFact[]
): Diagnostic[] {
  const now = new Date().toISOString();
  const diagnostics: Diagnostic[] = [];

  /* -------- fact accessor -------- */
  const getFact = (name: string): unknown =>
    facts.find((f) => f.fact_name === name)?.fact_value_json;

  const entityType = getFact("entity_type") as string | undefined;

  /* ================================================================
   *  EXISTING CHECKS (preserved)
   * ================================================================ */

  // 1. Unmapped balances
  for (const m of mappings.filter((m) => m.tax_code === "UNMAPPED")) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "blocking_error",
          category: "mapping_warning",
          code: "UNMAPPED_BALANCE",
          title: "Unmapped trial balance line",
          message: `Trial balance line ${m.tb_line_id} has no tax mapping. The balance cannot be placed on a return.`,
          source_mapping_ids: [m.mapping_id],
          source_tb_line_ids: [m.tb_line_id],
        },
        now
      )
    );
  }

  // 2. Low-confidence mappings
  for (const m of mappings.filter(
    (m) => m.confidence_score < 0.7 && m.tax_code !== "UNMAPPED"
  )) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "warning",
          category: "mapping_warning",
          code: "LOW_CONFIDENCE_MAPPING",
          title: "Low-confidence tax mapping",
          message: `Mapping for ${m.tb_line_id} has confidence ${m.confidence_score.toFixed(2)}. Manual review required.`,
          affected_forms: [m.target_form],
          affected_lines: [m.target_line],
          source_mapping_ids: [m.mapping_id],
          source_tb_line_ids: [m.tb_line_id],
        },
        now
      )
    );
  }

  // 3. Unknown required facts
  for (const f of facts.filter((f) => f.is_unknown)) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "blocking_error",
          category: "missing_required_data",
          code: "UNKNOWN_REQUIRED_FACT",
          title: "Required fact is unknown",
          message: `Tax fact "${f.fact_name}" could not be determined. Rules depending on it cannot fire.`,
          source_mapping_ids: f.derived_from_mapping_ids,
        },
        now
      )
    );
  }

  /* ================================================================
   *  BLOCKING ERRORS — prevent filing
   * ================================================================ */

  // 4. UNMAPPED_MATERIAL_BALANCE — |adjusted_balance| > $1,000
  for (const m of mappings.filter((m) => m.tax_code === "UNMAPPED")) {
    const balanceFact = facts.find(
      (f) => f.fact_name === `tb_adjusted_balance_${m.tb_line_id}`
    );
    const balance = num(balanceFact?.fact_value_json);
    if (balance !== undefined && Math.abs(balance) > 1000) {
      diagnostics.push(
        makeDiag(
          {
            entity_id: entityId,
            tax_year: taxYear,
            severity: "blocking_error",
            category: "mapping_warning",
            code: "UNMAPPED_MATERIAL_BALANCE",
            title: "Material unmapped balance exceeds $1,000",
            message: `Unmapped account ${m.tb_line_id} has an adjusted balance of $${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}. Amounts over $1,000 are material and must be mapped before filing.`,
            source_mapping_ids: [m.mapping_id],
            source_tb_line_ids: [m.tb_line_id],
          },
          now
        )
      );
    }
  }

  // 5. NEGATIVE_GROSS_RECEIPTS
  const grossReceipts = num(getFact("gross_receipts_total"));
  if (grossReceipts !== undefined && grossReceipts < 0) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "blocking_error",
          category: "cross_form_inconsistency",
          code: "NEGATIVE_GROSS_RECEIPTS",
          title: "Gross receipts are negative",
          message: `Gross receipts total is $${grossReceipts.toLocaleString("en-US", { minimumFractionDigits: 2 })}, which is negative. This likely indicates a data error in revenue accounts.`,
          affected_forms: ["1120", "1120-S"],
          affected_lines: ["Line 1a"],
        },
        now
      )
    );
  }

  // 6. MISSING_EIN
  const ein = getFact("ein");
  if (ein === undefined || ein === null || ein === "") {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "blocking_error",
          category: "missing_required_data",
          code: "MISSING_EIN",
          title: "Employer Identification Number (EIN) is missing",
          message:
            "The entity's EIN is missing or empty. An EIN is required on every corporate tax return and the return cannot be e-filed without it.",
          affected_forms: ["1120", "1120-S"],
        },
        now
      )
    );
  }

  // 7. NEGATIVE_TOTAL_ASSETS
  const totalAssets = num(getFact("total_assets"));
  if (totalAssets !== undefined && totalAssets < 0) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "blocking_error",
          category: "cross_form_inconsistency",
          code: "NEGATIVE_TOTAL_ASSETS",
          title: "Total assets are negative",
          message: `Total assets are $${totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2 })}. A negative total assets figure indicates a balance sheet imbalance that must be resolved before filing.`,
          affected_forms: ["Schedule L"],
        },
        now
      )
    );
  }

  /* ================================================================
   *  WARNINGS — CPA must review before filing
   * ================================================================ */

  // 8. CHARITABLE_EXCEEDS_10PCT (C-Corps, IRC §170(b)(2))
  const charitableTotal = num(getFact("charitable_contributions_total"));
  const taxableIncomeBeforeNol = num(getFact("taxable_income_before_nol"));
  if (
    entityType === "C-Corp" &&
    charitableTotal !== undefined &&
    taxableIncomeBeforeNol !== undefined &&
    taxableIncomeBeforeNol > 0 &&
    charitableTotal > 0.1 * taxableIncomeBeforeNol
  ) {
    const limit = 0.1 * taxableIncomeBeforeNol;
    const excess = charitableTotal - limit;
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "warning",
          category: "manual_review_required",
          code: "CHARITABLE_EXCEEDS_10PCT",
          title: "Charitable contributions exceed 10% limit",
          message:
            `Charitable contributions of $${charitableTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
            `exceed the IRC §170(b)(2) limit of 10% of taxable income before NOL ` +
            `($${limit.toLocaleString("en-US", { minimumFractionDigits: 2 })}). ` +
            `The excess of $${excess.toLocaleString("en-US", { minimumFractionDigits: 2 })} must be carried forward (up to 5 years).`,
          affected_forms: ["1120"],
          affected_lines: ["Line 19"],
        },
        now
      )
    );
  }

  // 9. OFFICER_COMP_HIGH_RATIO — > 50% of gross receipts
  const officerComp = num(getFact("officer_compensation_total"));
  if (
    officerComp !== undefined &&
    grossReceipts !== undefined &&
    grossReceipts > 0 &&
    officerComp > 0.5 * grossReceipts
  ) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "warning",
          category: "manual_review_required",
          code: "OFFICER_COMP_HIGH_RATIO",
          title: "Officer compensation exceeds 50% of gross receipts",
          message:
            `Officer compensation of $${officerComp.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
            `is more than 50% of gross receipts ($${grossReceipts.toLocaleString("en-US", { minimumFractionDigits: 2 })}). ` +
            `This is a known IRS audit trigger for unreasonable compensation. Document business justification.`,
          affected_forms: ["1120", "1120-S"],
          affected_lines: ["Line 12"],
        },
        now
      )
    );
  }

  // 10. OFFICER_COMP_ZERO_SCORP — S-Corp with zero officer comp
  if (
    entityType === "S-Corp" &&
    (officerComp === undefined || officerComp === 0) &&
    grossReceipts !== undefined &&
    grossReceipts > 0
  ) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "warning",
          category: "manual_review_required",
          code: "OFFICER_COMP_ZERO_SCORP",
          title: "S-Corp has zero officer compensation with positive revenue",
          message:
            `This S-Corp reports gross receipts of $${grossReceipts.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
            `but $0 in officer compensation. S-Corp officer-shareholders who provide services must receive ` +
            `reasonable W-2 compensation before distributions. Failure to do so is a top IRS audit issue.`,
          affected_forms: ["1120-S"],
          affected_lines: ["Line 7", "Line 8"],
        },
        now
      )
    );
  }

  // 11. INTEREST_EXPENSE_HIGH — rough §163(j) proxy (> 30% of ATI)
  const interestExpense = num(getFact("interest_expense_total"));
  const totalIncome = num(getFact("total_income"));
  if (
    interestExpense !== undefined &&
    totalIncome !== undefined &&
    interestExpense > 0
  ) {
    const ati = totalIncome - interestExpense; // simplified ATI proxy
    if (ati > 0 && interestExpense > 0.3 * ati) {
      diagnostics.push(
        makeDiag(
          {
            entity_id: entityId,
            tax_year: taxYear,
            severity: "warning",
            category: "manual_review_required",
            code: "INTEREST_EXPENSE_HIGH",
            title: "Interest expense may exceed §163(j) limitation",
            message:
              `Business interest expense of $${interestExpense.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
              `exceeds 30% of approximate adjusted taxable income ($${ati.toLocaleString("en-US", { minimumFractionDigits: 2 })}). ` +
              `Review IRC §163(j) business interest limitation. A detailed Form 8990 computation may be required.`,
            affected_forms: ["Form 8990"],
          },
          now
        )
      );
    }
  }

  // 12. MEALS_EXCEEDS_5PCT — meals > 5% of gross receipts
  const mealsTotal = num(getFact("meals_subject_to_limitation_total"));
  if (
    mealsTotal !== undefined &&
    grossReceipts !== undefined &&
    grossReceipts > 0 &&
    mealsTotal > 0.05 * grossReceipts
  ) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "warning",
          category: "manual_review_required",
          code: "MEALS_EXCEEDS_5PCT",
          title: "Meals expense exceeds 5% of gross receipts",
          message:
            `Meals subject to limitation total $${mealsTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}, ` +
            `which is more than 5% of gross receipts ($${grossReceipts.toLocaleString("en-US", { minimumFractionDigits: 2 })}). ` +
            `This is unusually high and may draw IRS scrutiny. Verify categorization and substantiation.`,
          affected_forms: ["1120", "1120-S"],
        },
        now
      )
    );
  }

  // 13. LARGE_OTHER_DEDUCTIONS — general_deduction_total > 20% of total_deductions
  const generalDeduction = num(getFact("general_deduction_total"));
  const totalDeductions = num(getFact("total_deductions"));
  if (
    generalDeduction !== undefined &&
    totalDeductions !== undefined &&
    totalDeductions > 0 &&
    generalDeduction > 0.2 * totalDeductions
  ) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "warning",
          category: "manual_review_required",
          code: "LARGE_OTHER_DEDUCTIONS",
          title: "\"Other deductions\" exceeds 20% of total deductions",
          message:
            `General/other deductions of $${generalDeduction.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
            `represent ${((generalDeduction / totalDeductions) * 100).toFixed(1)}% of total deductions. ` +
            `Too much in the catch-all bucket may indicate mapping gaps. Review Schedule K or attached statement.`,
          affected_forms: ["1120", "1120-S"],
          affected_lines: ["Line 26"],
        },
        now
      )
    );
  }

  // 14. BALANCE_SHEET_IMBALANCE — |assets - (liabilities + equity)| > $100
  const totalLiabilities = num(getFact("total_liabilities"));
  const capitalStock = num(getFact("capital_stock"));
  const retainedEarnings = num(getFact("retained_earnings_total"));
  if (
    totalAssets !== undefined &&
    totalLiabilities !== undefined &&
    capitalStock !== undefined &&
    retainedEarnings !== undefined
  ) {
    const equitySide = totalLiabilities + capitalStock + retainedEarnings;
    const imbalance = Math.abs(totalAssets - equitySide);
    if (imbalance > 100) {
      diagnostics.push(
        makeDiag(
          {
            entity_id: entityId,
            tax_year: taxYear,
            severity: "warning",
            category: "cross_form_inconsistency",
            code: "BALANCE_SHEET_IMBALANCE",
            title: "Balance sheet does not balance",
            message:
              `Total assets ($${totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2 })}) minus ` +
              `total liabilities + equity ($${equitySide.toLocaleString("en-US", { minimumFractionDigits: 2 })}) ` +
              `results in a $${imbalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} imbalance. ` +
              `Schedule L must balance within a reasonable tolerance.`,
            affected_forms: ["Schedule L"],
          },
          now
        )
      );
    }
  }

  // 15. HIGH_UNMAPPED_COUNT — unmapped_account_count > 5
  const unmappedCount = mappings.filter((m) => m.tax_code === "UNMAPPED").length;
  if (unmappedCount > 5) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "warning",
          category: "mapping_warning",
          code: "HIGH_UNMAPPED_COUNT",
          title: "High number of unmapped accounts",
          message:
            `There are ${unmappedCount} unmapped trial balance accounts. ` +
            `More than 5 unmapped accounts suggest the chart-of-accounts mapping template may need updating.`,
        },
        now
      )
    );
  }

  // 16. DEPRECIATION_WITHOUT_ASSETS
  const depreciationTotal = num(getFact("depreciation_total"));
  const buildingsDepreciable = num(getFact("buildings_depreciable_total"));
  if (
    depreciationTotal !== undefined &&
    depreciationTotal > 0 &&
    (buildingsDepreciable === undefined || buildingsDepreciable === 0)
  ) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "warning",
          category: "cross_form_inconsistency",
          code: "DEPRECIATION_WITHOUT_ASSETS",
          title: "Depreciation claimed without depreciable asset basis",
          message:
            `Depreciation expense of $${depreciationTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
            `is reported but buildings/depreciable assets total is $0. Where are the underlying fixed assets? ` +
            `Verify the asset register and Schedule L mapping.`,
          affected_forms: ["Form 4562", "Schedule L"],
        },
        now
      )
    );
  }

  // 17. NEGATIVE_RETAINED_EARNINGS
  if (retainedEarnings !== undefined && retainedEarnings < -10000) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "warning",
          category: "manual_review_required",
          code: "NEGATIVE_RETAINED_EARNINGS",
          title: "Significantly negative retained earnings",
          message:
            `Retained earnings are $${retainedEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}. ` +
            `This may indicate accumulated losses. Review NOL carryforward availability and consider ` +
            `whether §382 ownership change limitations apply.`,
          affected_forms: ["Schedule L", "1120"],
        },
        now
      )
    );
  }

  // 18. COGS_WITHOUT_INVENTORY
  const cogsTotal = num(getFact("cogs_total"));
  const inventoryTotal = num(getFact("inventory_total"));
  if (
    cogsTotal !== undefined &&
    cogsTotal > 0 &&
    (inventoryTotal === undefined || inventoryTotal === 0)
  ) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "warning",
          category: "cross_form_inconsistency",
          code: "COGS_WITHOUT_INVENTORY",
          title: "Cost of goods sold reported without inventory",
          message:
            `Cost of goods sold is $${cogsTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
            `but inventory on the balance sheet is $0. Confirm whether this entity uses the cash method ` +
            `(and qualifies under §471(c)) or if inventory accounts are missing from the trial balance.`,
          affected_forms: ["Schedule A (COGS)", "Schedule L"],
        },
        now
      )
    );
  }

  // 19. CAPITAL_LOSS_EXCEEDS_GAINS (C-Corp limitation under §1211)
  const capitalGain = num(getFact("capital_gain_total"));
  if (entityType === "C-Corp" && capitalGain !== undefined && capitalGain < 0) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "warning",
          category: "manual_review_required",
          code: "CAPITAL_LOSS_EXCEEDS_GAINS",
          title: "Net capital loss cannot offset ordinary income (C-Corp)",
          message:
            `Net capital position is $${capitalGain.toLocaleString("en-US", { minimumFractionDigits: 2 })} (a net loss). ` +
            `Per IRC §1211(a), C-Corporations may not deduct net capital losses against ordinary income. ` +
            `The loss must be carried back 3 years or forward 5 years against capital gains only.`,
          affected_forms: ["Schedule D", "1120"],
        },
        now
      )
    );
  }

  /* ================================================================
   *  INFO — review suggestions
   * ================================================================ */

  // 20. FOREIGN_ACTIVITY_DETECTED
  const foreignActivity = getFact("foreign_activity_present");
  if (foreignActivity === true) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "info",
          category: "manual_review_required",
          code: "FOREIGN_ACTIVITY_DETECTED",
          title: "Foreign activity detected",
          message:
            "This entity has foreign activity. Review whether Forms 5471 (CFC), 5472 (foreign-owned), " +
            "1118 (foreign tax credit), or FinCEN 114 (FBAR) filings are required.",
          affected_forms: ["Form 5471", "Form 5472", "Form 1118"],
        },
        now
      )
    );
  }

  // 21. DEPRECIATION_REVIEW
  const hasDepreciableAssets = getFact("has_depreciable_assets");
  if (hasDepreciableAssets === true) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "info",
          category: "manual_review_required",
          code: "DEPRECIATION_REVIEW",
          title: "Depreciable assets present — review elections",
          message:
            "This entity has depreciable assets. Review §179 expensing election, bonus depreciation " +
            "availability, and MACRS recovery periods (useful lives) for all asset classes.",
          affected_forms: ["Form 4562"],
        },
        now
      )
    );
  }

  // 22. RENTAL_INCOME_DETECTED
  const rentalIncome = getFact("rental_income_present");
  if (rentalIncome === true) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "info",
          category: "manual_review_required",
          code: "RENTAL_INCOME_DETECTED",
          title: "Rental income detected",
          message:
            "This entity reports rental income. Review passive activity rules under IRC §469 and " +
            "determine if Form 8825 (Rental Real Estate Income and Expenses of a Partnership or S Corporation) is required.",
          affected_forms: ["Form 8825"],
        },
        now
      )
    );
  }

  // 23. MULTI_CURRENCY_ENABLED
  const multiCurrency = getFact("multi_currency_enabled");
  if (multiCurrency === true) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "info",
          category: "manual_review_required",
          code: "MULTI_CURRENCY_ENABLED",
          title: "Multi-currency accounting enabled",
          message:
            "This entity uses multi-currency accounting. Foreign currency translation differences " +
            "may affect reported amounts. Review IRC §988 treatment of foreign currency gains/losses.",
        },
        now
      )
    );
  }

  // 24. QBI_THRESHOLD_CHECK
  const netIncomeBeforeTax = num(getFact("net_income_before_tax"));
  if (netIncomeBeforeTax !== undefined && netIncomeBeforeTax > 191950) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "info",
          category: "manual_review_required",
          code: "QBI_THRESHOLD_CHECK",
          title: "Income above simplified QBI threshold",
          message:
            `Net income before tax of $${netIncomeBeforeTax.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
            `exceeds the $191,950 simplified QBI threshold. The qualified business income deduction ` +
            `may require Form 8995-A with W-2 wage and UBIA of qualified property limitations.`,
          affected_forms: ["Form 8995-A"],
        },
        now
      )
    );
  }

  // 25. LARGE_ASSET_TOTAL_M3 — total_assets > $10M
  if (totalAssets !== undefined && totalAssets > 10_000_000) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "info",
          category: "manual_review_required",
          code: "LARGE_ASSET_TOTAL_M3",
          title: "Total assets exceed $10M — Schedule M-3 required",
          message:
            `Total assets of $${totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
            `exceed the $10,000,000 threshold. Schedule M-3 (Net Income (Loss) Reconciliation) ` +
            `is required instead of Schedule M-1.`,
          affected_forms: ["Schedule M-3"],
        },
        now
      )
    );
  }

  // 26. ESTIMATED_TAX_REVIEW — corporate_tax_21pct > $500
  const corporateTax = num(getFact("corporate_tax_21pct"));
  if (corporateTax !== undefined && corporateTax > 500) {
    diagnostics.push(
      makeDiag(
        {
          entity_id: entityId,
          tax_year: taxYear,
          severity: "info",
          category: "manual_review_required",
          code: "ESTIMATED_TAX_REVIEW",
          title: "Estimated tax payments may be required",
          message:
            `Estimated corporate tax liability of $${corporateTax.toLocaleString("en-US", { minimumFractionDigits: 2 })} ` +
            `exceeds $500. The corporation is generally required to make quarterly estimated tax payments. ` +
            `Review Form 2220 to determine if an underpayment penalty applies.`,
          affected_forms: ["Form 2220"],
        },
        now
      )
    );
  }

  return diagnostics;
}
