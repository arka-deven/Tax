import type { FormPdfMapping, FillContext } from "../types";

const PAGE1 = "topmostSubform[0].Page1[0].";

export const F1120SM3_MAPPING: FormPdfMapping = {
  formCode: "Sch M-3",
  pdfFileName: "f1120sm3.pdf",
  taxYear: 2024,
  fields: [
    // ── Entity header ─────────────────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_1[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "header",
      description: "Name of corporation",
    },
    {
      pdfFieldName: `${PAGE1}f1_2[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "header",
      description: "Employer Identification Number (EIN)",
    },

    // ── Part I – Financial Information and Net Income (Loss) Reconciliation ───
    // Line 4a – Total assets: available from QBO balance sheet
    {
      pdfFieldName: `${PAGE1}f1_10[0]`,
      factName: "total_assets",
      format: "currency",
      irsLine: "4a",
      description: "Total assets at end of tax year",
    },

    // Line 11 – Net income (loss) per income statement
    {
      pdfFieldName: `${PAGE1}f1_20[0]`,
      factName: "net_income_before_tax",
      format: "currency",
      irsLine: "11",
      description: "Net income (loss) per income statement",
    },

    // ── Part II – Reconciliation of Net Income (Loss) per Income Statement
    //              with Taxable Income per Return ──────────────────────────────
    // Lines 1–26 require book-to-tax difference detail per income/expense
    // category; most require manual analysis beyond QBO facts.
    // Key lines populated where facts are available:

    // Line 1 – Income (loss) from equity method foreign corporations (placeholder)
    {
      pdfFieldName: `${PAGE1}f1_31[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "Pt II, 1",
      description: "Income from equity method foreign corporations – book (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_32[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "Pt II, 1",
      description: "Income from equity method foreign corporations – temp diff (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_33[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "Pt II, 1",
      description: "Income from equity method foreign corporations – perm diff (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_34[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "Pt II, 1",
      description: "Income from equity method foreign corporations – tax (placeholder)",
    },

    // ── Part III – Reconciliation of Net Income (Loss) per Income Statement
    //               with Taxable Income per Return – Expense/Deduction Items ───
    // Lines 1–38 require per-category book/tax differences; placeholders only.

    // Line 38 – Total expense/deduction items
    {
      pdfFieldName: `${PAGE1}f1_350[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "Pt III, 38",
      description: "Total expense/deduction items – book (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_351[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "Pt III, 38",
      description: "Total expense/deduction items – temp diff (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_352[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "Pt III, 38",
      description: "Total expense/deduction items – perm diff (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_353[0]`,
      compute: () => "0",
      format: "currency",
      irsLine: "Pt III, 38",
      description: "Total expense/deduction items – tax (placeholder)",
    },
  ],
};
