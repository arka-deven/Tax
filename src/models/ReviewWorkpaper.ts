export type WorkpaperType = "mapping" | "adjustment" | "form_support" | "exception";
export type SignoffStatus = "pending" | "signed_off" | "rejected";

export interface ReviewWorkpaper {
  workpaper_id: string;
  entity_id: string;
  tax_year: number;
  workpaper_type: WorkpaperType;
  title: string;
  description: string;
  attached_source_refs: string[];
  attached_mapping_ids: string[];
  attached_rule_ids: string[];
  attached_diagnostic_ids: string[];
  preparer_note: string | null;
  reviewer_note: string | null;
  signoff_status: SignoffStatus;
  signed_off_by: string | null;
  signed_off_at: string | null;
}
