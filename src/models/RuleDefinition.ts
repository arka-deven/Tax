export type RuleStatus = "draft" | "active" | "deprecated";

export interface RuleDefinition {
  rule_id: string;
  rule_family: string;
  rule_version: string;
  tax_year: number;
  entity_scope: string[];
  jurisdiction_scope: string[];
  effective_from: string; // ISO 8601 date
  effective_to: string | null;
  condition_json: unknown;
  action_json: unknown;
  on_unknown_json: unknown;
  source_document: string;
  source_section: string;
  source_citation_text: string;
  status: RuleStatus;
  created_at: string;
  supersedes_rule_id: string | null;
}
