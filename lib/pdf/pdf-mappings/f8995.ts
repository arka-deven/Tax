import type { FormPdfMapping, FillContext } from "../types";

const P = "topmostSubform[0].Page1[0].";

export const F8995_MAPPING: FormPdfMapping = {
  formCode: "8995",
  pdfFileName: "f8995.pdf",
  taxYear: 2025,
  fields: [
    // -------------------------------------------------------------------------
    // Header fields
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_1[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "Header",
      description: "Name of taxpayer",
    },
    {
      pdfFieldName: `${P}f1_2[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "Header",
      description: "Taxpayer identification number (SSN or EIN)",
    },

    // -------------------------------------------------------------------------
    // Part I — Qualified Business Income from Trades or Businesses
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_3[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "1i",
      description: "Trade, business, or aggregation name (row 1)",
    },
    {
      pdfFieldName: `${P}f1_4[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "1ii",
      description: "Taxpayer identification number for the trade or business (row 1)",
    },
    {
      pdfFieldName: `${P}f1_5[0]`,
      factName: "net_income_before_tax",
      format: "currency",
      irsLine: "1iii",
      description: "Qualified business income or (loss) from the trade or business (row 1)",
    },
    {
      pdfFieldName: `${P}f1_6[0]`,
      factName: undefined,
      format: "string",
      irsLine: "2i",
      description: "Trade, business, or aggregation name (row 2)",
    },
    {
      pdfFieldName: `${P}f1_7[0]`,
      factName: undefined,
      format: "string",
      irsLine: "2ii",
      description: "Taxpayer identification number (row 2)",
    },
    {
      pdfFieldName: `${P}f1_8[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "2iii",
      description: "Qualified business income or (loss) (row 2)",
    },
    {
      pdfFieldName: `${P}f1_9[0]`,
      factName: undefined,
      format: "string",
      irsLine: "3i",
      description: "Trade, business, or aggregation name (row 3)",
    },
    {
      pdfFieldName: `${P}f1_10[0]`,
      factName: undefined,
      format: "string",
      irsLine: "3ii",
      description: "Taxpayer identification number (row 3)",
    },
    {
      pdfFieldName: `${P}f1_11[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "3iii",
      description: "Qualified business income or (loss) (row 3)",
    },
    {
      pdfFieldName: `${P}f1_12[0]`,
      factName: "net_income_before_tax",
      format: "currency",
      irsLine: "4",
      description: "Total qualified business income (add all amounts in column (iii))",
    },
    {
      pdfFieldName: `${P}f1_13[0]`,
      factName: "net_income_before_tax",
      format: "currency",
      irsLine: "5",
      description: "Qualified business net income or (loss) (after any carryovers from prior year)",
    },

    // -------------------------------------------------------------------------
    // Part II — QBI Component
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_17[0]`,
      factName: "qbi_component",
      format: "currency",
      irsLine: "10",
      description: "QBI component (20% of line 5, if positive)",
    },
    {
      pdfFieldName: `${P}f1_18[0]`,
      factName: "taxable_income",
      format: "currency",
      irsLine: "11",
      description: "Taxable income before QBI deduction",
    },
    {
      pdfFieldName: `${P}f1_19[0]`,
      factName: "capital_gain_total",
      format: "currency",
      irsLine: "12",
      description: "Net capital gains (from Schedule D or instructions)",
    },
    {
      pdfFieldName: `${P}f1_20[0]`,
      compute: (ctx: FillContext) => { const ti = Number(ctx.facts.taxable_income ?? 0); const cg = Number(ctx.facts.capital_gain_total ?? 0); return String(Math.max(0, ti - cg)); },
      format: "currency",
      irsLine: "13",
      description: "Subtract line 12 from line 11 (not less than zero)",
    },
    {
      pdfFieldName: `${P}f1_21[0]`,
      compute: (ctx: FillContext) => {
        const taxable = Number(ctx.facts["net_income_before_tax"] ?? 0);
        const limit = Math.max(0, Math.round(taxable * 0.2));
        return limit !== 0 ? String(limit) : undefined;
      },
      format: "currency",
      irsLine: "14",
      description: "Income limitation (20% of line 13)",
    },
    {
      pdfFieldName: `${P}f1_22[0]`,
      factName: "qbi_deduction",
      format: "currency",
      irsLine: "15",
      description: "QBI deduction (lesser of line 10 or line 14)",
    },
    {
      pdfFieldName: `${P}f1_23[0]`,
      compute: (ctx: FillContext) => {
        const qbi = Number(ctx.facts["net_income_before_tax"] ?? 0);
        const qbiComponent = Math.max(0, Math.round(qbi * 0.2));
        return qbiComponent !== 0 ? String(qbiComponent) : undefined;
      },
      format: "currency",
      irsLine: "16",
      description: "Total QBI deduction (add lines 15; include REIT/PTP deductions if applicable)",
    },
    {
      pdfFieldName: `${P}f1_24[0]`,
      compute: (ctx: FillContext) => {
        const qbi = Number(ctx.facts["net_income_before_tax"] ?? 0);
        const qbiComponent = Math.max(0, Math.round(qbi * 0.2));
        return qbiComponent !== 0 ? String(qbiComponent) : undefined;
      },
      format: "currency",
      irsLine: "17",
      description: "Total QBI plus qualified REIT dividends and PTP income deduction",
    },
  ],
};
