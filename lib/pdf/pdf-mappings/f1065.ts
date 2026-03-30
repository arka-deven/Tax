import type { FormPdfMapping, FillContext } from "../types";

const PAGE1 = "topmostSubform[0].Page1[0].";
const HEADER = `topmostSubform[0].Page1[0].HeaderAddress_ReadOrder[0].CalendarName_ReadOrder[0].`;

export const F1065_MAPPING: FormPdfMapping = {
  formCode: "1065",
  pdfFileName: "f1065.pdf",
  taxYear: 2024,
  fields: [
    // ── Calendar year header ──────────────────────────────────────────────────
    {
      pdfFieldName: `${HEADER}f1_01[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "header",
      description: "Tax year begin",
    },
    {
      pdfFieldName: `${HEADER}f1_02[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "header",
      description: "Tax year end year",
    },
    {
      pdfFieldName: `${HEADER}f1_03[0]`,
      compute: (ctx: FillContext) => String(ctx.meta.taxYear),
      format: "string",
      irsLine: "header",
      description: "Calendar year footer",
    },

    // ── Entity header ─────────────────────────────────────────────────────────
    {
      pdfFieldName: `${HEADER}f1_04[0]`,
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "header",
      description: "Partnership name",
    },
    {
      pdfFieldName: `${HEADER}f1_05[0]`,
      compute: (ctx: FillContext) => ctx.meta.address,
      format: "string",
      irsLine: "header",
      description: "Street address",
    },
    {
      pdfFieldName: `${HEADER}f1_06[0]`,
      compute: (ctx: FillContext) => ctx.meta.city,
      format: "string",
      irsLine: "header",
      description: "City",
    },
    {
      pdfFieldName: `${HEADER}f1_07[0]`,
      compute: (ctx: FillContext) => ctx.meta.state,
      format: "string",
      irsLine: "header",
      description: "State",
    },
    {
      pdfFieldName: `${HEADER}f1_08[0]`,
      compute: (ctx: FillContext) => ctx.meta.zip,
      format: "string",
      irsLine: "header",
      description: "ZIP code",
    },
    {
      pdfFieldName: `${HEADER}f1_09[0]`,
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "header",
      description: "Employer Identification Number (EIN)",
    },
    {
      pdfFieldName: `${HEADER}f1_10[0]`,
      format: "string",
      irsLine: "header",
      description: "Date business started",
    },

    // ── Entity info fields ────────────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_11[0]`,
      format: "string",
      irsLine: "A",
      description: "Principal business activity",
    },
    {
      pdfFieldName: `${PAGE1}f1_12[0]`,
      format: "string",
      irsLine: "B",
      description: "Principal product or service",
    },
    {
      pdfFieldName: `${PAGE1}f1_13[0]`,
      format: "string",
      irsLine: "C",
      description: "Business code number",
    },
    {
      pdfFieldName: `${PAGE1}f1_14[0]`,
      format: "integer",
      irsLine: "header",
      description: "Number of Schedules K-1 attached",
    },
    {
      pdfFieldName: `${PAGE1}f1_15[0]`,
      format: "string",
      irsLine: "header",
      description: "Additional info field 1",
    },
    {
      pdfFieldName: `${PAGE1}f1_16[0]`,
      format: "string",
      irsLine: "header",
      description: "Additional info field 2",
    },

    // ── Income (Lines 1a – 8) ─────────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_19[0]`,
      factName: "gross_receipts_total",
      format: "currency",
      irsLine: "1a",
      description: "Gross receipts or sales",
    },
    {
      pdfFieldName: `${PAGE1}f1_20[0]`,
      format: "currency",
      irsLine: "1b",
      description: "Returns and allowances",
    },
    {
      pdfFieldName: `${PAGE1}f1_21[0]`,
      format: "currency",
      irsLine: "1c",
      description: "Balance (Line 1a minus 1b)",
    },
    {
      pdfFieldName: `${PAGE1}f1_22[0]`,
      factName: "cogs_total",
      format: "currency",
      irsLine: "2",
      description: "Cost of goods sold (Schedule A)",
    },
    {
      pdfFieldName: `${PAGE1}f1_23[0]`,
      format: "currency",
      irsLine: "3",
      description: "Gross profit (Line 1c minus Line 2)",
    },
    {
      pdfFieldName: `${PAGE1}f1_24[0]`,
      format: "currency",
      irsLine: "4",
      description: "Ordinary income (loss) from other partnerships, estates, and trusts",
    },
    {
      pdfFieldName: `${PAGE1}f1_25[0]`,
      format: "currency",
      irsLine: "5",
      description: "Net farm profit (loss)",
    },
    {
      pdfFieldName: `${PAGE1}f1_26[0]`,
      format: "currency",
      irsLine: "6",
      description: "Net gain (loss) from Form 4797",
    },
    {
      pdfFieldName: `${PAGE1}f1_27[0]`,
      factName: "other_income_total",
      format: "currency",
      irsLine: "7",
      description: "Other income (loss)",
    },
    {
      pdfFieldName: `${PAGE1}f1_28[0]`,
      format: "currency",
      irsLine: "8",
      description: "Total income (loss) (Lines 3 through 7)",
    },

    // ── Deductions (Lines 9 – 22) ─────────────────────────────────────────────
    {
      pdfFieldName: `${PAGE1}f1_29[0]`,
      factName: "wages_total",
      format: "currency",
      irsLine: "9",
      description: "Salaries and wages (other than to partners, less employment credits)",
    },
    {
      pdfFieldName: `${PAGE1}f1_30[0]`,
      format: "currency",
      irsLine: "10",
      description: "Guaranteed payments to partners",
    },
    {
      pdfFieldName: `${PAGE1}f1_31[0]`,
      factName: "repairs_total",
      format: "currency",
      irsLine: "11",
      description: "Repairs and maintenance",
    },
    {
      pdfFieldName: `${PAGE1}f1_32[0]`,
      factName: "bad_debt_total",
      format: "currency",
      irsLine: "12",
      description: "Bad debts",
    },
    {
      pdfFieldName: `${PAGE1}f1_33[0]`,
      factName: "rent_building_total",
      format: "currency",
      irsLine: "13",
      description: "Rent",
    },
    {
      pdfFieldName: `${PAGE1}f1_34[0]`,
      factName: "taxes_licenses_total",
      format: "currency",
      irsLine: "14",
      description: "Taxes and licenses",
    },
    {
      pdfFieldName: `${PAGE1}f1_35[0]`,
      factName: "interest_expense_total",
      format: "currency",
      irsLine: "15",
      description: "Interest",
    },
    {
      pdfFieldName: `${PAGE1}f1_36[0]`,
      factName: "depreciation_total",
      format: "currency",
      irsLine: "16a",
      description: "Depreciation (if required, attach Form 4562)",
    },
    {
      pdfFieldName: `${PAGE1}f1_37[0]`,
      format: "currency",
      irsLine: "16b",
      description: "Less depreciation reported on Schedule A and elsewhere on return",
    },
    {
      pdfFieldName: `${PAGE1}f1_38[0]`,
      format: "currency",
      irsLine: "16c",
      description: "Net depreciation (Line 16a minus 16b)",
    },
    {
      pdfFieldName: `${PAGE1}f1_39[0]`,
      format: "currency",
      irsLine: "17",
      description: "Depletion (do not deduct oil and gas depletion)",
    },
    {
      pdfFieldName: `${PAGE1}f1_40[0]`,
      format: "currency",
      irsLine: "18",
      description: "Retirement plans, etc.",
    },
    {
      pdfFieldName: `${PAGE1}f1_41[0]`,
      format: "currency",
      irsLine: "19",
      description: "Employee benefit programs",
    },
    {
      pdfFieldName: `${PAGE1}f1_42[0]`,
      factName: "general_deduction_total",
      format: "currency",
      irsLine: "20",
      description: "Other deductions (attach statement)",
    },
    {
      pdfFieldName: `${PAGE1}f1_43[0]`,
      format: "currency",
      irsLine: "21",
      description: "Total deductions (add Lines 9 through 20)",
    },
    {
      pdfFieldName: `${PAGE1}f1_44[0]`,
      format: "currency",
      irsLine: "22",
      description: "Ordinary business income (loss) (Line 8 minus Line 21)",
    },
  ],
};
