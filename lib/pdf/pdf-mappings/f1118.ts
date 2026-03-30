import type { FormPdfMapping, FillContext } from "../types";

const PAGE_HEADER = "topmostSubform[0].Page1[0].PgHeader[0].";

export const F1118_MAPPING: FormPdfMapping = {
  formCode: "1118",
  pdfFileName: "f1118.pdf",
  taxYear: 2024,
  fields: [
    // ── Entity header ─────────────────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE_HEADER}f1_1[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "header",
      description: "Corporation name",
    },
    {
      pdfFieldName: `${PAGE_HEADER}f1_2[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "header",
      description: "Employer Identification Number (EIN)",
    },

    // ── Schedule A – Foreign Tax Credit Computation ───────────────────────────
    // Form 1118 is highly complex (1,263 fields across multiple schedules).
    // Requires foreign income category, country-by-country data, and foreign
    // tax paid / accrued — none of which are available from QBO facts.
    // All lines beyond the header are left as placeholders pending
    // foreign-tax fact collection.
  ],
};
