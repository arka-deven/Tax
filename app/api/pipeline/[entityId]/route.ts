import { NextRequest, NextResponse } from "next/server";
import { tokenStore } from "@/lib/token-store";
import { fetchAllData } from "@/lib/qbo-fetch";
import { buildRawSourceRecord, normalizeAccounts, normalizeTransactions } from "@/lib/qbo-normalize";
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
    // ── 1. Fetch ALL data from QBO ───────────────────────────────────────────
    const qboData = await fetchAllData(entityId, taxYear);

    // ── 2. Build & persist raw source record ─────────────────────────────────
    // Full payload stored as-is so we have a complete audit trail of everything
    // pulled from QBO — accounts, all transaction types, company info, preferences.
    const raw = buildRawSourceRecord(entityId, taxYear, qboData);
    await upsertRawSource(raw);

    // ── 3. Normalize → canonical ledger ──────────────────────────────────────
    const canonicalAccounts = normalizeAccounts(raw, qboData.accounts);
    const canonicalEntries = normalizeTransactions(raw, qboData.journalEntries);
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

    // Transaction volume facts for IRS thresholds
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
