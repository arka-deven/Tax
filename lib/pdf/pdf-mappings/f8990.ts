import type { FormPdfMapping, FillContext } from "../types";

const PAGE1 = "topmostSubform[0].Page1[0].";

export const F8990_MAPPING: FormPdfMapping = {
  formCode: "8990",
  pdfFileName: "f8990.pdf",
  taxYear: 2024,
  fields: [
    // ── Entity header ─────────────────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_1[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "header",
      description: "Name",
    },
    {
      pdfFieldName: `${PAGE1}f1_2[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "header",
      description: "Employer Identification Number (EIN)",
    },

    // ── Part I – Business Interest Expense ────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_3[0]`,
      factName: "interest_expense_total",
      format: "currency",
      irsLine: "1",
      description: "Current year business interest expense",
    },

    // Lines 2–5 require disallowed carryforward, floor plan, and partnership
    // pass-through data not available from QBO; left as placeholders.
    {
      pdfFieldName: `${PAGE1}f1_4[0]`,
      format: "currency",
      irsLine: "2",
      description: "Disallowed business interest expense carryforward (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_5[0]`,
      format: "currency",
      irsLine: "3",
      description: "Floor plan financing interest expense (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_6[0]`,
      format: "currency",
      irsLine: "4",
      description: "Business interest expense from partnerships (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_7[0]`,
      format: "currency",
      irsLine: "5",
      description: "Total business interest expense (Lines 1–4) (placeholder)",
    },

    // ── Part II – ATI (Adjusted Taxable Income) ───────────────────────────────
    // ATI computation requires detailed income/deduction adjustments beyond
    // what QBO facts currently provide; left as placeholders.
    {
      pdfFieldName: `${PAGE1}f1_8[0]`,
      format: "currency",
      irsLine: "6",
      description: "Taxable income before business interest expense deduction (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_9[0]`,
      format: "currency",
      irsLine: "7",
      description: "Business interest income (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_10[0]`,
      format: "currency",
      irsLine: "8",
      description: "Floor plan financing interest expense included on Line 3 (placeholder)",
    },

    // ── Part III – Allowable Business Interest Expense ────────────────────────
    // Computed from Parts I & II; placeholder only.
    {
      pdfFieldName: `${PAGE1}f1_30[0]`,
      format: "currency",
      irsLine: "30",
      description: "Current year allowable business interest expense (placeholder)",
    },
  ],
};
