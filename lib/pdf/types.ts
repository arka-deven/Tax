/** Maps a single PDF AcroForm field to a value source */
export interface PdfFieldMapping {
  /** Exact AcroForm field name in the PDF (from discovery script) */
  pdfFieldName: string;
  /** Tax fact name to pull value from (e.g. "gross_receipts_total") */
  factName?: string;
  /** Static string value (e.g. "X" for a checkbox) */
  staticValue?: string;
  /** Compute value from the full context */
  compute?: (ctx: FillContext) => string | undefined;
  /** How to format the value before filling */
  format?: "currency" | "integer" | "percent" | "string" | "boolean";
  /** IRS line number for reference */
  irsLine?: string;
  /** Human-readable description of this field */
  description?: string;
}

/** Complete mapping definition for one IRS form PDF */
export interface FormPdfMapping {
  formCode: string;
  pdfFileName: string;
  taxYear: number;
  fields: PdfFieldMapping[];
}

/** Result of filling a PDF */
export interface FilledPdfResult {
  pdfBytes: Uint8Array;
  filledCount: number;
  totalMapped: number;
  unfilledFields: string[];
}

/** Context passed to the filler engine */
export interface FillContext {
  facts: Record<string, unknown>;
  meta: {
    companyName?: string;
    ein?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    taxYear: number;
    entityType?: string;
    accountingMethod?: string;
  };
}
