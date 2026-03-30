import type { FormPdfMapping, FillContext } from "../types";

/**
 * Schedules K-2 / K-3 — Partners' Distributive Share Items — International.
 * These are complex multi-page forms. No separate fillable PDF is publicly available
 * from the IRS for K-2/K-3 in a single file. We use the 1065 as a placeholder
 * since K-2/K-3 items are derived from the partnership return.
 */
export const K2K3_MAPPING: FormPdfMapping = {
  formCode: "K-2/K-3",
  pdfFileName: "f1065.pdf",
  taxYear: 2025,
  fields: [
    { pdfFieldName: "topmostSubform[0].Page1[0].HeaderAddress_ReadOrder[0].CalendarName_ReadOrder[0].f1_04[0]", compute: (ctx: FillContext) => ctx.meta.companyName, format: "string", irsLine: "header", description: "Partnership name" },
    { pdfFieldName: "topmostSubform[0].Page1[0].HeaderAddress_ReadOrder[0].CalendarName_ReadOrder[0].f1_09[0]", compute: (ctx: FillContext) => ctx.meta.ein, format: "string", irsLine: "D", description: "EIN" },
  ],
};
