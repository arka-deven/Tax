import type {
  Diagnostic,
  FormRequirement,
  ReviewWorkpaper,
  TaxAdjustment,
  TaxCodeMapping,
} from "../models/index.js";

export interface ReviewPackage {
  entity_id: string;
  tax_year: number;
  required_forms: FormRequirement[];
  possible_forms: FormRequirement[];
  blocked_forms: FormRequirement[];
  unresolved_diagnostics: Diagnostic[];
  ambiguous_mappings: TaxCodeMapping[];
  adjustments: TaxAdjustment[];
  workpapers: ReviewWorkpaper[];
  generated_at: string;
}

export function buildReviewPackage(
  entityId: string,
  taxYear: number,
  formRequirements: FormRequirement[],
  diagnostics: Diagnostic[],
  mappings: TaxCodeMapping[],
  adjustments: TaxAdjustment[],
  workpapers: ReviewWorkpaper[]
): ReviewPackage {
  return {
    entity_id: entityId,
    tax_year: taxYear,
    required_forms: formRequirements.filter((f) => f.requirement_status === "required"),
    possible_forms: formRequirements.filter((f) => f.requirement_status === "possible"),
    blocked_forms: formRequirements.filter((f) => f.requirement_status === "blocked"),
    unresolved_diagnostics: diagnostics.filter((d) => d.resolution_status === "open"),
    ambiguous_mappings: mappings.filter((m) => m.requires_review),
    adjustments,
    workpapers,
    generated_at: new Date().toISOString(),
  };
}
