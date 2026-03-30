import { NextRequest, NextResponse } from "next/server";
import { tokenStore } from "@/lib/token-store";
import { fetchGeneralLedger } from "@/lib/qbo-fetch";
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
    // ── 1. Fetch from QBO ────────────────────────────────────────────────────
    const { accounts: qboAccounts, transactions: qboTxns } =
      await fetchGeneralLedger(entityId, taxYear);

    // ── 2. Build & persist raw source record ─────────────────────────────────
    const raw = buildRawSourceRecord(entityId, taxYear, {
      accounts: qboAccounts,
      transactions: qboTxns,
    });
    await upsertRawSource(raw);

    // ── 3. Normalize → canonical ledger ──────────────────────────────────────
    const canonicalAccounts = normalizeAccounts(raw, qboAccounts);
    const canonicalEntries = normalizeTransactions(raw, qboTxns);
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
    // Seed entity_type fact from the request so rules can fire
    const baseFacts = deriveTaxFacts(entityId, taxYear, mappings, tbLines);
    if (entityType) {
      baseFacts.push({
        tax_fact_id: `fact_${entityId}_${taxYear}_entity_type`,
        entity_id: entityId,
        tax_year: taxYear,
        fact_name: "entity_type",
        fact_value_json: entityType,
        value_type: "string",
        confidence_score: 1.0,
        is_unknown: false,
        derived_from_mapping_ids: [],
        derived_from_adjustment_ids: [],
        explanation: "Entity type provided by the user at pipeline run time",
      });
    }
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
