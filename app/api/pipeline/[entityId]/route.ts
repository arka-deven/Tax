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
  replaceDiagnostics,
  upsertFormRequirements,
} from "@/lib/repositories/pipeline-output";
import { buildTrialBalance } from "@/src/engines/TrialBalanceEngine";
import { mapTrialBalanceLines } from "@/src/engines/TaxMappingEngine";
import { deriveTaxFacts } from "@/src/engines/TaxFactsEngine";
import { runRules } from "@/src/engines/RuleEngine";
import { runDiagnostics } from "@/src/engines/DiagnosticsEngine";
import { buildReviewPackage } from "@/src/engines/ReviewPackageBuilder";
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
    // ── 0. Fetch PRIOR year from QBO for beginning-of-year balances ──────────
    // Schedule L, M-2 need BOY figures. We run a lightweight pipeline on (taxYear-1).
    const priorYear = taxYear - 1;
    let priorYearFacts: Record<string, unknown> = {};
    try {
      const pyData = await fetchAllData(entityId, priorYear);
      const pyRaw = buildRawSourceRecord(entityId, priorYear, pyData);
      const pyAccounts = normalizeAccounts(pyRaw, pyData.accounts);
      const pyEntries = normalizeAllTransactions(pyRaw, pyData);
      const pyTbLines = buildTrialBalance(entityId, priorYear, pyEntries, []);
      const [pyTypeMap, pySubtypeMap] = await Promise.all([
        getAccountTypeMap(entityId),
        getAccountSubtypeMap(entityId),
      ]);
      const pyMappings = mapTrialBalanceLines(pyTbLines, pyTypeMap, pySubtypeMap);
      const pyFacts = deriveTaxFacts(entityId, priorYear, pyMappings, pyTbLines);
      priorYearFacts = Object.fromEntries(pyFacts.map((f) => [f.fact_name, f.fact_value_json]));
    } catch (err) {
      console.warn(`Prior year (${priorYear}) pipeline failed — BOY balances will be empty:`, err instanceof Error ? err.message : err);
    }

    // ── 1. Fetch ALL data from QBO ───────────────────────────────────────────
    const qboData = await fetchAllData(entityId, taxYear);

    // ── 2. Build & persist raw source record ─────────────────────────────────
    const raw = buildRawSourceRecord(entityId, taxYear, qboData);
    await upsertRawSource(raw);

    // ── 3. Normalize → canonical ledger ──────────────────────────────────────
    const canonicalAccounts = normalizeAccounts(raw, qboData.accounts);
    const canonicalEntries = normalizeAllTransactions(raw, qboData);
    await upsertAccounts(canonicalAccounts);
    await upsertEntries(canonicalEntries);

    // ── 4. Build trial balance ────────────────────────────────────────────────
    const adjustments = await getAdjustments(entityId, taxYear);
    const tbLines = buildTrialBalance(entityId, taxYear, canonicalEntries, adjustments);
    await upsertTrialBalanceLines(tbLines);

    // ── 5. Map trial balance lines ────────────────────────────────────────────
    const [accountTypeMap, accountSubtypeMap] = await Promise.all([
      getAccountTypeMap(entityId),
      getAccountSubtypeMap(entityId),
    ]);
    const mappings = mapTrialBalanceLines(tbLines, accountTypeMap, accountSubtypeMap);
    await upsertMappings(mappings);

    // ── 6. Derive tax facts ───────────────────────────────────────────────────
    const baseFacts = deriveTaxFacts(entityId, taxYear, mappings, tbLines);

    // Inject prior year balance sheet facts as "boy_" prefixed facts for Schedule L
    const boyFactNames = [
      "cash_total", "accounts_receivable_total", "allowance_bad_debts_total",
      "inventory_total", "other_current_assets_total", "loans_to_officers_total",
      "buildings_depreciable_total", "accum_depreciation_total", "land_total",
      "intangible_assets_total", "accum_amortization_total", "other_assets_total",
      "total_assets", "total_assets_bs",
      "accounts_payable_total", "credit_card_total", "other_current_liabilities_total",
      "shareholder_loans_total", "long_term_liabilities_total", "total_liabilities",
      "capital_stock_total", "retained_earnings_total",
      "net_income_before_tax",
    ];
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
    const accountingMethod = qboData.preferences?.ReportPrefs?.ReportBasis
      ?? qboData.preferences?.AccountingInfoPrefs?.FirstMonthOfFiscalYear
        ? "Accrual" // default when preferences available but method unset
        : "Unknown";
    baseFacts.push({
      tax_fact_id: `fact_${entityId}_${taxYear}_accounting_method`,
      entity_id: entityId, tax_year: taxYear,
      fact_name: "accounting_method",
      fact_value_json: qboData.preferences?.ReportPrefs?.ReportBasis ?? accountingMethod,
      value_type: "string", confidence_score: qboData.preferences ? 0.95 : 0.5, is_unknown: !qboData.preferences,
      derived_from_mapping_ids: [], derived_from_adjustment_ids: [],
      explanation: "Accounting method from QBO Preferences (ReportPrefs.ReportBasis)",
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

    await upsertFacts(baseFacts);

    // ── 7. Run rule engine → form requirements ────────────────────────────────
    const { formRequirements, diagnostics: ruleDiagnostics } = runRules(
      entityId,
      taxYear,
      STARTER_RULES,
      baseFacts
    );
    await upsertFormRequirements(formRequirements);

    // ── 8. Run diagnostics engine ─────────────────────────────────────────────
    const mappingDiagnostics = runDiagnostics(entityId, taxYear, mappings, baseFacts);
    const allDiagnostics = [...mappingDiagnostics, ...ruleDiagnostics];
    await replaceDiagnostics(entityId, taxYear, allDiagnostics);

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
