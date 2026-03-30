import type { FormPdfMapping, FillContext } from "../types";

const PAGE1 = "topmostSubform[0].Page1[0].";

export const F4797_MAPPING: FormPdfMapping = {
  formCode: "4797",
  pdfFileName: "f4797.pdf",
  taxYear: 2024,
  fields: [
    // ── Entity header ─────────────────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_1[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "header",
      description: "Name shown on return",
    },
    {
      pdfFieldName: `${PAGE1}f1_2[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "header",
      description: "Identifying number (EIN or SSN)",
    },

    // ── Part I – Sales or Exchanges of Property Used in a Trade or Business ──
    // Most Part I detail rows require sale-specific data not available from QBO.
    // Line 7 (combined gain/loss summary) would be populated by a separate
    // capital-gain fact once available.

    // ── Part II – Ordinary Gains and Losses ──────────────────────────────────
    // Line 18/19 detail rows require asset-level data; left as placeholders.
    {
      pdfFieldName: `${PAGE1}f1_86[0]`,
      format: "currency",
      irsLine: "18",
      description: "Ordinary gains/losses not from Part I or III (placeholder)",
    },

    // ── Part III – Gain From Disposition of Property Under Sections 1245, 1250
    // Asset-level depreciation recapture data not available from QBO.

    // ── Part IV – Recapture Amounts Under Sections 179 and 280F ─────────────
    // Requires per-asset basis data; left as placeholder.
  ],
};
