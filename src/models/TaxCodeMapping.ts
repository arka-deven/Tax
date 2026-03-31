export type MappingMethod = "deterministic" | "keyword" | "heuristic" | "manual";

export interface TaxCodeMapping {
  mapping_id: string;
  entity_id: string;
  tax_year: number;
  tb_line_id: string;
  semantic_category: string;
  tax_code: string;
  target_form: string;
  target_schedule: string | null;
  target_line: string;
  mapping_method: MappingMethod;
  confidence_score: number; // 0.0 – 1.0
  requires_review: boolean;
  review_reason_code: string | null;
  explanation: string;
  source_refs: string[];
}
