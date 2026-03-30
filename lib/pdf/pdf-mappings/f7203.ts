import type { FormPdfMapping, FillContext } from "../types";

const PAGE1 = "topmostSubform[0].Page1[0].";

export const F7203_MAPPING: FormPdfMapping = {
  formCode: "7203",
  pdfFileName: "f7203.pdf",
  taxYear: 2024,
  fields: [
    // ── Entity / shareholder header ───────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_01[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "header",
      description: "Name of shareholder",
    },
    {
      pdfFieldName: `${PAGE1}f1_02[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "header",
      description: "Shareholder's identifying number (SSN or EIN)",
    },

    // ── Part I – Shareholder Stock Basis ─────────────────────────────────────
    // Lines 1–6 require per-shareholder stock basis data (beginning basis,
    // capital contributions, loans, distributions) not available from QBO.
    // All left as placeholders pending shareholder-level fact collection.
    {
      pdfFieldName: `${PAGE1}f1_03[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "1",
      description: "Stock basis at beginning of corporation's tax year (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_04[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "2a",
      description: "Ordinary business income (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_05[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "2b",
      description: "Separately stated income items (placeholder)",
    },

    // ── Part II – Shareholder Debt Basis ─────────────────────────────────────
    // Requires per-loan shareholder debt data; placeholder only.

    // ── Part III – Allowable Losses and Deductions ────────────────────────────
    // Computed from Parts I & II; placeholder only.
  ],
};
