export type FactValueType =
  | "string"
  | "number"
  | "boolean"
  | "string_array"
  | "number_array"
  | "object";

export interface TaxFact {
  tax_fact_id: string;
  entity_id: string;
  tax_year: number;
  fact_name: string;
  fact_value_json: unknown;
  value_type: FactValueType;
  confidence_score: number; // 0.0 – 1.0
  is_unknown: boolean;
  derived_from_mapping_ids: string[];
  derived_from_adjustment_ids: string[];
  explanation: string;
}
