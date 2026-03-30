export type AssemblyStatus =
  | "assembled"
  | "validated"
  | "blocked"
  | "ready_for_review"
  | "approved"
  | "queued_for_filing"
  | "transmitted"
  | "accepted"
  | "rejected";

export interface FilingPackage {
  filing_package_id: string;
  entity_id: string;
  tax_year: number;
  form_set: string[];
  assembly_status: AssemblyStatus;
  validation_status: AssemblyStatus | null;
  review_status: AssemblyStatus | null;
  transmission_status: AssemblyStatus | null;
  acknowledgement_status: AssemblyStatus | null;
  last_status_at: string;
  status_message: string | null;
}
