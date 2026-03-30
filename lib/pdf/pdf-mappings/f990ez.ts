import type { FormPdfMapping, FillContext } from "../types";

const P = "topmostSubform[0].Page1[0].";

export const F990EZ_MAPPING: FormPdfMapping = {
  formCode: "990-EZ",
  pdfFileName: "f990ez.pdf",
  taxYear: 2025,
  fields: [
    // -------------------------------------------------------------------------
    // Header fields
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}p1-t1[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year",
    },
    {
      pdfFieldName: `${P}p1-t2[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "Header",
      description: "Name of organization",
    },
    {
      pdfFieldName: `${P}p1-t3[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "Header",
      description: "Employer Identification Number (EIN)",
    },

    // -------------------------------------------------------------------------
    // Part I — Revenue, Expenses, and Changes in Net Assets
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_01[0]`,
      factName: "gross_receipts_total",
      format: "currency",
      irsLine: "1",
      description: "Contributions, gifts, grants, and similar amounts received",
    },
    {
      pdfFieldName: `${P}f1_09[0]`,
      factName: "wages_total",
      format: "currency",
      irsLine: "12",
      description: "Salaries, other compensation, and employee benefits",
    },
    {
      pdfFieldName: `${P}f1_13[0]`,
      factName: "general_deduction_total",
      format: "currency",
      irsLine: "16",
      description: "Other expenses",
    },

    // -------------------------------------------------------------------------
    // Part II — Balance Sheets
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_25[0]`,
      factName: "total_assets",
      format: "currency",
      irsLine: "25",
      description: "Total assets (end of year)",
    },
  ],
};
