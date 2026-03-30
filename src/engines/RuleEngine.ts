import type {
  Diagnostic,
  FormRequirement,
  RuleDefinition,
  TaxFact,
} from "../models/index.js";

// ── Condition schema ──────────────────────────────────────────────────────────

type ScalarOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
type ExistenceOp = "known" | "unknown";

type FactCondition =
  | { fact: string; op: ScalarOp; value: unknown }
  | { fact: string; op: ExistenceOp };

export type Condition =
  | FactCondition
  | { and: Condition[] }
  | { or: Condition[] }
  | { not: Condition };

// ── Action schema ─────────────────────────────────────────────────────────────

export interface RuleAction {
  form_code: string;
  schedule_code?: string | null;
  requirement_status: "required" | "possible";
  explanation: string;
}

// ── On-unknown schema ─────────────────────────────────────────────────────────

export interface OnUnknown {
  emit_diagnostic: boolean;
  diagnostic_severity?: "blocking_error" | "warning" | "info";
  skip_rule?: boolean; // if true, don't fire action when a needed fact is unknown
}

// ── Evaluation ────────────────────────────────────────────────────────────────

type EvalResult = "true" | "false" | "unknown";

function getFact(facts: Map<string, TaxFact>, name: string): TaxFact | undefined {
  return facts.get(name);
}

function evalCondition(cond: Condition, facts: Map<string, TaxFact>): EvalResult {
  if ("and" in cond) {
    const results = cond.and.map((c) => evalCondition(c, facts));
    if (results.some((r) => r === "false")) return "false";
    if (results.some((r) => r === "unknown")) return "unknown";
    return "true";
  }

  if ("or" in cond) {
    const results = cond.or.map((c) => evalCondition(c, facts));
    if (results.some((r) => r === "true")) return "true";
    if (results.some((r) => r === "unknown")) return "unknown";
    return "false";
  }

  if ("not" in cond) {
    const inner = evalCondition(cond.not, facts);
    if (inner === "true") return "false";
    if (inner === "false") return "true";
    return "unknown";
  }

  // FactCondition
  const fact = getFact(facts, cond.fact);

  if (cond.op === "known") return fact && !fact.is_unknown ? "true" : "unknown";
  if (cond.op === "unknown") return !fact || fact.is_unknown ? "true" : "false";

  if (!fact || fact.is_unknown) return "unknown";

  const v = fact.fact_value_json;
  const target = cond.value;

  switch (cond.op) {
    case "eq":  return v === target ? "true" : "false";
    case "neq": return v !== target ? "true" : "false";
    case "gt":  return (v as number) > (target as number) ? "true" : "false";
    case "gte": return (v as number) >= (target as number) ? "true" : "false";
    case "lt":  return (v as number) < (target as number) ? "true" : "false";
    case "lte": return (v as number) <= (target as number) ? "true" : "false";
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RuleEngineOutput {
  formRequirements: FormRequirement[];
  diagnostics: Diagnostic[];
}

export function runRules(
  entityId: string,
  taxYear: number,
  rules: RuleDefinition[],
  facts: TaxFact[]
): RuleEngineOutput {
  const factMap = new Map<string, TaxFact>(facts.map((f) => [f.fact_name, f]));
  const formRequirements: FormRequirement[] = [];
  const diagnostics: Diagnostic[] = [];
  const now = new Date().toISOString();

  const activeRules = rules.filter(
    (r) =>
      r.status === "active" &&
      r.tax_year === taxYear &&
      (!r.effective_to || r.effective_to >= taxYear.toString())
  );

  for (const rule of activeRules) {
    const condition = rule.condition_json as Condition;
    const action = rule.action_json as RuleAction;
    const onUnknown = (rule.on_unknown_json ?? {}) as OnUnknown;

    const result = evalCondition(condition, factMap);

    if (result === "unknown") {
      if (onUnknown.emit_diagnostic) {
        diagnostics.push({
          diagnostic_id: `diag_rule_unknown_${rule.rule_id}`,
          entity_id: entityId,
          tax_year: taxYear,
          severity: onUnknown.diagnostic_severity ?? "warning",
          category: "missing_required_data",
          code: "RULE_FACT_UNKNOWN",
          title: `Rule "${rule.rule_id}" could not evaluate — required fact unknown`,
          message: `Rule ${rule.rule_id} (${rule.source_citation_text}) depends on a fact that is not yet determined. ${action.explanation}`,
          affected_forms: [action.form_code],
          affected_lines: [],
          source_rule_ids: [rule.rule_id],
          source_mapping_ids: [],
          source_tb_line_ids: [],
          resolution_status: "open",
          resolution_note: null,
          created_at: now,
          resolved_at: null,
          resolved_by: null,
        });
      }
      if (onUnknown.skip_rule) continue;
    }

    if (result === "true" || (result === "unknown" && !onUnknown.skip_rule)) {
      const factIds = facts
        .filter((f) => {
          // Include facts referenced in the condition
          const condStr = JSON.stringify(condition);
          return condStr.includes(`"${f.fact_name}"`);
        })
        .map((f) => f.tax_fact_id);

      formRequirements.push({
        form_requirement_id: `fr_${rule.rule_id}_${entityId}_${taxYear}`,
        entity_id: entityId,
        tax_year: taxYear,
        form_code: action.form_code,
        schedule_code: action.schedule_code ?? null,
        requirement_status: result === "true" ? action.requirement_status : "possible",
        triggered_by_rule_ids: [rule.rule_id],
        triggered_by_fact_ids: factIds,
        explanation: action.explanation,
        confidence_score: result === "true" ? 0.95 : 0.5,
      });
    }
  }

  return { formRequirements, diagnostics };
}
