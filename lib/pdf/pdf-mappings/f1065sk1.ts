import type { FormPdfMapping, FillContext } from "../types";

const H = "topmostSubform[0].Page1[0].Pg1Header[0].";

export const F1065SK1_MAPPING: FormPdfMapping = {
  formCode: "Sch K-1",
  pdfFileName: "f1065sk1.pdf",
  taxYear: 2025,
  fields: [
    // -------------------------------------------------------------------------
    // Header — Calendar year
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${H}ForCalendarYear[0].f1_1[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year begin",
    },
    {
      pdfFieldName: `${H}ForCalendarYear[0].f1_2[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year end year",
    },
    {
      pdfFieldName: `${H}ForCalendarYear[0].f1_3[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year end month/day",
    },
    {
      pdfFieldName: `${H}ForCalendarYear[0].f1_4[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year footer",
    },

    // -------------------------------------------------------------------------
    // Header — Partnership info
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${H}f1_5[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "Header",
      description: "Partnership's name",
    },
    {
      pdfFieldName: `${H}f1_6[0]`,
      compute: (ctx: FillContext) => ctx.meta.address,
      format: "string",
      irsLine: "Header",
      description: "Partnership's street address",
    },
    {
      pdfFieldName: `${H}f1_7[0]`,
      compute: (ctx: FillContext) => ctx.meta.city,
      format: "string",
      irsLine: "Header",
      description: "Partnership's city",
    },
    {
      pdfFieldName: `${H}f1_8[0]`,
      compute: (ctx: FillContext) => ctx.meta.state,
      format: "string",
      irsLine: "Header",
      description: "Partnership's state",
    },
    {
      pdfFieldName: `${H}f1_9[0]`,
      compute: (ctx: FillContext) => ctx.meta.zip,
      format: "string",
      irsLine: "Header",
      description: "Partnership's ZIP code",
    },
    {
      pdfFieldName: `${H}f1_10[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "Header",
      description: "Partnership's Employer Identification Number (EIN)",
    },

    // -------------------------------------------------------------------------
    // Part III — Partner's Share of Current Year Income / Deductions
    // -------------------------------------------------------------------------
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_30[0]",
      factName: "net_income_before_tax",
      format: "currency",
      irsLine: "1",
      description: "Ordinary business income (loss)",
    },
  ],
};
