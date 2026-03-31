import type { FormPdfMapping } from "../types";

const M2 = "topmostSubform[0].Page5[0].Table_SchM-2[0].";

/**
 * Schedule M-2 — Analysis of AAA, OAA, Shareholders' Undistributed Taxable Income.
 * 1120-S Page 5. Four columns: (a) AAA, (b) OAA, (c) Shareholders' undist. taxable income, (d) Previously taxed capital.
 * Uses ReconciliationEngine factNames (m2_*).
 * Column (a) AAA is the primary column — others rarely used for simple S-Corps.
 */
export const SCH_M2_1120S_MAPPING: FormPdfMapping = {
  formCode: "Sch M-2:1120-S",
  pdfFileName: "f1120s.pdf",
  taxYear: 2025,
  fields: [
    // Line 1: Balance at beginning of tax year
    { pdfFieldName: `${M2}Line1[0].f5_19[0]`, factName: "m2_boy_balance",          format: "currency", irsLine: "1a", description: "AAA — BOY balance" },
    { pdfFieldName: `${M2}Line1[0].f5_20[0]`, factName: "m2_boy_balance",          format: "currency", irsLine: "1b", description: "OAA — BOY balance" },
    // Line 2: Ordinary income
    { pdfFieldName: `${M2}Line2[0].f5_23[0]`, factName: "m2_ordinary_income",      format: "currency", irsLine: "2a", description: "AAA — Ordinary income from page 1 line 21" },
    // Line 3: Other additions
    { pdfFieldName: `${M2}Line3[0].f5_27[0]`, factName: "m2_other_additions",      format: "currency", irsLine: "3a", description: "AAA — Other additions" },
    { pdfFieldName: `${M2}Line3[0].f5_28[0]`, factName: "m2_other_additions",      format: "currency", irsLine: "3b", description: "OAA — Other additions" },
    // Line 4: Loss from page 1, line 21
    { pdfFieldName: `${M2}Line4[0].f5_31[0]`, factName: "m2_loss",                 format: "currency", irsLine: "4a", description: "AAA — Loss" },
    // Line 5: Other reductions
    { pdfFieldName: `${M2}Line5[0].f5_35[0]`, factName: "m2_other_reductions",     format: "currency", irsLine: "5a", description: "AAA — Other reductions" },
    { pdfFieldName: `${M2}Line5[0].f5_36[0]`, factName: "m2_other_reductions",     format: "currency", irsLine: "5b", description: "OAA — Other reductions" },
    // Line 6: Combine lines 1 through 5
    { pdfFieldName: `${M2}Line6[0].f5_39[0]`, factName: "m2_eoy_balance",          format: "currency", irsLine: "6a", description: "AAA — Subtotal before distributions" },
    // Line 7: Distributions (other than dividend distributions)
    { pdfFieldName: `${M2}Line7[0].f5_43[0]`, factName: "m2_distributions_cash",   format: "currency", irsLine: "7a", description: "AAA — Distributions" },
    // Line 8: Balance at end of tax year
    { pdfFieldName: `${M2}Line8[0].f5_47[0]`, factName: "m2_eoy_balance",          format: "currency", irsLine: "8a", description: "AAA — EOY balance" },
    { pdfFieldName: `${M2}Line8[0].f5_48[0]`, factName: "m2_eoy_balance",          format: "currency", irsLine: "8b", description: "OAA — EOY balance" },
  ],
};
