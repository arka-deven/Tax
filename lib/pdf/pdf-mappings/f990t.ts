import type { FormPdfMapping, FillContext } from "../types";

const P = "topmostSubform[0].Page1[0].";

export const F990T_MAPPING: FormPdfMapping = {
  formCode: "990-T",
  pdfFileName: "f990t.pdf",
  taxYear: 2025,
  fields: [
    // -------------------------------------------------------------------------
    // Header fields
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}PgHeader[0].f1_1[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year begin",
    },
    {
      pdfFieldName: `${P}PgHeader[0].f1_2[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year end",
    },
    {
      pdfFieldName: `${P}PgHeader[0].f1_3[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year footer",
    },
    {
      pdfFieldName: `${P}NameAddress_ReadOrder[0].f1_4[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "Header",
      description: "Name of organization",
    },
    {
      pdfFieldName: `${P}NameAddress_ReadOrder[0].f1_5[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "Header",
      description: "Employer Identification Number (EIN)",
    },
  ],
};
