import type { FormPdfMapping, FillContext } from "../types";

const PAGE1 = "topmostSubform[0].Page1[0].";

export const F8825_MAPPING: FormPdfMapping = {
  formCode: "8825",
  pdfFileName: "f8825.pdf",
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

    // ── Table_Line1 – Rental property detail rows ─────────────────────────────
    // Individual property address / type / rent columns require per-property
    // data not available from QBO aggregates; rows left as placeholders.
    {
      pdfFieldName: `${PAGE1}f1_3[0]`,
      format: "string",
      irsLine: "1a",
      description: "Property 1 – street address (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_4[0]`,
      format: "string",
      irsLine: "1a",
      description: "Property 1 – city, state, ZIP (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_5[0]`,
      format: "string",
      irsLine: "1b",
      description: "Property 1 – type of property (placeholder)",
    },

    // ── Line 2 – Gross rents received ─────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_7[0]`,
      factName: "rent_income_total",
      format: "currency",
      irsLine: "2",
      description: "Gross rents – property 1 total",
    },

    // ── Lines 3–14 – Rental expenses ─────────────────────────────────────────
    // Per-property expense breakdown requires data not available from QBO
    // rental category aggregates; left as placeholders.
    {
      pdfFieldName: `${PAGE1}f1_11[0]`,
      format: "currency",
      irsLine: "3",
      description: "Advertising (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_15[0]`,
      format: "currency",
      irsLine: "4",
      description: "Auto and travel (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_19[0]`,
      format: "currency",
      irsLine: "5",
      description: "Cleaning and maintenance (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_23[0]`,
      format: "currency",
      irsLine: "6",
      description: "Commissions (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_27[0]`,
      format: "currency",
      irsLine: "7",
      description: "Insurance (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_31[0]`,
      format: "currency",
      irsLine: "8",
      description: "Legal and other professional fees (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_35[0]`,
      format: "currency",
      irsLine: "9",
      description: "Interest expense (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_39[0]`,
      format: "currency",
      irsLine: "10",
      description: "Repairs and maintenance (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_43[0]`,
      format: "currency",
      irsLine: "11",
      description: "Taxes (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_47[0]`,
      format: "currency",
      irsLine: "12",
      description: "Utilities (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_51[0]`,
      format: "currency",
      irsLine: "13",
      description: "Wages and salaries (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_55[0]`,
      format: "currency",
      irsLine: "14",
      description: "Depreciation (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_59[0]`,
      format: "currency",
      irsLine: "15",
      description: "Other expenses (placeholder)",
    },

    // ── Line 16 – Total expenses ──────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_63[0]`,
      format: "currency",
      irsLine: "16",
      description: "Total expenses for each property (placeholder)",
    },

    // ── Lines 17–21 – Totals ──────────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_67[0]`,
      factName: "rent_income_total",
      format: "currency",
      irsLine: "17",
      description: "Total gross rents (all properties combined)",
    },
    {
      pdfFieldName: `${PAGE1}f1_68[0]`,
      format: "currency",
      irsLine: "18",
      description: "Total expenses (all properties combined) (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_69[0]`,
      format: "currency",
      irsLine: "19",
      description: "Net gain (loss) from Form 4797 – rental (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_70[0]`,
      format: "currency",
      irsLine: "20",
      description: "Net income (loss) from rental real estate (placeholder)",
    },
    {
      pdfFieldName: `${PAGE1}f1_71[0]`,
      format: "currency",
      irsLine: "21",
      description: "Net income (loss) after limitations (placeholder)",
    },
  ],
};
