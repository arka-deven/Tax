// ── Unified Schema Types ─────────────────────────────────────────────────────
// Single source of truth for each IRS form field — merges PDF mapping,
// MeF XML element, UI display, and validation into one definition.

export type FieldFormat = "currency" | "integer" | "percent" | "string" | "boolean" | "date" | "ein" | "ssn";
export type FieldType = "amount" | "text" | "checkbox" | "dropdown" | "computed" | "static";

export interface UnifiedFieldDef {
  /** Unique key within this form (e.g. "income_1a", "header_ein") */
  fieldId: string;

  /** IRS line number for display (e.g. "1a", "12", "Header") */
  irsLine: string;

  /** Human-readable label */
  label: string;

  /** Longer description / IRS instructions hint */
  description?: string;

  /** MeF XML element name (e.g. "GrossReceiptsOrSalesAmt") */
  xmlElement?: string;

  /** Tax fact name this field maps to (e.g. "gross_receipts_total") */
  factName?: string;

  /** PDF AcroForm field name (for PDF generation) */
  pdfFieldName?: string;

  /** How to format the value */
  format: FieldFormat;

  /** Field behavior */
  fieldType: FieldType;

  /** For computed fields: declarative expression referencing other fieldIds */
  computeExpr?: { op: "+" | "-"; operands: string[] };

  /** For meta-sourced fields (e.g. "companyName", "ein", "address") */
  metaSource?: string;

  /** For static fields: fixed value */
  staticValue?: string;

  /** UI section grouping */
  section: string;

  /** Display emphasis */
  bold?: boolean;

  /** Whether user can edit this field */
  editable?: boolean;

  /** Whether required for MeF e-filing */
  xmlRequired?: boolean;

  /** Default value if missing */
  defaultValue?: string;

  /** Validation rules */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FormSection {
  id: string;
  title: string;
  sideLabel?: string;
}

export interface UnifiedFormSchema {
  formCode: string;
  formTitle: string;
  formSubtitle: string;
  ombNumber: string;
  taxYear: number;

  /** MeF XML config */
  xml: {
    rootElement: string;
    namespace: string;
    returnTypeCd: string;
  };

  /** PDF config (for PDF download) */
  pdf: {
    fileName: string;
  };

  /** Sections for UI rendering order */
  sections: FormSection[];

  /** All fields in display order */
  fields: UnifiedFieldDef[];
}
