export type RequirementStatus = "required" | "possible" | "blocked" | "not_required";

export interface FormRequirement {
  form_requirement_id: string;
  entity_id: string;
  tax_year: number;
  form_code: string;
  schedule_code: string | null;
  requirement_status: RequirementStatus;
  triggered_by_rule_ids: string[];
  triggered_by_fact_ids: string[];
  explanation: string;
  confidence_score: number; // 0.0 – 1.0
}
