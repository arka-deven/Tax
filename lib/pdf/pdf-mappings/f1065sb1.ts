import type { FormPdfMapping, FillContext } from "../types";

const P = "topmostSubform[0].Page1[0].";

export const F1065SB1_MAPPING: FormPdfMapping = {
  formCode: "Sch B-1",
  pdfFileName: "f1065sb1.pdf",
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
      description: "Partnership's name",
    },
    {
      pdfFieldName: `${P}f1_2[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "Header",
      description: "Employer Identification Number (EIN)",
    },

    // -------------------------------------------------------------------------
    // Part I — Entities Owning 50% or More of the Partnership
    // (placeholder rows — partner data populated at runtime)
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_3[0]`,
      format: "string",
      irsLine: "Part I",
      description: "Entity name — row 1",
    },
    {
      pdfFieldName: `${P}f1_4[0]`,
      format: "string",
      irsLine: "Part I",
      description: "Entity EIN or SSN — row 1",
    },
    {
      pdfFieldName: `${P}f1_5[0]`,
      format: "string",
      irsLine: "Part I",
      description: "Country of organization — row 1",
    },
    {
      pdfFieldName: `${P}f1_6[0]`,
      format: "percent",
      irsLine: "Part I",
      description: "Maximum percentage owned — row 1",
    },
  ],
};
