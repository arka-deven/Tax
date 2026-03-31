import type { FormPdfMapping } from "../types";

const LEFT = "topmostSubform[0].Page5[0].SchM-1_Left[0].";
const RIGHT = "topmostSubform[0].Page5[0].SchM-1_Right[0].";

/**
 * Schedule M-1 — Reconciliation of Income (Loss) per Books With Income per Return.
 * 1120-S Page 5 (left/right columns). Uses ReconciliationEngine factNames.
 */
export const SCH_M1_1120S_MAPPING: FormPdfMapping = {
  formCode: "Sch M-1:1120-S",
  pdfFileName: "f1120s.pdf",
  taxYear: 2025,
  fields: [
    // Left column (additions to book income)
    { pdfFieldName: `${LEFT}f5_1[0]`,  factName: "m1_net_income_per_books",         format: "currency", irsLine: "1",  description: "Net income (loss) per books" },
    { pdfFieldName: `${LEFT}f5_2[0]`,  factName: "m1_federal_income_tax",           format: "currency", irsLine: "2",  description: "Income included on Sch K not in books" },
    { pdfFieldName: `${LEFT}f5_3[0]`,  factName: "m1_excess_capital_losses",        format: "currency", irsLine: "3",  description: "Guaranteed payments" },
    { pdfFieldName: `${LEFT}f5_4[0]`,  factName: "m1_expenses_on_books_not_return", format: "currency", irsLine: "4",  description: "Expenses on books not on Sch K" },
    { pdfFieldName: `${LEFT}f5_5[0]`,  factName: "m1_depreciation_book_excess",     format: "currency", irsLine: "4a", description: "Depreciation" },
    { pdfFieldName: `${LEFT}f5_6[0]`,  factName: "m1_travel_entertainment_book",    format: "currency", irsLine: "4b", description: "Travel and entertainment" },
    { pdfFieldName: `${LEFT}f5_7[0]`,  factName: "m1_expenses_on_books_not_return", format: "currency", irsLine: "4c", description: "Other expenses" },
    { pdfFieldName: `${LEFT}f5_8[0]`,  factName: "m1_left_total",                   format: "currency", irsLine: "5",  description: "Add lines 1 through 4c" },
    // Right column (subtractions)
    { pdfFieldName: `${RIGHT}f5_11[0]`, factName: "m1_income_on_return_not_books",  format: "currency", irsLine: "6",  description: "Income on Sch K not in books" },
    { pdfFieldName: `${RIGHT}f5_12[0]`, factName: "m1_income_on_return_not_books",  format: "currency", irsLine: "6a", description: "Tax-exempt interest" },
    { pdfFieldName: `${RIGHT}f5_13[0]`, factName: "m1_deductions_not_on_books",     format: "currency", irsLine: "7",  description: "Deductions on Sch K not charged against books" },
    { pdfFieldName: `${RIGHT}f5_14[0]`, factName: "m1_depreciation_return_excess",  format: "currency", irsLine: "7a", description: "Depreciation" },
    { pdfFieldName: `${RIGHT}f5_15[0]`, factName: "m1_deductions_not_on_books",     format: "currency", irsLine: "7b", description: "Other deductions" },
    { pdfFieldName: `${RIGHT}f5_16[0]`, factName: "m1_right_total",                 format: "currency", irsLine: "8",  description: "Add lines 6 through 7b" },
    { pdfFieldName: `${RIGHT}f5_17[0]`, factName: "m1_income_per_return",           format: "currency", irsLine: "9",  description: "Income (loss) — line 5 minus line 8" },
  ],
};
