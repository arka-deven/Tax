import type { FormPdfMapping, FillContext } from "../types";

const P1 = "topmostSubform[0].Page1[0].";
const P2 = "topmostSubform[0].Page2[0].";

export const F1120SD_MAPPING: FormPdfMapping = {
  formCode: "Sch D",
  pdfFileName: "f1120sd.pdf",
  taxYear: 2025,
  fields: [
    // -------------------------------------------------------------------------
    // Header fields — Page 1
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P1}f1_1[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "Header",
      description: "Name of corporation",
    },
    {
      pdfFieldName: `${P1}f1_2[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "Header",
      description: "Employer Identification Number (EIN)",
    },

    // -------------------------------------------------------------------------
    // Part I — Short-Term Capital Gains and Losses (assets held 1 year or less)
    // Note: detailed transaction rows (1a–1c) require per-transaction data
    // not yet available in TaxFactsEngine; mapped here as placeholders.
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P1}f1_3[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "1a",
      description: "Short-term totals from Form 8949, box A",
    },
    {
      pdfFieldName: `${P1}f1_4[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "1b",
      description: "Short-term totals from Form 8949, box B",
    },
    {
      pdfFieldName: `${P1}f1_5[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "1c",
      description: "Short-term totals from Form 8949, box C",
    },
    {
      pdfFieldName: `${P1}f1_6[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "7",
      description: "Net short-term capital gain or (loss) from Part I",
    },

    // -------------------------------------------------------------------------
    // Part II — Long-Term Capital Gains and Losses (assets held more than 1 year)
    // Note: detailed transaction rows (8a–8c) require per-transaction data.
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P2}f2_1[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "8a",
      description: "Long-term totals from Form 8949, box D",
    },
    {
      pdfFieldName: `${P2}f2_2[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "8b",
      description: "Long-term totals from Form 8949, box E",
    },
    {
      pdfFieldName: `${P2}f2_3[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "8c",
      description: "Long-term totals from Form 8949, box F",
    },
    {
      pdfFieldName: `${P2}f2_4[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "11",
      description: "Long-term capital gain from installment sales (Form 6252)",
    },
    {
      pdfFieldName: `${P2}f2_5[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "15",
      description: "Net long-term capital gain or (loss) from Part II",
    },

    // -------------------------------------------------------------------------
    // Summary — Line 16
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P2}f2_6[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "16",
      description: "Combined net capital gain or (loss) — add lines 7 and 15",
    },
  ],
};
