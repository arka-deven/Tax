import type { FormPdfMapping, FillContext } from "../types";

const H = "topmostSubform[0].Page1[0].Header[0].";

export const F1120SSK_MAPPING: FormPdfMapping = {
  formCode: "Sch K-1 (S)",
  pdfFileName: "f1120ssk.pdf",
  taxYear: 2025,
  fields: [
    // -------------------------------------------------------------------------
    // Header — Calendar year
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${H}ForCalendarYear[0].f1_01[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year begin",
    },
    {
      pdfFieldName: `${H}ForCalendarYear[0].f1_02[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year end year",
    },
    {
      pdfFieldName: `${H}ForCalendarYear[0].f1_03[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year end month/day",
    },
    {
      pdfFieldName: `${H}ForCalendarYear[0].f1_04[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year footer",
    },

    // -------------------------------------------------------------------------
    // Header — Corporation info
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${H}f1_05[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "Header",
      description: "Corporation's name",
    },
    {
      pdfFieldName: `${H}f1_06[0]`,
      compute: (ctx: FillContext) => ctx.meta.address,
      format: "string",
      irsLine: "Header",
      description: "Corporation's street address",
    },
    {
      pdfFieldName: `${H}f1_07[0]`,
      compute: (ctx: FillContext) => ctx.meta.city,
      format: "string",
      irsLine: "Header",
      description: "Corporation's city",
    },
    {
      pdfFieldName: `${H}f1_08[0]`,
      compute: (ctx: FillContext) => ctx.meta.state,
      format: "string",
      irsLine: "Header",
      description: "Corporation's state",
    },
    {
      pdfFieldName: `${H}f1_09[0]`,
      compute: (ctx: FillContext) => ctx.meta.zip,
      format: "string",
      irsLine: "Header",
      description: "Corporation's ZIP code",
    },
    {
      pdfFieldName: `${H}f1_10[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "Header",
      description: "Corporation's Employer Identification Number (EIN)",
    },
  ],
};
