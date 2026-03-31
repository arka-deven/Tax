import type { FormPdfMapping, FillContext } from "../types";
import { sbCheck, officer, currency } from "../types";

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

    // ── Auto-generated mappings (remaining fields) ──────────────────
    { pdfFieldName: "topmostSubform[0].Page1[0].LeftCol[0].c1_4[1]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q4"), format: "boolean", description: "Checkbox: p1_q4" },
    { pdfFieldName: "topmostSubform[0].Page1[0].LeftCol[0].c1_5[1]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q5"), format: "boolean", description: "Checkbox: p1_q5" },
    { pdfFieldName: "topmostSubform[0].Page1[0].LeftCol[0].c1_6[0]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q6"), format: "boolean", description: "Checkbox: p1_q6" },
    { pdfFieldName: "topmostSubform[0].Page1[0].LeftCol[0].c1_7[0]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q7"), format: "boolean", description: "Checkbox: p1_q7" },
    { pdfFieldName: "topmostSubform[0].Page1[0].LeftCol[0].c1_8[0]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q8"), format: "boolean", description: "Checkbox: p1_q8" },
    { pdfFieldName: "topmostSubform[0].Page1[0].LeftCol[0].c1_8[1]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q8"), format: "boolean", description: "Checkbox: p1_q8" },
    { pdfFieldName: "topmostSubform[0].Page1[0].LeftCol[0].LineK1Table[0].c1_9[0]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q9"), format: "boolean", description: "Checkbox: p1_q9" },
    { pdfFieldName: "topmostSubform[0].Page1[0].LeftCol[0].LineK1Table[0].c1_10[0]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q10"), format: "boolean", description: "Checkbox: p1_q10" },
    { pdfFieldName: "topmostSubform[0].Page1[0].LeftCol[0].c1_11[0]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q11"), format: "boolean", description: "Checkbox: p1_q11" },
    { pdfFieldName: "topmostSubform[0].Page1[0].LeftCol[0].c1_11[1]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q11"), format: "boolean", description: "Checkbox: p1_q11" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol1[0].f1_52[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol1[0].f1_53[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol1[0].f1_54[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol1[0].Line13[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol1[0].f1_56[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol1[0].f1_57[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol1[0].f1_58[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_60[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_61[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_62[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_64[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_65[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].c1_12[0]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q12"), format: "boolean", description: "Checkbox: p1_q12" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_79[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_80[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_81[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_82[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_83[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_84[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_85[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_87[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_88[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_89[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_90[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_91[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_92[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_93[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_94[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_95[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_96[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_97[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_98[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].RightCol2[0].f1_66[0]", manual: true, description: "K-1 entity/owner info" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].c1_13[0]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q13"), format: "boolean", description: "Checkbox: p1_q13" },
    { pdfFieldName: "topmostSubform[0].Page1[0].RightCol[0].c1_14[0]", compute: (ctx: FillContext) => sbCheck(ctx, "p1_q14"), format: "boolean", description: "Checkbox: p1_q14" },
  ],
};
