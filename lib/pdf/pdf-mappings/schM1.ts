import type { FormPdfMapping, FillContext } from "../types";

const LEFT = "topmostSubform[0].Page6[0].SchM-1_Left[0].";
const RIGHT = "topmostSubform[0].Page6[0].SchM-1_Right[0].";

export const SCH_M1_MAPPING: FormPdfMapping = {
  formCode: "Sch M-1",
  pdfFileName: "f1120.pdf",
  taxYear: 2025,
  fields: [
    // -------------------------------------------------------------------------
    // Left side — Additions to book income
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LEFT}f6_133[0]`,
      factName: "net_income_before_tax",
      format: "currency",
      irsLine: "1",
      description: "Net income (loss) per books",
    },
    {
      pdfFieldName: `${LEFT}f6_134[0]`,
      factName: "income_tax_expense_total",
      format: "currency",
      irsLine: "2",
      description: "Federal income tax per books",
    },
    {
      pdfFieldName: `${LEFT}f6_135[0]`,
      format: "currency",
      irsLine: "3",
      description: "Excess of capital losses over capital gains",
    },
    {
      pdfFieldName: `${LEFT}f6_136[0]`,
      format: "currency",
      irsLine: "4",
      description: "Income subject to tax not recorded on books this year",
    },
    {
      pdfFieldName: `${LEFT}f6_137[0]`,
      format: "currency",
      irsLine: "5a",
      description: "Expenses on books not on return — depreciation",
    },
    {
      pdfFieldName: `${LEFT}f6_138[0]`,
      factName: "charitable_contributions_excess",
      format: "currency",
      irsLine: "5b",
      description: "Expenses on books not on return — charitable contributions",
    },
    {
      pdfFieldName: `${LEFT}f6_139[0]`,
      factName: "meals_subject_to_limitation_total",
      format: "currency",
      irsLine: "5c",
      description: "Expenses on books not on return — travel and entertainment",
    },
    {
      pdfFieldName: `${LEFT}f6_140[0]`,
      format: "string",
      irsLine: "5d",
      description: "Expenses on books not on return — other (description)",
    },
    {
      pdfFieldName: `${LEFT}f6_141[0]`,
      factName: "nondeductible_total",
      format: "currency",
      irsLine: "5d",
      description: "Expenses on books not on return — other (amount)",
    },
    {
      pdfFieldName: `${LEFT}f6_142[0]`,
      compute: (ctx: FillContext) => { const a = Number(ctx.facts.depreciation_total ?? 0) * 0; const b = Number(ctx.facts.charitable_contributions_excess ?? 0); const c = Number(ctx.facts.m1_meals_disallowance ?? 0); const d = Number(ctx.facts.nondeductible_total ?? 0); return String(a + b + c + d); },
      format: "currency",
      irsLine: "5e",
      description: "Total of lines 5a through 5d",
    },
    {
      pdfFieldName: `${LEFT}f6_143[0]`,
      compute: (ctx: FillContext) => { const l1 = Number(ctx.facts.net_income_before_tax ?? 0); const l2 = Number(ctx.facts.income_tax_expense_total ?? 0); const l5e = Number(ctx.facts.charitable_contributions_excess ?? 0) + Number(ctx.facts.m1_meals_disallowance ?? 0) + Number(ctx.facts.nondeductible_total ?? 0); return String(l1 + l2 + l5e); },
      format: "currency",
      irsLine: "6",
      description: "Total of lines 1 through 5e (add lines 1 through 5e)",
    },
    {
      pdfFieldName: `${LEFT}f6_144[0]`,
      format: "currency",
      irsLine: "6-cont",
      description: "Line 6 continuation",
    },

    // -------------------------------------------------------------------------
    // Right side — Subtractions from book income
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${RIGHT}f6_145[0]`,
      format: "currency",
      irsLine: "7a",
      description: "Income on books not on return — tax-exempt interest",
    },
    {
      pdfFieldName: `${RIGHT}f6_146[0]`,
      format: "string",
      irsLine: "7b",
      description: "Income on books not on return — other (description)",
    },
    {
      pdfFieldName: `${RIGHT}f6_147[0]`,
      format: "currency",
      irsLine: "7b",
      description: "Income on books not on return — other (amount)",
    },
    {
      pdfFieldName: `${RIGHT}f6_148[0]`,
      format: "currency",
      irsLine: "7c",
      description: "Total of lines 7a and 7b",
    },
    {
      pdfFieldName: `${RIGHT}f6_149[0]`,
      format: "string",
      irsLine: "8",
      description: "Deductions on return not charged against book income (description)",
    },
    {
      pdfFieldName: `${RIGHT}f6_150[0]`,
      format: "currency",
      irsLine: "8",
      description: "Deductions on return not charged against book income (amount)",
    },
    {
      pdfFieldName: `${RIGHT}f6_151[0]`,
      format: "currency",
      irsLine: "9a",
      description: "Deductions on return not charged against book income — depreciation",
    },
    {
      pdfFieldName: `${RIGHT}f6_152[0]`,
      format: "currency",
      irsLine: "9b",
      description: "Deductions on return not charged against book income — charitable contributions",
    },
    {
      pdfFieldName: `${RIGHT}f6_153[0]`,
      format: "currency",
      irsLine: "9c",
      description: "Deductions on return not charged against book income — other",
    },
    {
      pdfFieldName: `${RIGHT}f6_154[0]`,
      format: "currency",
      irsLine: "9d",
      description: "Total of lines 8 through 9c",
    },
    {
      pdfFieldName: `${RIGHT}f6_155[0]`,
      compute: (ctx: FillContext) => { const l1 = Number(ctx.facts.net_income_before_tax ?? 0); const l2 = Number(ctx.facts.income_tax_expense_total ?? 0); const l5e = Number(ctx.facts.charitable_contributions_excess ?? 0) + Number(ctx.facts.m1_meals_disallowance ?? 0) + Number(ctx.facts.nondeductible_total ?? 0); return String(l1 + l2 + l5e); },
      format: "currency",
      irsLine: "10",
      description: "Income (line 28, Form 1120) — line 6 minus line 9d",
    },
  ],
};
