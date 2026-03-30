import type { FormPdfMapping, FillContext } from "../types";

const PAGE1 = "topmostSubform[0].Page1[0].";
const L8_17 = `${PAGE1}Lines8-17[0].`;
const L18_27 = `${PAGE1}Lines18-27[0].`;
const L30 = `${PAGE1}Line30_ReadOrder[0].`;

export const F1040SC_MAPPING: FormPdfMapping = {
  formCode: "Schedule C",
  pdfFileName: "f1040sc.pdf",
  taxYear: 2024,
  fields: [
    // ── Proprietor header ─────────────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_1[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "header",
      description: "Name of proprietor",
    },
    {
      pdfFieldName: `${PAGE1}f1_2[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "header",
      description: "Social security number (SSN) of proprietor",
    },
    {
      pdfFieldName: `${PAGE1}f1_3[0]`,
      format: "string",
      irsLine: "A",
      description: "Principal business or profession",
    },
    {
      pdfFieldName: `${PAGE1}BComb[0].f1_4[0]`,
      format: "string",
      irsLine: "B",
      description: "Business code number",
    },
    {
      pdfFieldName: `${PAGE1}f1_5[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "C",
      description: "Business name (if different from proprietor)",
    },
    {
      pdfFieldName: `${PAGE1}DComb[0].f1_6[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "D",
      description: "Employer ID number (EIN), if any",
    },
    {
      pdfFieldName: `${PAGE1}f1_7[0]`,
      compute: (ctx: FillContext) => ctx.meta.address,
      format: "string",
      irsLine: "E",
      description: "Business address (including suite or room no.)",
    },
    {
      pdfFieldName: `${PAGE1}f1_8[0]`,
      compute: (ctx: FillContext) => ctx.meta.accountingMethod,
      format: "string",
      irsLine: "F",
      description: "Accounting method",
    },

    // ── Income (Lines 1 – 7) ──────────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_10[0]`,
      factName: "gross_receipts_total",
      format: "currency",
      irsLine: "1",
      description: "Gross receipts or sales",
    },
    {
      pdfFieldName: `${PAGE1}f1_11[0]`,
      factName: "returns_allowances_total",
      format: "currency",
      irsLine: "2",
      description: "Returns and allowances",
    },
    {
      pdfFieldName: `${PAGE1}f1_12[0]`,
      compute: (ctx: FillContext) => { const gr = Number(ctx.facts.gross_receipts_total ?? 0); const ra = Number(ctx.facts.returns_allowances_total ?? 0); return String(gr - ra); },
      format: "currency",
      irsLine: "3",
      description: "Subtract Line 2 from Line 1",
    },
    {
      pdfFieldName: `${PAGE1}f1_13[0]`,
      factName: "cogs_total",
      format: "currency",
      irsLine: "4",
      description: "Cost of goods sold (from Line 42)",
    },
    {
      pdfFieldName: `${PAGE1}f1_14[0]`,
      factName: "gross_profit",
      format: "currency",
      irsLine: "5",
      description: "Gross profit (subtract Line 4 from Line 3)",
    },
    {
      pdfFieldName: `${PAGE1}f1_15[0]`,
      factName: "other_income_total",
      format: "currency",
      irsLine: "6",
      description: "Other income, including federal and state gasoline or fuel tax credit or refund",
    },
    {
      pdfFieldName: `${PAGE1}f1_16[0]`,
      factName: "total_income",
      format: "currency",
      irsLine: "7",
      description: "Gross income (add Lines 5 and 6)",
    },

    // ── Expenses Lines 8-17 ───────────────────────────────────────────────────
    {
      pdfFieldName: `${L8_17}f1_17[0]`,
      factName: "advertising_total",
      format: "currency",
      irsLine: "8",
      description: "Advertising",
    },
    {
      pdfFieldName: `${L8_17}f1_18[0]`,
      factName: "auto_expense_total",
      format: "currency",
      irsLine: "9",
      description: "Car and truck expenses (see instructions)",
    },
    {
      pdfFieldName: `${L8_17}f1_19[0]`,
      factName: "commission_total",
      format: "currency",
      irsLine: "10",
      description: "Commissions and fees",
    },
    {
      pdfFieldName: `${L8_17}f1_20[0]`,
      factName: "contract_labor_total",
      format: "currency",
      irsLine: "11",
      description: "Contract labor (see instructions)",
    },
    {
      pdfFieldName: `${L8_17}f1_21[0]`,
      format: "currency",
      irsLine: "12",
      description: "Depletion",
    },
    {
      pdfFieldName: `${L8_17}f1_22[0]`,
      factName: "depreciation_total",
      format: "currency",
      irsLine: "13",
      description: "Depreciation and section 179 expense deduction",
    },
    {
      pdfFieldName: `${L8_17}f1_23[0]`,
      factName: "employee_benefits_total",
      format: "currency",
      irsLine: "14",
      description: "Employee benefit programs (other than on Line 19)",
    },
    {
      pdfFieldName: `${L8_17}f1_24[0]`,
      factName: "insurance_total",
      format: "currency",
      irsLine: "15",
      description: "Insurance (other than health)",
    },
    {
      pdfFieldName: `${L8_17}f1_25[0]`,
      format: "currency",
      irsLine: "16a",
      description: "Interest: mortgage (paid to banks, etc.)",
    },
    {
      pdfFieldName: `${L8_17}f1_26[0]`,
      factName: "interest_expense_total",
      format: "currency",
      irsLine: "16b",
      description: "Interest: other",
    },
    {
      pdfFieldName: `${L8_17}f1_27[0]`,
      factName: "professional_fees_total",
      format: "currency",
      irsLine: "17",
      description: "Legal and professional services",
    },

    // ── Expenses Lines 18-27 ──────────────────────────────────────────────────
    {
      pdfFieldName: `${L18_27}f1_28[0]`,
      factName: "office_expense_total",
      format: "currency",
      irsLine: "18",
      description: "Office expense",
    },
    {
      pdfFieldName: `${L18_27}f1_29[0]`,
      factName: "pension_profitsharing_total",
      format: "currency",
      irsLine: "19",
      description: "Pension and profit-sharing plans",
    },
    {
      pdfFieldName: `${L18_27}f1_30[0]`,
      factName: "rent_equipment_total",
      format: "currency",
      irsLine: "20a",
      description: "Rent or lease: vehicles, machinery, and equipment",
    },
    {
      pdfFieldName: `${L18_27}f1_31[0]`,
      factName: "rent_building_total",
      format: "currency",
      irsLine: "20b",
      description: "Rent or lease: other business property",
    },
    {
      pdfFieldName: `${L18_27}f1_32[0]`,
      factName: "repairs_total",
      format: "currency",
      irsLine: "21",
      description: "Repairs and maintenance",
    },
    {
      pdfFieldName: `${L18_27}f1_33[0]`,
      factName: "supplies_total",
      format: "currency",
      irsLine: "22",
      description: "Supplies (not included in Part III)",
    },
    {
      pdfFieldName: `${L18_27}f1_34[0]`,
      factName: "taxes_licenses_total",
      format: "currency",
      irsLine: "23",
      description: "Taxes and licenses",
    },
    {
      pdfFieldName: `${L18_27}f1_35[0]`,
      factName: "travel_total",
      format: "currency",
      irsLine: "24a",
      description: "Travel",
    },
    {
      pdfFieldName: `${L18_27}f1_36[0]`,
      factName: "meals_subject_to_limitation_total",
      format: "currency",
      irsLine: "24b",
      description: "Deductible meals",
    },
    {
      pdfFieldName: `${L18_27}f1_37[0]`,
      factName: "utilities_total",
      format: "currency",
      irsLine: "25",
      description: "Utilities",
    },
    {
      pdfFieldName: `${L18_27}f1_38[0]`,
      factName: "wages_total",
      format: "currency",
      irsLine: "26",
      description: "Wages (less employment credits)",
    },
    {
      // Note: f1_40 appears before f1_39 in the PDF field order
      pdfFieldName: `${L18_27}f1_40[0]`,
      factName: "general_deduction_total",
      format: "currency",
      irsLine: "27a",
      description: "Other expenses (from Line 48)",
    },
    {
      // f1_39 comes after f1_40 in PDF field ordering despite lower number
      pdfFieldName: `${L18_27}f1_39[0]`,
      format: "currency",
      irsLine: "27b",
      description: "Reserved for future use",
    },

    // ── Net profit ────────────────────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_41[0]`,
      factName: "total_deductions",
      format: "currency",
      irsLine: "28",
      description: "Total expenses before expenses for business use of home (add Lines 8 through 27a)",
    },
    {
      pdfFieldName: `${PAGE1}f1_42[0]`,
      compute: (ctx: FillContext) => { const ti = Number(ctx.facts.total_income ?? 0); const td = Number(ctx.facts.total_deductions ?? 0); return String(ti - td); },
      format: "currency",
      irsLine: "29",
      description: "Tentative profit or (loss) (subtract Line 28 from Line 7)",
    },
    {
      pdfFieldName: `${L30}f1_43[0]`,
      format: "currency",
      irsLine: "30",
      description: "Expenses for business use of your home (attach Form 8829)",
    },
    {
      pdfFieldName: `${L30}f1_44[0]`,
      format: "currency",
      irsLine: "30",
      description: "Home office expense continuation",
    },
    {
      pdfFieldName: `${PAGE1}f1_45[0]`,
      factName: "net_income_before_tax",
      format: "currency",
      irsLine: "31",
      description: "Net profit or (loss) (subtract Line 30 from Line 29)",
    },
  ],
};
