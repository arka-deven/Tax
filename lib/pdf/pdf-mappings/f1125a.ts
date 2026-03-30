import type { FormPdfMapping, FillContext } from "../types";

const P = "topmostSubform[0].Page1[0].";

export const F1125A_MAPPING: FormPdfMapping = {
  formCode: "1125-A",
  pdfFileName: "f1125a.pdf",
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
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "Header",
      description: "Employer Identification Number (EIN)",
    },

    // -------------------------------------------------------------------------
    // Part I — Cost of Goods Sold
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_3[0]`,
      factName: "boy_inventory_total",
      format: "currency",
      irsLine: "1",
      description: "Inventory at beginning of year",
    },
    {
      pdfFieldName: `${P}f1_4[0]`,
      factName: "cogs_purchases_total",
      format: "currency",
      irsLine: "2",
      description: "Purchases",
    },
    {
      pdfFieldName: `${P}f1_5[0]`,
      factName: "cogs_labor_total",
      format: "currency",
      irsLine: "3",
      description: "Cost of labor",
    },
    {
      pdfFieldName: `${P}f1_6[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "4a",
      description: "Additional section 263A costs (attach statement)",
    },
    {
      pdfFieldName: `${P}f1_7[0]`,
      factName: "cogs_other_total",
      format: "currency",
      irsLine: "4b",
      description: "Other costs (attach statement)",
    },
    {
      pdfFieldName: `${P}f1_8[0]`,
      compute: (ctx: FillContext) => { const p = Number(ctx.facts.cogs_purchases_total ?? 0); const l = Number(ctx.facts.cogs_labor_total ?? 0); const o = Number(ctx.facts.cogs_other_total ?? 0); const inv = Number(ctx.facts.boy_inventory_total ?? 0); return String(inv + p + l + o); },
      format: "currency",
      irsLine: "5",
      description: "Total (add lines 1 through 4b)",
    },
    {
      pdfFieldName: `${P}f1_9[0]`,
      factName: "inventory_total",
      format: "currency",
      irsLine: "6",
      description: "Inventory at end of year",
    },
    {
      pdfFieldName: `${P}f1_10[0]`,
      factName: "cogs_total",
      format: "currency",
      irsLine: "7",
      description: "Cost of goods sold (subtract line 6 from line 5)",
    },
    {
      pdfFieldName: `${P}f1_11[0]`,
      factName: undefined,
      format: "string",
      irsLine: "8",
      description: "Line 8 — additional information or override (see instructions)",
    },

    // -------------------------------------------------------------------------
    // Part II — Inventory Valuation Methods (checkboxes)
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}c1_1[0]`,
      compute: (ctx: FillContext) => {
        const method = String(ctx.facts.inventory_method ?? "Cost");
        return method === "Cost" || method === "N/A" ? "X" : "";
      },
      irsLine: "9a",
      description: "Checkbox — cost method of inventory valuation",
    },
    {
      pdfFieldName: `${P}c1_2[0]`,
      compute: (ctx: FillContext) => String(ctx.facts.inventory_method ?? "") === "LCM" ? "X" : "",
      irsLine: "9b",
      description: "Checkbox — lower of cost or market method",
    },
    {
      pdfFieldName: `${P}c1_3[0]`,
      compute: (ctx: FillContext) => {
        const method = String(ctx.facts.inventory_method ?? "Cost");
        return method !== "Cost" && method !== "LCM" && method !== "N/A" ? "X" : "";
      },
      irsLine: "9c",
      description: "Checkbox — other method (attach explanation)",
    },
    {
      pdfFieldName: `${P}c1_4[0]`,
      factName: undefined,
      irsLine: "10",
      description: "Checkbox — LIFO inventory method adopted this tax year",
    },
    {
      pdfFieldName: `${P}c1_5[0]`,
      factName: undefined,
      irsLine: "11",
      description: "Checkbox — section 263A applies to the entity",
    },
  ],
};
