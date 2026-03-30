import type { FormPdfMapping, FillContext } from "../types";

/**
 * Schedule K — Shareholders'/Partners' Distributive Share Items.
 * This schedule is embedded within the primary return PDFs (1120-S pages 3-4, 1065 pages 4-5).
 * We map to f1120s.pdf since S-Corp is the most common use case.
 * The same PDF will be filled when Form 1120-S is generated.
 */
export const SCH_K_MAPPING: FormPdfMapping = {
  formCode: "Sch K",
  pdfFileName: "f1120s.pdf",
  taxYear: 2025,
  fields: [
    // Header — reuse 1120-S header fields
    { pdfFieldName: "topmostSubform[0].Page1[0].f1_4[0]", compute: (ctx: FillContext) => ctx.meta.companyName, format: "string", irsLine: "header", description: "Corporation/partnership name" },
    { pdfFieldName: "topmostSubform[0].Page1[0].f1_9[0]", compute: (ctx: FillContext) => ctx.meta.ein, format: "string", irsLine: "B", description: "EIN" },
  ],
};
