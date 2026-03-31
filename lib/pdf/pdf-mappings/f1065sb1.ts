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
      compute: () => "",
      format: "string",
      irsLine: "Part I",
      description: "Entity name — row 1",
    },
    {
      pdfFieldName: `${P}f1_4[0]`,
      compute: () => "",
      format: "string",
      irsLine: "Part I",
      description: "Entity EIN or SSN — row 1",
    },
    {
      pdfFieldName: `${P}f1_5[0]`,
      compute: () => "",
      format: "string",
      irsLine: "Part I",
      description: "Country of organization — row 1",
    },
    {
      pdfFieldName: `${P}f1_6[0]`,
      compute: () => "",
      format: "percent",
      irsLine: "Part I",
      description: "Maximum percentage owned — row 1",
    },

    // ── Auto-generated mappings (remaining fields) ──────────────────
    { pdfFieldName: "topmostSubform[0].Page1[0].PartIITable[0].TableBodyRow4[0].f1_52[0]", staticValue: "", description: "Table  Line " },
    { pdfFieldName: "topmostSubform[0].Page1[0].PartIITable[0].TableBodyRow4[0].f1_53[0]", staticValue: "", description: "Table  Line " },
    { pdfFieldName: "topmostSubform[0].Page1[0].PartIITable[0].TableBodyRow5[0].f1_54[0]", staticValue: "", description: "Table  Line " },
    { pdfFieldName: "topmostSubform[0].Page1[0].PartIITable[0].TableBodyRow5[0].f1_56[0]", staticValue: "", description: "Table  Line " },
    { pdfFieldName: "topmostSubform[0].Page1[0].PartIITable[0].TableBodyRow5[0].f1_57[0]", staticValue: "", description: "Table  Line " },
    { pdfFieldName: "topmostSubform[0].Page1[0].PartIITable[0].TableBodyRow6[0].f1_58[0]", staticValue: "", description: "Table  Line " },
    { pdfFieldName: "topmostSubform[0].Page1[0].PartIITable[0].TableBodyRow6[0].f1_60[0]", staticValue: "", description: "Table  Line " },
    { pdfFieldName: "topmostSubform[0].Page1[0].PartIITable[0].TableBodyRow6[0].f1_61[0]", staticValue: "", description: "Table  Line " },
    { pdfFieldName: "topmostSubform[0].Page1[0].PartIITable[0].TableBodyRow7[0].f1_62[0]", staticValue: "", description: "Table  Line " },
    { pdfFieldName: "topmostSubform[0].Page1[0].PartIITable[0].TableBodyRow7[0].f1_64[0]", staticValue: "", description: "Table  Line " },
    { pdfFieldName: "topmostSubform[0].Page1[0].PartIITable[0].TableBodyRow7[0].f1_65[0]", staticValue: "", description: "Table  Line " },
  ],
};
