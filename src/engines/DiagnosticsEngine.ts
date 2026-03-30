import type { Diagnostic, TaxCodeMapping, TaxFact } from "../models/index.js";

let _seq = 0;
function nextId(): string {
  return `diag_${++_seq}`;
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

  // 1. Unmapped balances
  for (const m of mappings.filter((m) => m.tax_code === "UNMAPPED")) {
    diagnostics.push({
      diagnostic_id: nextId(),
      entity_id: entityId,
      tax_year: taxYear,
      severity: "blocking_error",
      category: "mapping_warning",
      code: "UNMAPPED_BALANCE",
      title: "Unmapped trial balance line",
      message: `Trial balance line ${m.tb_line_id} has no tax mapping. The balance cannot be placed on a return.`,
      affected_forms: [],
      affected_lines: [],
      source_rule_ids: [],
      source_mapping_ids: [m.mapping_id],
      source_tb_line_ids: [m.tb_line_id],
      resolution_status: "open",
      resolution_note: null,
      created_at: now,
      resolved_at: null,
      resolved_by: null,
    });
  }

  // 2. Low-confidence mappings
  for (const m of mappings.filter(
    (m) => m.confidence_score < 0.7 && m.tax_code !== "UNMAPPED"
  )) {
    diagnostics.push({
      diagnostic_id: nextId(),
      entity_id: entityId,
      tax_year: taxYear,
      severity: "warning",
      category: "mapping_warning",
      code: "LOW_CONFIDENCE_MAPPING",
      title: "Low-confidence tax mapping",
      message: `Mapping for ${m.tb_line_id} has confidence ${m.confidence_score.toFixed(2)}. Manual review required.`,
      affected_forms: [m.target_form],
      affected_lines: [m.target_line],
      source_rule_ids: [],
      source_mapping_ids: [m.mapping_id],
      source_tb_line_ids: [m.tb_line_id],
      resolution_status: "open",
      resolution_note: null,
      created_at: now,
      resolved_at: null,
      resolved_by: null,
    });
  }

  // 3. Unknown required facts
  for (const f of facts.filter((f) => f.is_unknown)) {
    diagnostics.push({
      diagnostic_id: nextId(),
      entity_id: entityId,
      tax_year: taxYear,
      severity: "blocking_error",
      category: "missing_required_data",
      code: "UNKNOWN_REQUIRED_FACT",
      title: "Required fact is unknown",
      message: `Tax fact "${f.fact_name}" could not be determined. Rules depending on it cannot fire.`,
      affected_forms: [],
      affected_lines: [],
      source_rule_ids: [],
      source_mapping_ids: f.derived_from_mapping_ids,
      source_tb_line_ids: [],
      resolution_status: "open",
      resolution_note: null,
      created_at: now,
      resolved_at: null,
      resolved_by: null,
    });
  }

  return diagnostics;
}
