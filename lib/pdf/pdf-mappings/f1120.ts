import type { FormPdfMapping, FillContext } from "../types";

export const F1120_MAPPING: FormPdfMapping = {
  formCode: "1120",
  pdfFileName: "f1120.pdf",
  taxYear: 2025,
  fields: [
    // -------------------------------------------------------------------------
    // Header fields
    // -------------------------------------------------------------------------
    {
      pdfFieldName:
        "topmostSubform[0].Page1[0].NameFieldsReadOrder[0].f1_4[0]",
      compute: (ctx: FillContext) => ctx.meta.companyName,
      format: "string",
      irsLine: "Header",
      description: "Company name",
    },
    {
      pdfFieldName:
        "topmostSubform[0].Page1[0].NameFieldsReadOrder[0].f1_5[0]",
      compute: (ctx: FillContext) => ctx.meta.address,
      format: "string",
      irsLine: "Header",
      description: "Street address",
    },
    {
      pdfFieldName:
        "topmostSubform[0].Page1[0].NameFieldsReadOrder[0].f1_6[0]",
      compute: (ctx: FillContext) => ctx.meta.city,
      format: "string",
      irsLine: "Header",
      description: "City",
    },
    {
      pdfFieldName:
        "topmostSubform[0].Page1[0].NameFieldsReadOrder[0].f1_7[0]",
      compute: (ctx: FillContext) => ctx.meta.state,
      format: "string",
      irsLine: "Header",
      description: "State",
    },
    {
      pdfFieldName:
        "topmostSubform[0].Page1[0].NameFieldsReadOrder[0].f1_8[0]",
      compute: (ctx: FillContext) => ctx.meta.zip,
      format: "string",
      irsLine: "Header",
      description: "ZIP code",
    },
    {
      pdfFieldName:
        "topmostSubform[0].Page1[0].NameFieldsReadOrder[0].f1_9[0]",
      compute: (ctx: FillContext) => ctx.meta.ein,
      format: "string",
      irsLine: "B",
      description: "Employer Identification Number (EIN)",
    },
    {
      pdfFieldName:
        "topmostSubform[0].Page1[0].NameFieldsReadOrder[0].f1_10[0]",
      compute: (ctx: FillContext) =>
        ctx.facts["date_incorporated"] != null
          ? String(ctx.facts["date_incorporated"])
          : undefined,
      format: "string",
      irsLine: "C",
      description: "Date incorporated",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_11[0]",
      factName: "total_assets",
      format: "currency",
      irsLine: "D",
      description: "Total assets",
    },

    // -------------------------------------------------------------------------
    // Income — Lines 1a through 11
    // -------------------------------------------------------------------------
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_14[0]",
      factName: "gross_receipts_total",
      format: "currency",
      irsLine: "1a",
      description: "Gross receipts or sales",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_15[0]",
      factName: "returns_allowances_total",
      format: "currency",
      irsLine: "1b",
      description: "Returns and allowances",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_16[0]",
      compute: (ctx: FillContext) => {
        const receipts = Number(ctx.facts["gross_receipts_total"] ?? 0);
        const returns = Number(ctx.facts["returns_allowances_total"] ?? 0);
        const balance = receipts - returns;
        return balance !== 0 ? String(balance) : undefined;
      },
      format: "currency",
      irsLine: "1c",
      description: "Balance (gross receipts minus returns and allowances)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_17[0]",
      factName: "cogs_total",
      format: "currency",
      irsLine: "2",
      description: "Cost of goods sold (Schedule A, line 8)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_18[0]",
      factName: "gross_profit",
      format: "currency",
      irsLine: "3",
      description: "Gross profit (line 1c minus line 2)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_19[0]",
      factName: "dividend_income_total",
      format: "currency",
      irsLine: "4",
      description: "Dividends and inclusions (Schedule C, line 23, column (a))",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_20[0]",
      factName: "interest_income_total",
      format: "currency",
      irsLine: "5",
      description: "Interest",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_21[0]",
      factName: "rent_income_total",
      format: "currency",
      irsLine: "6",
      description: "Gross rents",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_22[0]",
      factName: "gross_royalties_total",
      format: "currency",
      irsLine: "7",
      description: "Gross royalties",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_23[0]",
      factName: "capital_gain_total",
      format: "currency",
      irsLine: "8",
      description: "Capital gain net income (attach Schedule D)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_24[0]",
      factName: "form4797_gain_loss_total",
      format: "currency",
      irsLine: "9",
      description: "Net gain or loss from Form 4797 (Part II, line 17)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_25[0]",
      factName: "other_income_total",
      format: "currency",
      irsLine: "10",
      description: "Other income (attach statement)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_26[0]",
      factName: "total_income",
      format: "currency",
      irsLine: "11",
      description: "Total income (add lines 3 through 10)",
    },

    // -------------------------------------------------------------------------
    // Deductions — Lines 12 through 27
    // -------------------------------------------------------------------------
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_27[0]",
      factName: "officer_compensation_total",
      format: "currency",
      irsLine: "12",
      description:
        "Compensation of officers (attach Form 1125-E if applicable)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_28[0]",
      factName: "wages_total",
      format: "currency",
      irsLine: "13",
      description:
        "Salaries and wages (less employment credits)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_29[0]",
      factName: "repairs_total",
      format: "currency",
      irsLine: "14",
      description: "Repairs and maintenance",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_30[0]",
      factName: "bad_debt_total",
      format: "currency",
      irsLine: "15",
      description: "Bad debts",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_31[0]",
      factName: "rent_building_total",
      format: "currency",
      irsLine: "16",
      description: "Rents",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_32[0]",
      factName: "taxes_licenses_total",
      format: "currency",
      irsLine: "17",
      description: "Taxes and licenses",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_33[0]",
      factName: "interest_expense_total",
      format: "currency",
      irsLine: "18",
      description: "Interest (see instructions)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_34[0]",
      factName: "charitable_contributions_total",
      format: "currency",
      irsLine: "19",
      description:
        "Charitable contributions (see instructions for 10% limitation)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_35[0]",
      factName: "depreciation_total",
      format: "currency",
      irsLine: "20",
      description:
        "Depreciation from Form 4562 not claimed on Schedule A or elsewhere",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_36[0]",
      factName: "depletion_total",
      format: "currency",
      irsLine: "21",
      description: "Depletion",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_37[0]",
      factName: "advertising_total",
      format: "currency",
      irsLine: "22",
      description: "Advertising",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_38[0]",
      factName: "pension_profit_sharing_total",
      format: "currency",
      irsLine: "23",
      description:
        "Pension, profit-sharing, etc., plans",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_39[0]",
      factName: "employee_benefit_programs_total",
      format: "currency",
      irsLine: "24",
      description: "Employee benefit programs",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_40[0]",
      factName: "reserved_deduction_total",
      format: "currency",
      irsLine: "25",
      description: "Reserved for future use",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_41[0]",
      factName: "general_deduction_total",
      format: "currency",
      irsLine: "26",
      description: "Other deductions (attach statement)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_42[0]",
      factName: "total_deductions",
      format: "currency",
      irsLine: "27",
      description: "Total deductions (add lines 12 through 26)",
    },

    // -------------------------------------------------------------------------
    // Tax Computation — Lines 28 through 35
    // -------------------------------------------------------------------------
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_43[0]",
      factName: "taxable_income_before_nol",
      format: "currency",
      irsLine: "28",
      description:
        "Taxable income before net operating loss deduction and special deductions (line 11 minus line 27)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_44[0]",
      factName: "nol_deduction_total",
      format: "currency",
      irsLine: "29a",
      description: "Net operating loss (NOL) deduction",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_45[0]",
      factName: "special_deductions_total",
      format: "currency",
      irsLine: "29b",
      description: "Special deductions (Schedule C, line 24, column (c))",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_46[0]",
      factName: "taxable_income",
      format: "currency",
      irsLine: "30",
      description:
        "Taxable income (line 28 minus lines 29a and 29b; see instructions)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_47[0]",
      factName: "corporate_tax_21pct",
      format: "currency",
      irsLine: "31",
      description: "Total tax (Schedule J, Part I, line 11)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_48[0]",
      factName: "total_payments",
      format: "currency",
      irsLine: "32",
      description:
        "Total payments and credits (Schedule J, Part II, line 21)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_49[0]",
      factName: "estimated_tax_penalty",
      format: "currency",
      irsLine: "33",
      description:
        "Estimated tax penalty (see instructions; check if Form 2220 is attached)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_50[0]",
      factName: "amount_owed",
      format: "currency",
      irsLine: "34",
      description:
        "Amount owed (if line 31 plus line 33 is greater than line 32)",
    },
    {
      pdfFieldName: "topmostSubform[0].Page1[0].f1_51[0]",
      factName: "overpayment",
      format: "currency",
      irsLine: "35",
      description:
        "Overpayment (if line 32 is larger than the total of lines 31 and 33)",
    },
  ],
};
