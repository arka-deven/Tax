import type { FormPdfMapping, FillContext } from "../types";

const P = "topmostSubform[0].Page1[0].";

export const F4562_MAPPING: FormPdfMapping = {
  formCode: "4562",
  pdfFileName: "f4562.pdf",
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
      description: "Name of entity as shown on tax return",
    },
    {
      pdfFieldName: `${P}f1_2[0]`,
      factName: undefined,
      compute: (ctx: FillContext) => ctx.facts.principal_business_activity as string ?? "",
      format: "string",
      irsLine: "Header",
      description: "Business or activity to which this form relates",
    },
    {
      pdfFieldName: `${P}f1_3[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "Header",
      description: "Employer Identification Number (EIN)",
    },

    // -------------------------------------------------------------------------
    // Part I — Election To Expense Certain Property Under Section 179
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_4[0]`,
      staticValue: "1220000",
      format: "currency",
      irsLine: "1",
      description: "Maximum amount (2025 limit: $1,220,000)",
    },
    {
      pdfFieldName: `${P}f1_5[0]`,
      factName: "depr_179_eligible_cost",
      format: "currency",
      irsLine: "2",
      description: "Total cost of section 179 property placed in service",
    },
    {
      pdfFieldName: `${P}f1_6[0]`,
      staticValue: "3050000",
      format: "currency",
      irsLine: "3",
      description: "Threshold cost before phase-out begins (2025: $3,050,000)",
    },
    {
      pdfFieldName: `${P}f1_9[0]`,
      factName: undefined,
      compute: (ctx: FillContext) => { const max = 1220000; const cost = Number(ctx.facts.depr_179_eligible_cost ?? ctx.facts.section_179_eligible_cost ?? 0); return String(Math.min(max, cost)); },
      format: "currency",
      irsLine: "5",
      description: "Dollar limitation for tax year (line 1 minus line 4, not less than zero)",
    },
    {
      pdfFieldName: `${P}f1_12[0]`,
      factName: "taxable_income_before_nol",
      format: "currency",
      irsLine: "11",
      description: "Business income limitation for section 179 deduction",
    },
    {
      pdfFieldName: `${P}f1_13[0]`,
      factName: "depr_section_179_total",
      format: "currency",
      irsLine: "12",
      description: "Section 179 expense deduction (lesser of line 5, 6, or 11)",
    },

    // -------------------------------------------------------------------------
    // Part II — Special Depreciation Allowance and Other Depreciation
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_14[0]`,
      factName: "depr_bonus_total",
      format: "currency",
      irsLine: "14",
      description: "Special depreciation allowance (bonus depreciation) for qualified property",
    },

    // -------------------------------------------------------------------------
    // Part III — MACRS Depreciation
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_17[0]`,
      factName: "depr_macrs_prior_year",
      format: "currency",
      irsLine: "17",
      description: "MACRS deductions for assets placed in service in tax years beginning before 2025",
    },
    {
      pdfFieldName: `${P}f1_22[0]`,
      factName: "depr_total_all",
      format: "currency",
      irsLine: "22",
      description: "Total depreciation (add amounts in column (g), lines 15 through 21)",
    },
  ],
};
