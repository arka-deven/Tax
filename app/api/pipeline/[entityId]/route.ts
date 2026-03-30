import { NextRequest, NextResponse } from "next/server";
import { tokenStore } from "@/lib/token-store";
import { fetchAllData } from "@/lib/qbo-fetch";
import { buildRawSourceRecord, normalizeAccounts, normalizeTransactions, normalizeAllTransactions } from "@/lib/qbo-normalize";
import { upsertRawSource } from "@/lib/repositories/raw-source";
import {
  upsertAccounts,
  upsertEntries,
  getAccountTypeMap,
  getAccountSubtypeMap,
} from "@/lib/repositories/ledger";
import {
  upsertTrialBalanceLines,
  getAdjustments,
} from "@/lib/repositories/trial-balance";
import {
  upsertMappings,
  upsertFacts,
  getFacts,
  replaceDiagnostics,
  upsertFormRequirements,
} from "@/lib/repositories/pipeline-output";
import { buildTrialBalance } from "@/src/engines/TrialBalanceEngine";
import { mapTrialBalanceLines } from "@/src/engines/TaxMappingEngine";
import { deriveTaxFacts } from "@/src/engines/TaxFactsEngine";
import { runRules } from "@/src/engines/RuleEngine";
import { runDiagnostics } from "@/src/engines/DiagnosticsEngine";
import { buildReviewPackage } from "@/src/engines/ReviewPackageBuilder";
import { validateAgainstReports } from "@/src/engines/ReportValidationEngine";
import { STARTER_RULES } from "@/src/rules/starterRules";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params;
  const { taxYear = 2024, entityType } = (await request.json()) as {
    taxYear?: number;
    entityType?: string;
  };

  if (!tokenStore.has(entityId)) {
    return NextResponse.json(
      { error: "QBO not connected for this entity" },
      { status: 400 }
    );
  }

  try {
    // ── 0. Get prior year balance sheet facts (cached or fresh) ──────────────
    // Schedule L, M-2 need BOY figures. Check DB cache before hitting QBO.
    const priorYear = taxYear - 1;
    let priorYearFacts: Record<string, unknown> = {};
    const boyFactNames = [
      "cash_total", "accounts_receivable_total", "allowance_bad_debts_total",
      "inventory_total", "other_current_assets_total", "loans_to_officers_total",
      "buildings_depreciable_total", "accum_depreciation_total", "land_total",
      "intangible_assets_total", "accum_amortization_total", "other_assets_total",
      "total_assets", "total_assets_bs",
      "accounts_payable_total", "credit_card_total", "other_current_liabilities_total",
      "shareholder_loans_total", "long_term_liabilities_total", "total_liabilities",
      "capital_stock_total", "retained_earnings_total", "net_income_before_tax",
    ];
    try {
      const cachedPyFacts = await getFacts(entityId, priorYear);
      const relevantCached = cachedPyFacts.filter((f) => boyFactNames.includes(f.fact_name));
      if (relevantCached.length > 5) {
        // Use cached prior year facts — skip QBO fetch
        priorYearFacts = Object.fromEntries(relevantCached.map((f) => [f.fact_name, f.fact_value_json]));
        console.log(`Prior year (${priorYear}) facts loaded from cache (${relevantCached.length} facts)`);
      } else {
        // No sufficient cache — run prior year pipeline and persist the results
        const pyData = await fetchAllData(entityId, priorYear);
        const pyRaw = buildRawSourceRecord(entityId, priorYear, pyData);
        normalizeAccounts(pyRaw, pyData.accounts);
        const pyEntries = normalizeAllTransactions(pyRaw, pyData);
        const pyTbLines = buildTrialBalance(entityId, priorYear, pyEntries, []);
        const [pyTypeMap, pySubtypeMap] = await Promise.all([
          getAccountTypeMap(entityId),
          getAccountSubtypeMap(entityId),
        ]);
        const pyMappings = mapTrialBalanceLines(pyTbLines, pyTypeMap, pySubtypeMap);
        const pyFacts = deriveTaxFacts(entityId, priorYear, pyMappings, pyTbLines);
        priorYearFacts = Object.fromEntries(pyFacts.map((f) => [f.fact_name, f.fact_value_json]));
        // Persist so the next run can use the cache
        await upsertFacts(pyFacts).catch((e: unknown) =>
          console.warn(`Failed to cache prior year (${priorYear}) facts:`, e instanceof Error ? e.message : e)
        );
      }
    } catch (err) {
      console.warn(`Prior year (${priorYear}) pipeline failed — BOY balances will be empty:`, err instanceof Error ? err.message : err);
    }

    // ── 1. Fetch ALL data from QBO ───────────────────────────────────────────
    const qboData = await fetchAllData(entityId, taxYear);

    // ── 2. Build & persist raw source record ─────────────────────────────────
    const raw = buildRawSourceRecord(entityId, taxYear, qboData);
    await upsertRawSource(raw).catch((e: unknown) => console.warn("DB upsertRawSource skipped:", e instanceof Error ? e.message : e));

    // ── 3. Normalize → canonical ledger ──────────────────────────────────────
    const canonicalAccounts = normalizeAccounts(raw, qboData.accounts);
    const canonicalEntries = normalizeAllTransactions(raw, qboData);
    await upsertAccounts(canonicalAccounts).catch((e: unknown) => console.warn("DB upsertAccounts skipped:", e instanceof Error ? e.message : e));
    await upsertEntries(canonicalEntries).catch((e: unknown) => console.warn("DB upsertEntries skipped:", e instanceof Error ? e.message : e));

    // ── 4. Build trial balance ────────────────────────────────────────────────
    const adjustments = await getAdjustments(entityId, taxYear).catch(() => [] as never[]);
    const tbLines = buildTrialBalance(entityId, taxYear, canonicalEntries, adjustments);
    await upsertTrialBalanceLines(tbLines).catch((e: unknown) => console.warn("DB upsertTBLines skipped:", e instanceof Error ? e.message : e));

    // ── 5. Map trial balance lines ────────────────────────────────────────────
    const [accountTypeMap, accountSubtypeMap] = await Promise.all([
      getAccountTypeMap(entityId).catch(() => new Map<string, string>()),
      getAccountSubtypeMap(entityId).catch(() => new Map<string, string>()),
    ]);
    const mappings = mapTrialBalanceLines(tbLines, accountTypeMap, accountSubtypeMap);
    await upsertMappings(mappings).catch((e: unknown) => console.warn("DB upsertMappings skipped:", e instanceof Error ? e.message : e));

    // ── 6. Derive tax facts ───────────────────────────────────────────────────
    const baseFacts = deriveTaxFacts(entityId, taxYear, mappings, tbLines);

    // Inject prior year balance sheet facts as "boy_" prefixed facts for Schedule L
    for (const name of boyFactNames) {
      if (priorYearFacts[name] != null) {
        baseFacts.push({
          tax_fact_id: `fact_${entityId}_${taxYear}_boy_${name}`,
          entity_id: entityId, tax_year: taxYear,
          fact_name: `boy_${name}`,
          fact_value_json: priorYearFacts[name],
          value_type: typeof priorYearFacts[name] === "number" ? "number" : "string",
          confidence_score: 0.85, is_unknown: false,
          derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
          explanation: `Beginning-of-year balance from prior year (${priorYear}) pipeline run`,
        });
      }
    }

    // Entity type — provided by user, determines which rules fire
    if (entityType) {
      baseFacts.push({
        tax_fact_id: `fact_${entityId}_${taxYear}_entity_type`,
        entity_id: entityId, tax_year: taxYear,
        fact_name: "entity_type",
        fact_value_json: entityType,
        value_type: "string", confidence_score: 1.0, is_unknown: false,
        derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
        explanation: "Entity type provided by the user at pipeline run time",
      });
    }

    // Accounting method (Cash vs Accrual) from QBO Preferences — critical for IRS
    const reportBasis = qboData.preferences?.ReportPrefs?.ReportBasis;
    const accountingMethod = reportBasis === "Accrual" ? "Accrual"
      : reportBasis === "Cash" ? "Cash"
      : "Cash"; // Default to Cash for small businesses — most common
    baseFacts.push({
      tax_fact_id: `fact_${entityId}_${taxYear}_accounting_method`,
      entity_id: entityId, tax_year: taxYear,
      fact_name: "accounting_method",
      fact_value_json: accountingMethod,
      value_type: "string", confidence_score: reportBasis ? 1.0 : 0.7, is_unknown: false,
      derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
      explanation: reportBasis
        ? `Accounting method "${reportBasis}" from QBO Preferences`
        : "Defaulted to Cash (QBO Preferences unavailable — most SMBs use cash basis)",
    });

    // Fiscal year start month
    const fiscalYearStart = qboData.preferences?.AccountingInfoPrefs?.FirstMonthOfFiscalYear
      ?? qboData.companyInfo?.FiscalYearStartMonth ?? "January";
    baseFacts.push({
      tax_fact_id: `fact_${entityId}_${taxYear}_fiscal_year_start`,
      entity_id: entityId, tax_year: taxYear,
      fact_name: "fiscal_year_start_month",
      fact_value_json: fiscalYearStart,
      value_type: "string", confidence_score: 0.9, is_unknown: false,
      derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
      explanation: "Fiscal year start month from QBO Preferences",
    });

    // EIN from CompanyInfo
    if (qboData.companyInfo?.FederalEin) {
      baseFacts.push({
        tax_fact_id: `fact_${entityId}_${taxYear}_ein`,
        entity_id: entityId, tax_year: taxYear,
        fact_name: "ein",
        fact_value_json: qboData.companyInfo.FederalEin,
        value_type: "string", confidence_score: 1.0, is_unknown: false,
        derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
        explanation: "Employer Identification Number from QBO CompanyInfo",
      });
    }

    // Multi-currency flag — relevant for Form 1118 / foreign disclosure
    const multiCurrency = qboData.preferences?.CurrencyPrefs?.MultiCurrencyEnabled ?? false;
    if (multiCurrency) {
      baseFacts.push({
        tax_fact_id: `fact_${entityId}_${taxYear}_multi_currency`,
        entity_id: entityId, tax_year: taxYear,
        fact_name: "multi_currency_enabled",
        fact_value_json: true,
        value_type: "boolean", confidence_score: 1.0, is_unknown: false,
        derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
        explanation: "Multi-currency is enabled in QBO — may indicate foreign activity",
      });
    }

    // Company address from CompanyInfo (for form headers)
    const addr = qboData.companyInfo?.CompanyAddr;
    if (addr) {
      baseFacts.push({
        tax_fact_id: `fact_${entityId}_${taxYear}_company_address`,
        entity_id: entityId, tax_year: taxYear,
        fact_name: "company_address",
        fact_value_json: addr.Line1 ?? "",
        value_type: "string", confidence_score: 1.0, is_unknown: false,
        derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
        explanation: "Company street address from QBO CompanyInfo",
      });
      baseFacts.push({
        tax_fact_id: `fact_${entityId}_${taxYear}_company_city`,
        entity_id: entityId, tax_year: taxYear,
        fact_name: "company_city",
        fact_value_json: addr.City ?? "",
        value_type: "string", confidence_score: 1.0, is_unknown: false,
        derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
        explanation: "Company city from QBO CompanyInfo",
      });
      baseFacts.push({
        tax_fact_id: `fact_${entityId}_${taxYear}_company_state`,
        entity_id: entityId, tax_year: taxYear,
        fact_name: "company_state",
        fact_value_json: addr.CountrySubDivisionCode ?? "",
        value_type: "string", confidence_score: 1.0, is_unknown: false,
        derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
        explanation: "Company state from QBO CompanyInfo",
      });
      baseFacts.push({
        tax_fact_id: `fact_${entityId}_${taxYear}_company_zip`,
        entity_id: entityId, tax_year: taxYear,
        fact_name: "company_zip",
        fact_value_json: addr.PostalCode ?? "",
        value_type: "string", confidence_score: 1.0, is_unknown: false,
        derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
        explanation: "Company ZIP code from QBO CompanyInfo",
      });
    }

    // Company name from CompanyInfo
    const companyLegalName = qboData.companyInfo?.LegalName ?? qboData.companyInfo?.CompanyName ?? "";
    if (companyLegalName) {
      baseFacts.push({
        tax_fact_id: `fact_${entityId}_${taxYear}_company_name`,
        entity_id: entityId, tax_year: taxYear,
        fact_name: "company_name",
        fact_value_json: companyLegalName,
        value_type: "string", confidence_score: 1.0, is_unknown: false,
        derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
        explanation: "Legal name from QBO CompanyInfo",
      });
    }

    // Transaction volume facts
    baseFacts.push({
      tax_fact_id: `fact_${entityId}_${taxYear}_invoice_count`,
      entity_id: entityId, tax_year: taxYear,
      fact_name: "invoice_count",
      fact_value_json: qboData.invoices.length,
      value_type: "number", confidence_score: 1.0, is_unknown: false,
      derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
      explanation: "Count of QBO Invoice transactions for the tax year",
    });
    baseFacts.push({
      tax_fact_id: `fact_${entityId}_${taxYear}_bill_count`,
      entity_id: entityId, tax_year: taxYear,
      fact_name: "bill_count",
      fact_value_json: qboData.bills.length,
      value_type: "number", confidence_score: 1.0, is_unknown: false,
      derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
      explanation: "Count of QBO Bill transactions for the tax year",
    });

    // Vendor count + 1099 vendor count
    const vendor1099Count = qboData.vendors.filter((v) => v.Vendor1099).length;
    baseFacts.push({
      tax_fact_id: `fact_${entityId}_${taxYear}_vendor_count`,
      entity_id: entityId, tax_year: taxYear,
      fact_name: "vendor_count",
      fact_value_json: qboData.vendors.length,
      value_type: "number", confidence_score: 1.0, is_unknown: false,
      derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
      explanation: "Total vendor count from QBO",
    });
    baseFacts.push({
      tax_fact_id: `fact_${entityId}_${taxYear}_vendor_1099_count`,
      entity_id: entityId, tax_year: taxYear,
      fact_name: "vendor_1099_count",
      fact_value_json: vendor1099Count,
      value_type: "number", confidence_score: 1.0, is_unknown: false,
      derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
      explanation: "Count of vendors flagged as 1099 in QBO",
    });

    // ── 6b. Load entity profile and inject profile-derived facts ──────────────
    try {
      const { getEntityProfile, getEntityOwners } = await import("@/lib/repositories/entity-profile");
      const profile = await getEntityProfile(entityId);
      if (profile) {
        const profileFacts: [string, unknown, string][] = [
          ["naics_code", profile.naics_code, "NAICS business code from entity profile"],
          ["principal_business_activity", profile.principal_business_activity, "Principal business activity from entity profile"],
          ["principal_product_service", profile.principal_product_service, "Principal product/service from entity profile"],
          ["date_incorporated", profile.date_incorporated, "Date of incorporation from entity profile"],
          ["business_start_date", profile.business_start_date, "Date business started from entity profile"],
          ["s_election_date", profile.s_election_date, "S-election effective date from entity profile"],
          ["state_of_incorporation", profile.state_of_incorporation, "State of incorporation from entity profile"],
          ["inventory_method", profile.inventory_method, "Inventory valuation method from entity profile"],
          ["home_office_sqft", profile.home_office_sqft, "Home office square footage from entity profile"],
          ["home_total_sqft", profile.home_total_sqft, "Total home square footage from entity profile"],
          ["nol_carryforward", profile.prior_year_nol_carryforward, "NOL carryforward from entity profile"],
          ["capital_loss_carryforward", profile.prior_year_capital_loss_cf, "Capital loss carryforward from entity profile"],
          ["charitable_carryforward", profile.prior_year_charitable_cf, "Charitable contribution carryforward from entity profile"],
          ["section_179_carryover", profile.prior_year_179_carryover, "Section 179 carryover from entity profile"],
        ];
        for (const [name, value, explanation] of profileFacts) {
          if (value != null && value !== "" && value !== 0) {
            baseFacts.push({
              tax_fact_id: `fact_${entityId}_${taxYear}_profile_${name}`,
              entity_id: entityId, tax_year: taxYear,
              fact_name: name,
              fact_value_json: value,
              value_type: typeof value === "number" ? "number" : "string",
              confidence_score: 1.0, is_unknown: false,
              derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
              explanation,
            });
          }
        }
        // Owner count
        const owners = await getEntityOwners(entityId);
        if (owners.length > 0) {
          baseFacts.push({
            tax_fact_id: `fact_${entityId}_${taxYear}_owner_count`,
            entity_id: entityId, tax_year: taxYear,
            fact_name: "owner_count",
            fact_value_json: owners.length,
            value_type: "number", confidence_score: 1.0, is_unknown: false,
            derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
            explanation: `Number of partners/shareholders from entity profile (${owners.length})`,
          });
        }
      }
    } catch {
      // Entity profile table may not exist yet — non-fatal
    }

    // ── 6c. Load carryforwards and capital transactions ────────────────────────
    try {
      const { getCarryforwards } = await import("@/lib/repositories/carryforward");
      const { getCapitalTransactions } = await import("@/lib/repositories/capital-transactions");

      // Carryforwards
      const carryforwards = await getCarryforwards(entityId);
      const nolCf = carryforwards.filter(c => c.carryforward_type === "nol").reduce((s, c) => s + c.remaining_amount, 0);
      const capLossCf = carryforwards.filter(c => c.carryforward_type === "capital_loss").reduce((s, c) => s + c.remaining_amount, 0);
      const charitableCf = carryforwards.filter(c => c.carryforward_type === "charitable").reduce((s, c) => s + c.remaining_amount, 0);
      const s179Cf = carryforwards.filter(c => c.carryforward_type === "section_179").reduce((s, c) => s + c.remaining_amount, 0);

      if (nolCf > 0) baseFacts.push({ tax_fact_id: `fact_${entityId}_${taxYear}_nol_cf`, entity_id: entityId, tax_year: taxYear, fact_name: "nol_carryforward_available", fact_value_json: nolCf, value_type: "number", confidence_score: 0.9, is_unknown: false, derived_from_mapping_ids: [], derived_from_adjustment_ids: [], explanation: `NOL carryforward from prior years: $${nolCf.toLocaleString()}` });
      if (capLossCf > 0) baseFacts.push({ tax_fact_id: `fact_${entityId}_${taxYear}_caploss_cf`, entity_id: entityId, tax_year: taxYear, fact_name: "capital_loss_carryforward_available", fact_value_json: capLossCf, value_type: "number", confidence_score: 0.9, is_unknown: false, derived_from_mapping_ids: [], derived_from_adjustment_ids: [], explanation: `Capital loss carryforward: $${capLossCf.toLocaleString()}` });
      if (charitableCf > 0) baseFacts.push({ tax_fact_id: `fact_${entityId}_${taxYear}_charitable_cf`, entity_id: entityId, tax_year: taxYear, fact_name: "charitable_carryforward_available", fact_value_json: charitableCf, value_type: "number", confidence_score: 0.9, is_unknown: false, derived_from_mapping_ids: [], derived_from_adjustment_ids: [], explanation: `Charitable contribution carryforward: $${charitableCf.toLocaleString()}` });
      if (s179Cf > 0) baseFacts.push({ tax_fact_id: `fact_${entityId}_${taxYear}_s179_cf`, entity_id: entityId, tax_year: taxYear, fact_name: "section_179_carryover_available", fact_value_json: s179Cf, value_type: "number", confidence_score: 0.9, is_unknown: false, derived_from_mapping_ids: [], derived_from_adjustment_ids: [], explanation: `Section 179 carryover: $${s179Cf.toLocaleString()}` });

      // Capital transactions → Schedule D aggregates
      const capTxns = await getCapitalTransactions(entityId, taxYear);
      if (capTxns.length > 0) {
        const stGain = capTxns.filter(t => t.holding_period === "short_term").reduce((s, t) => s + t.gain_loss, 0);
        const ltGain = capTxns.filter(t => t.holding_period === "long_term").reduce((s, t) => s + t.gain_loss, 0);
        baseFacts.push({ tax_fact_id: `fact_${entityId}_${taxYear}_st_cap_gain`, entity_id: entityId, tax_year: taxYear, fact_name: "short_term_capital_gain_total", fact_value_json: stGain, value_type: "number", confidence_score: 1.0, is_unknown: false, derived_from_mapping_ids: [], derived_from_adjustment_ids: [], explanation: `Net short-term capital gain from ${capTxns.filter(t => t.holding_period === "short_term").length} transactions` });
        baseFacts.push({ tax_fact_id: `fact_${entityId}_${taxYear}_lt_cap_gain`, entity_id: entityId, tax_year: taxYear, fact_name: "long_term_capital_gain_total", fact_value_json: ltGain, value_type: "number", confidence_score: 1.0, is_unknown: false, derived_from_mapping_ids: [], derived_from_adjustment_ids: [], explanation: `Net long-term capital gain from ${capTxns.filter(t => t.holding_period === "long_term").length} transactions` });
      }
    } catch {
      // Tables may not exist yet — non-fatal
    }

    await upsertFacts(baseFacts).catch((e: unknown) => console.warn("DB upsertFacts skipped:", e instanceof Error ? e.message : e));

    // ── 7. Run rule engine → form requirements ────────────────────────────────
    const { formRequirements, diagnostics: ruleDiagnostics } = runRules(
      entityId,
      taxYear,
      STARTER_RULES,
      baseFacts
    );
    await upsertFormRequirements(formRequirements).catch((e: unknown) => console.warn("DB upsertFormReqs skipped:", e instanceof Error ? e.message : e));

    // ── 8. Run diagnostics engine ─────────────────────────────────────────────
    const mappingDiagnostics = runDiagnostics(entityId, taxYear, mappings, baseFacts);
    const allDiagnostics = [...mappingDiagnostics, ...ruleDiagnostics];

    // ── 8b. Cross-validate against QBO reports ─────────────────────────────
    const validationResults = validateAgainstReports(
      baseFacts,
      qboData.profitAndLossReport,
      qboData.balanceSheetReport
    );
    for (const v of validationResults) {
      if (!v.withinTolerance) {
        allDiagnostics.push({
          diagnostic_id: `diag_${entityId}_${taxYear}_REPORT_MISMATCH_${v.source.replace(/\s/g, "_").substring(0, 30)}`,
          entity_id: entityId,
          tax_year: taxYear,
          severity: v.difference > 1000 ? "warning" : "info",
          category: "validation",
          code: "REPORT_CROSS_CHECK_MISMATCH",
          title: `QBO Report Mismatch: ${v.source}`,
          message: `Our computed value ($${v.computedValue.toLocaleString()}) differs from QBO report ($${v.reportValue.toLocaleString()}) by $${v.difference.toLocaleString()}. Review transaction normalization.`,
          affected_forms: [],
          affected_lines: [],
          source_rule_ids: [],
          source_mapping_ids: [],
          source_tb_line_ids: [],
          resolution_status: "open",
          resolution_note: null,
          created_at: new Date().toISOString(),
          resolved_at: null,
          resolved_by: null,
        } as any);
      }
    }

    await replaceDiagnostics(entityId, taxYear, allDiagnostics).catch((e: unknown) => console.warn("DB replaceDiagnostics skipped:", e instanceof Error ? e.message : e));

    // ── 9. Build review package ───────────────────────────────────────────────
    const reviewPackage = buildReviewPackage(
      entityId,
      taxYear,
      formRequirements,
      allDiagnostics,
      mappings,
      adjustments,
      []
    );

    // ── 10. Return summary ────────────────────────────────────────────────────
    return NextResponse.json({
      requiredForms: reviewPackage.required_forms.map((f) => f.form_code),
      possibleForms: reviewPackage.possible_forms.map((f) => f.form_code),
      diagnostics: reviewPackage.unresolved_diagnostics.map((d) => ({
        severity: d.severity,
        code: d.code,
        title: d.title,
        message: d.message,
      })),
      facts: Object.fromEntries(
        baseFacts.map((f) => [f.fact_name, f.fact_value_json])
      ),
      ranAt: reviewPackage.generated_at,
    });
  } catch (err) {
    console.error("Pipeline error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Pipeline failed" },
      { status: 500 }
    );
  }
}
