import type { FormPdfMapping } from "../types";

const LEFT = "topmostSubform[0].Page6[0].SchM-2_Left[0].";
const RIGHT = "topmostSubform[0].Page6[0].SchM-2_Right[0].";

export const SCH_M2_MAPPING: FormPdfMapping = {
  formCode: "Sch M-2",
  pdfFileName: "f1120.pdf",
  taxYear: 2025,
  fields: [
    // -------------------------------------------------------------------------
    // Left side — Increases to retained earnings
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LEFT}f6_156[0]`,
      factName: "boy_retained_earnings_total",
      format: "currency",
      irsLine: "1",
      description: "Balance at beginning of year",
    },
    {
      pdfFieldName: `${LEFT}f6_157[0]`,
      factName: "net_income_before_tax",
      format: "currency",
      irsLine: "2",
      description: "Net income (loss) per books",
    },
    {
      pdfFieldName: `${LEFT}f6_158[0]`,
      format: "string",
      irsLine: "3",
      description: "Other increases (itemize)",
    },
    {
      pdfFieldName: `${LEFT}f6_159[0]`,
      format: "currency",
      irsLine: "3",
      description: "Other increases — amount",
    },
    {
      pdfFieldName: `${LEFT}f6_160[0]`,
      format: "currency",
      irsLine: "4",
      description: "Total (add lines 1, 2, and 3)",
    },
    {
      pdfFieldName: `${LEFT}f6_161[0]`,
      format: "currency",
      irsLine: "4-cont",
      description: "Line 4 continuation (left)",
    },
    {
      pdfFieldName: `${LEFT}f6_162[0]`,
      format: "currency",
      irsLine: "4-cont2",
      description: "Line 4 continuation (left)",
    },

    // -------------------------------------------------------------------------
    // Right side — Decreases to retained earnings
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${RIGHT}f6_163[0]`,
      format: "currency",
      irsLine: "5a",
      description: "Distributions — cash",
    },
    {
      pdfFieldName: `${RIGHT}f6_164[0]`,
      format: "currency",
      irsLine: "5b",
      description: "Distributions — stock",
    },
    {
      pdfFieldName: `${RIGHT}f6_165[0]`,
      format: "currency",
      irsLine: "5c",
      description: "Distributions — property",
    },
    {
      pdfFieldName: `${RIGHT}f6_166[0]`,
      format: "string",
      irsLine: "6",
      description: "Other decreases (itemize)",
    },
    {
      pdfFieldName: `${RIGHT}f6_167[0]`,
      format: "currency",
      irsLine: "6",
      description: "Other decreases — amount",
    },
    {
      pdfFieldName: `${RIGHT}f6_168[0]`,
      format: "currency",
      irsLine: "7",
      description: "Total of lines 5 and 6",
    },
    {
      pdfFieldName: `${RIGHT}f6_169[0]`,
      factName: "retained_earnings_total",
      format: "currency",
      irsLine: "8",
      description: "Balance at end of year (line 4 minus line 7)",
    },
  ],
};
