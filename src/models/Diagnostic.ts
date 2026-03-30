export type DiagnosticSeverity =
  | "blocking_error"
  | "warning"
  | "info";

export type DiagnosticCategory =
  | "missing_required_data"
  | "mapping_warning"
  | "cross_form_inconsistency"
  | "e_file_readiness_issue"
  | "manual_review_required"
  | "unsupported_case";

export type ResolutionStatus = "open" | "resolved" | "waived";

export interface Diagnostic {
  diagnostic_id: string;
  entity_id: string;
  tax_year: number;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  code: string;
  title: string;
  message: string;
  affected_forms: string[];
  affected_lines: string[];
  source_rule_ids: string[];
  source_mapping_ids: string[];
  source_tb_line_ids: string[];
  resolution_status: ResolutionStatus;
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}
