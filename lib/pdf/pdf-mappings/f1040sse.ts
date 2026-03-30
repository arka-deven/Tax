import type { FormPdfMapping, FillContext } from "../types";

const P = "topmostSubform[0].Page1[0].";

export const F1040SSE_MAPPING: FormPdfMapping = {
  formCode: "Sch SE",
  pdfFileName: "f1040sse.pdf",
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
      description: "Name of person with self-employment income",
    },
    {
      pdfFieldName: `${P}f1_2[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "Header",
      description: "Social security number of person with self-employment income",
    },
    {
      pdfFieldName: `${P}c1_1[0]`,
      staticValue: "X",
      irsLine: "Header",
      description: "Checkbox — skip short-schedule test (use long Schedule SE)",
    },

    // -------------------------------------------------------------------------
    // Part I — Self-Employment Tax
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_3[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "1a",
      description: "Net farm profit (or loss) from Schedule F",
    },
    {
      pdfFieldName: `${P}f1_4[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "1b",
      description: "Social security tips from Form 4137",
    },
    {
      pdfFieldName: `${P}f1_5[0]`,
      factName: "net_income_before_tax",
      format: "currency",
      irsLine: "2",
      description: "Net profit (or loss) from Schedule C",
    },
    {
      pdfFieldName: `${P}f1_6[0]`,
      compute: (ctx: FillContext) => {
        const net = Number(ctx.facts["net_income_before_tax"] ?? 0);
        return net !== 0 ? String(net) : undefined;
      },
      format: "currency",
      irsLine: "3",
      description: "Combine lines 1a, 1b, and 2",
    },
    {
      pdfFieldName: `${P}f1_7[0]`,
      factName: "se_tax_base",
      format: "currency",
      irsLine: "4a",
      description: "Multiply line 3 by 92.35% (0.9235)",
    },
    {
      pdfFieldName: `${P}f1_8[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "4b",
      description: "If line 4a is less than $400, enter amount from line 3",
    },
    {
      pdfFieldName: `${P}f1_9[0]`,
      factName: "se_tax_base",
      format: "currency",
      irsLine: "4c",
      description: "Combine lines 4a and 4b",
    },
    {
      pdfFieldName: `${P}Line5a_ReadOrder[0].f1_10[0]`,
      factName: "ss_tax",
      format: "currency",
      irsLine: "5a",
      description: "Social security tax (12.4% of line 4c up to SS wage base)",
    },
    {
      pdfFieldName: `${P}f1_11[0]`,
      factName: "medicare_tax",
      format: "currency",
      irsLine: "5b",
      description: "Medicare tax (2.9% of line 4c)",
    },
    {
      pdfFieldName: `${P}f1_12[0]`,
      factName: "self_employment_tax",
      format: "currency",
      irsLine: "6",
      description: "Self-employment tax (add lines 5a and 5b)",
    },
    {
      pdfFieldName: `${P}f1_13[0]`,
      factName: "se_tax_deduction",
      format: "currency",
      irsLine: "7",
      description: "Deductible part of self-employment tax (multiply line 6 by 50%)",
    },
  ],
};
