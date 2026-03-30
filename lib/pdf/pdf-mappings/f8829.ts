import type { FormPdfMapping, FillContext } from "../types";

const PAGE1 = "topmostSubform[0].Page1[0].";

export const F8829_MAPPING: FormPdfMapping = {
  formCode: "8829",
  pdfFileName: "f8829.pdf",
  taxYear: 2024,
  fields: [
    // ── Entity header ─────────────────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_01[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "header",
      description: "Name(s) of proprietor(s)",
    },
    {
      pdfFieldName: `${PAGE1}f1_02[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "header",
      description: "Your social security number / EIN",
    },

    // ── Part I – Part of Your Home Used for Business ──────────────────────────
    // Lines 1–7 require area (sq ft) measurements not available from QBO.
    // These are left as placeholders pending home-office fact collection.
    {
      pdfFieldName: `${PAGE1}f1_03[0]`,
      factName: "home_office_sqft",
      format: "integer",
      irsLine: "1",
      description: "Area used regularly and exclusively for business (sq ft)",
    },
    {
      pdfFieldName: `${PAGE1}f1_04[0]`,
      factName: "home_total_sqft",
      format: "integer",
      irsLine: "2",
      description: "Total area of home (sq ft)",
    },

    // ── Part II – Figure Your Allowable Deduction ─────────────────────────────
    // Lines 8–29 depend on Part I percentage and home expense detail not
    // tracked in QBO; all left as placeholders.

    // ── Part III – Depreciation of Your Home ──────────────────────────────────
    // Requires home basis / placed-in-service date; placeholder only.

    // ── Part IV – Carryover of Unallowed Expenses ─────────────────────────────
    // Placeholder; requires prior-year carryover data.
  ],
};
