import type { FormPdfMapping, FillContext } from "../types";

const P = "topmostSubform[0].Page1[0].";

export const F990_MAPPING: FormPdfMapping = {
  formCode: "990",
  pdfFileName: "f990.pdf",
  taxYear: 2025,
  fields: [
    // -------------------------------------------------------------------------
    // Header fields
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_1[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "Header",
      description: "Calendar year or tax year beginning",
    },
    {
      pdfFieldName: `${P}f1_2[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "Header",
      description: "Name of organization",
    },
    {
      pdfFieldName: `${P}f1_3[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "Header",
      description: "Employer Identification Number (EIN)",
    },
    {
      pdfFieldName: `${P}f1_4[0]`,
      factName: undefined,
      format: "string",
      irsLine: "Header",
      description: "Room / suite number",
    },
    {
      pdfFieldName: `${P}f1_5[0]`,
      factName: undefined,
      format: "string",
      irsLine: "Header",
      description: "Telephone number",
    },
    {
      pdfFieldName: `${P}f1_6[0]`,
      compute: (ctx: FillContext) => ctx.meta.address,
      format: "string",
      irsLine: "Header",
      description: "Street address (or P.O. box if mail not delivered to street address)",
    },
    {
      pdfFieldName: `${P}f1_7[0]`,
      compute: (ctx: FillContext) => ctx.meta.city,
      format: "string",
      irsLine: "Header",
      description: "City or town",
    },
    {
      pdfFieldName: `${P}f1_8[0]`,
      compute: (ctx: FillContext) => ctx.meta.state,
      format: "string",
      irsLine: "Header",
      description: "State",
    },
    {
      pdfFieldName: `${P}f1_9[0]`,
      compute: (ctx: FillContext) => ctx.meta.zip,
      format: "string",
      irsLine: "Header",
      description: "ZIP code",
    },
    {
      pdfFieldName: `${P}f1_10[0]`,
      factName: undefined,
      format: "string",
      irsLine: "Header",
      description: "Group return — name of group exemption",
    },
    {
      pdfFieldName: `${P}f1_11[0]`,
      factName: undefined,
      format: "string",
      irsLine: "Header",
      description: "Website address",
    },

    // -------------------------------------------------------------------------
    // Part I Summary — Revenue
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_22[0]`,
      factName: "gross_receipts_total",
      format: "currency",
      irsLine: "8",
      description: "Contributions and grants",
    },
    {
      pdfFieldName: `${P}f1_23[0]`,
      factName: "program_service_revenue_total",
      format: "currency",
      irsLine: "9",
      description: "Program service revenue",
    },
    {
      pdfFieldName: `${P}f1_24[0]`,
      factName: "interest_income_total",
      format: "currency",
      irsLine: "10",
      description: "Investment income (interest, dividends, and similar amounts)",
    },
    {
      pdfFieldName: `${P}f1_25[0]`,
      factName: "other_income_total",
      format: "currency",
      irsLine: "11",
      description: "Other revenue",
    },
    {
      pdfFieldName: `${P}f1_26[0]`,
      compute: (ctx: FillContext) => {
        const contributions = Number(ctx.facts["gross_receipts_total"] ?? 0);
        const investment = Number(ctx.facts["interest_income_total"] ?? 0);
        const other = Number(ctx.facts["other_income_total"] ?? 0);
        const total = contributions + investment + other;
        return total !== 0 ? String(total) : undefined;
      },
      format: "currency",
      irsLine: "12",
      description: "Total revenue (add lines 8 through 11)",
    },

    // -------------------------------------------------------------------------
    // Part I Summary — Expenses
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_27[0]`,
      factName: "grants_paid_total",
      format: "currency",
      irsLine: "13",
      description: "Grants and similar amounts paid",
    },
    {
      pdfFieldName: `${P}f1_28[0]`,
      factName: "member_benefits_total",
      format: "currency",
      irsLine: "14",
      description: "Benefits paid to or for members",
    },
    {
      pdfFieldName: `${P}f1_29[0]`,
      factName: "wages_total",
      format: "currency",
      irsLine: "15",
      description: "Salaries, other compensation, employee benefits",
    },
    {
      pdfFieldName: `${P}f1_30[0]`,
      factName: "fundraising_expense_total",
      format: "currency",
      irsLine: "16a",
      description: "Professional fundraising fees",
    },
    {
      pdfFieldName: `${P}f1_31[0]`,
      factName: undefined,
      format: "currency",
      irsLine: "16b",
      description: "Total fundraising expenses",
    },
    {
      pdfFieldName: `${P}f1_32[0]`,
      factName: "general_deduction_total",
      format: "currency",
      irsLine: "17",
      description: "Other expenses",
    },
    {
      pdfFieldName: `${P}f1_33[0]`,
      compute: (ctx: FillContext) => {
        const salaries = Number(ctx.facts["wages_total"] ?? 0);
        const other = Number(ctx.facts["general_deduction_total"] ?? 0);
        const total = salaries + other;
        return total !== 0 ? String(total) : undefined;
      },
      format: "currency",
      irsLine: "18",
      description: "Total expenses (add lines 13 through 17)",
    },
    {
      pdfFieldName: `${P}f1_34[0]`,
      compute: (ctx: FillContext) => {
        const contributions = Number(ctx.facts["gross_receipts_total"] ?? 0);
        const investment = Number(ctx.facts["interest_income_total"] ?? 0);
        const other = Number(ctx.facts["other_income_total"] ?? 0);
        const totalRevenue = contributions + investment + other;
        const salaries = Number(ctx.facts["wages_total"] ?? 0);
        const otherExp = Number(ctx.facts["general_deduction_total"] ?? 0);
        const totalExpenses = salaries + otherExp;
        const net = totalRevenue - totalExpenses;
        return net !== 0 ? String(net) : undefined;
      },
      format: "currency",
      irsLine: "19",
      description: "Revenue less expenses (line 12 minus line 18)",
    },

    // -------------------------------------------------------------------------
    // Part I Summary — Net Assets
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${P}f1_35[0]`,
      factName: "total_assets",
      format: "currency",
      irsLine: "20",
      description: "Total assets (Part X, line 16)",
    },
    {
      pdfFieldName: `${P}f1_36[0]`,
      factName: "total_liabilities",
      format: "currency",
      irsLine: "21",
      description: "Total liabilities (Part X, line 26)",
    },
    {
      pdfFieldName: `${P}f1_37[0]`,
      compute: (ctx: FillContext) => {
        const assets = Number(ctx.facts["total_assets"] ?? 0);
        return assets !== 0 ? String(assets) : undefined;
      },
      format: "currency",
      irsLine: "22",
      description: "Net assets or fund balances (line 20 minus line 21)",
    },
  ],
};
