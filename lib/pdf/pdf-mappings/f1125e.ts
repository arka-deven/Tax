import type { FormPdfMapping, FillContext } from "../types";

const PAGE1 = "topmostSubform[0].Page1[0].";

export const F1125E_MAPPING: FormPdfMapping = {
  formCode: "1125-E",
  pdfFileName: "f1125e.pdf",
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

    // ── Line 1 – Officer table rows ───────────────────────────────────────────
    // Individual officer name / SSN / % ownership / amount fields require
    // per-officer payroll data not available from QBO aggregates.
    // Row 1 column fields (f1_3 through f1_9) are left as placeholders.
    {
      pdfFieldName: `${PAGE1}f1_3[0]`,
      compute: () => "",
      format: "string",
      irsLine: "1",
      description: "Officer 1 – name (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_4[0]`,
      compute: () => "",
      format: "string",
      irsLine: "1",
      description: "Officer 1 – SSN (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_5[0]`,
      compute: () => "",
      format: "percent",
      irsLine: "1",
      description: "Officer 1 – percent of time devoted to business (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_6[0]`,
      compute: () => "",
      format: "percent",
      irsLine: "1",
      description: "Officer 1 – percent of stock owned – common (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_7[0]`,
      compute: () => "",
      format: "percent",
      irsLine: "1",
      description: "Officer 1 – percent of stock owned – preferred (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_8[0]`,
      compute: () => "",
      format: "currency",
      irsLine: "1",
      description: "Officer 1 – amount of compensation (placeholder)",
    },

    // ── Line 2 – Total compensation of officers ───────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_124[0]`,
      factName: "officer_compensation_total",
      format: "currency",
      irsLine: "2",
      description: "Total compensation of officers",
    },

    // ── Line 3 – Compensation of officers claimed on Schedule A or elsewhere ──
    {
      pdfFieldName: `${PAGE1}f1_125[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "3",
      description: "Compensation of officers claimed on Schedule A or elsewhere (placeholder)",
    },
  ],
};
