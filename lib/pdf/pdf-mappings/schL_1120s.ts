import type { FormPdfMapping } from "../types";

const ASSETS = "topmostSubform[0].Page4[0].Table_Assets[0].";
const LIAB = "topmostSubform[0].Page4[0].Table_Liabilities[0].";

/**
 * Schedule L — Balance Sheets per Books (1120-S, Page 4).
 * Same factNames as schL.ts (which targets f1120.pdf), but different PDF field IDs.
 * 4 columns per line: BOY amount (a), BOY net (b), EOY amount (c), EOY net (d).
 */
export const SCH_L_1120S_MAPPING: FormPdfMapping = {
  formCode: "Sch L:1120-S",
  pdfFileName: "f1120s.pdf",
  taxYear: 2025,
  fields: [
    // ── Assets ────────────────────────────────────────────────────────────────
    // Line 1: Cash
    { pdfFieldName: `${ASSETS}Line1[0].f4_5[0]`,  factName: "boy_cash_total",               format: "currency", irsLine: "1a", description: "Cash — BOY (col a)" },
    { pdfFieldName: `${ASSETS}Line1[0].f4_6[0]`,  factName: "boy_cash_total",               format: "currency", irsLine: "1b", description: "Cash — BOY (col b)" },
    { pdfFieldName: `${ASSETS}Line1[0].f4_7[0]`,  factName: "cash_total",                   format: "currency", irsLine: "1c", description: "Cash — EOY (col c)" },
    { pdfFieldName: `${ASSETS}Line1[0].f4_8[0]`,  factName: "cash_total",                   format: "currency", irsLine: "1d", description: "Cash — EOY (col d)" },
    // Line 2a: Trade notes & accounts receivable
    { pdfFieldName: `${ASSETS}Line2a[0].f4_9[0]`,  factName: "boy_accounts_receivable_total", format: "currency", irsLine: "2a-a", description: "AR — BOY" },
    { pdfFieldName: `${ASSETS}Line2a[0].f4_10[0]`, factName: "boy_accounts_receivable_total", format: "currency", irsLine: "2a-b", description: "AR — BOY" },
    { pdfFieldName: `${ASSETS}Line2a[0].f4_11[0]`, factName: "accounts_receivable_total",     format: "currency", irsLine: "2a-c", description: "AR — EOY" },
    { pdfFieldName: `${ASSETS}Line2a[0].f4_12[0]`, factName: "accounts_receivable_total",     format: "currency", irsLine: "2a-d", description: "AR — EOY" },
    // Line 2b: Less allowance for bad debts
    { pdfFieldName: `${ASSETS}Line2b[0].f4_13[0]`, factName: "boy_allowance_bad_debts_total", format: "currency", irsLine: "2b-a", description: "Allowance — BOY" },
    { pdfFieldName: `${ASSETS}Line2b[0].f4_14[0]`, factName: "boy_allowance_bad_debts_total", format: "currency", irsLine: "2b-b", description: "Allowance — BOY" },
    { pdfFieldName: `${ASSETS}Line2b[0].f4_15[0]`, factName: "allowance_bad_debts_total",     format: "currency", irsLine: "2b-c", description: "Allowance — EOY" },
    { pdfFieldName: `${ASSETS}Line2b[0].f4_16[0]`, factName: "allowance_bad_debts_total",     format: "currency", irsLine: "2b-d", description: "Allowance — EOY" },
    // Line 3: Inventories
    { pdfFieldName: `${ASSETS}Line3[0].f4_17[0]`,  factName: "boy_inventory_total",          format: "currency", irsLine: "3a", description: "Inventory — BOY" },
    { pdfFieldName: `${ASSETS}Line3[0].f4_18[0]`,  factName: "boy_inventory_total",          format: "currency", irsLine: "3b", description: "Inventory — BOY" },
    { pdfFieldName: `${ASSETS}Line3[0].f4_19[0]`,  factName: "inventory_total",              format: "currency", irsLine: "3c", description: "Inventory — EOY" },
    { pdfFieldName: `${ASSETS}Line3[0].f4_20[0]`,  factName: "inventory_total",              format: "currency", irsLine: "3d", description: "Inventory — EOY" },
    // Line 4: U.S. government obligations
    { pdfFieldName: `${ASSETS}Line4[0].f4_21[0]`,  factName: "boy_us_govt_obligations_total", format: "currency", irsLine: "4a", description: "US Govt obligations — BOY" },
    { pdfFieldName: `${ASSETS}Line4[0].f4_22[0]`,  factName: "boy_us_govt_obligations_total", format: "currency", irsLine: "4b", description: "US Govt obligations — BOY" },
    { pdfFieldName: `${ASSETS}Line4[0].f4_23[0]`,  factName: "us_govt_obligations_total",     format: "currency", irsLine: "4c", description: "US Govt obligations — EOY" },
    { pdfFieldName: `${ASSETS}Line4[0].f4_24[0]`,  factName: "us_govt_obligations_total",     format: "currency", irsLine: "4d", description: "US Govt obligations — EOY" },
    // Line 5: Tax-exempt securities
    { pdfFieldName: `${ASSETS}Line5[0].f4_25[0]`,  factName: "boy_tax_exempt_securities_total", format: "currency", irsLine: "5a", description: "Tax-exempt securities — BOY" },
    { pdfFieldName: `${ASSETS}Line5[0].f4_26[0]`,  factName: "boy_tax_exempt_securities_total", format: "currency", irsLine: "5b", description: "Tax-exempt securities — BOY" },
    { pdfFieldName: `${ASSETS}Line5[0].f4_27[0]`,  factName: "tax_exempt_securities_total",     format: "currency", irsLine: "5c", description: "Tax-exempt securities — EOY" },
    { pdfFieldName: `${ASSETS}Line5[0].f4_28[0]`,  factName: "tax_exempt_securities_total",     format: "currency", irsLine: "5d", description: "Tax-exempt securities — EOY" },
    // Line 6: Other current assets
    { pdfFieldName: `${ASSETS}Line6[0].f4_29[0]`,  factName: "boy_other_current_assets_total", format: "currency", irsLine: "6a", description: "Other current assets — BOY" },
    { pdfFieldName: `${ASSETS}Line6[0].f4_30[0]`,  factName: "boy_other_current_assets_total", format: "currency", irsLine: "6b", description: "Other current assets — BOY" },
    { pdfFieldName: `${ASSETS}Line6[0].f4_31[0]`,  factName: "other_current_assets_total",     format: "currency", irsLine: "6c", description: "Other current assets — EOY" },
    { pdfFieldName: `${ASSETS}Line6[0].f4_32[0]`,  factName: "other_current_assets_total",     format: "currency", irsLine: "6d", description: "Other current assets — EOY" },
    // Line 7: Loans to shareholders
    { pdfFieldName: `${ASSETS}Line7[0].f4_33[0]`,  factName: "boy_loans_to_officers_total",   format: "currency", irsLine: "7a", description: "Loans to shareholders — BOY" },
    { pdfFieldName: `${ASSETS}Line7[0].f4_34[0]`,  factName: "boy_loans_to_officers_total",   format: "currency", irsLine: "7b", description: "Loans to shareholders — BOY" },
    { pdfFieldName: `${ASSETS}Line7[0].f4_35[0]`,  factName: "loans_to_officers_total",       format: "currency", irsLine: "7c", description: "Loans to shareholders — EOY" },
    { pdfFieldName: `${ASSETS}Line7[0].f4_36[0]`,  factName: "loans_to_officers_total",       format: "currency", irsLine: "7d", description: "Loans to shareholders — EOY" },
    // Line 8: Mortgage and real estate loans
    { pdfFieldName: `${ASSETS}Line8[0].f4_37[0]`,  factName: "boy_mortgage_loans_total",      format: "currency", irsLine: "8a", description: "Mortgage loans — BOY" },
    { pdfFieldName: `${ASSETS}Line8[0].f4_38[0]`,  factName: "boy_mortgage_loans_total",      format: "currency", irsLine: "8b", description: "Mortgage loans — BOY" },
    { pdfFieldName: `${ASSETS}Line8[0].f4_39[0]`,  factName: "mortgage_loans_total",          format: "currency", irsLine: "8c", description: "Mortgage loans — EOY" },
    { pdfFieldName: `${ASSETS}Line8[0].f4_40[0]`,  factName: "mortgage_loans_total",          format: "currency", irsLine: "8d", description: "Mortgage loans — EOY" },
    // Line 9: Other investments
    { pdfFieldName: `${ASSETS}Line9[0].f4_41[0]`,  factName: "boy_other_assets_total",        format: "currency", irsLine: "9a", description: "Other investments — BOY" },
    { pdfFieldName: `${ASSETS}Line9[0].f4_42[0]`,  factName: "boy_other_assets_total",        format: "currency", irsLine: "9b", description: "Other investments — BOY" },
    { pdfFieldName: `${ASSETS}Line9[0].f4_43[0]`,  factName: "other_assets_total",            format: "currency", irsLine: "9c", description: "Other investments — EOY" },
    { pdfFieldName: `${ASSETS}Line9[0].f4_44[0]`,  factName: "other_assets_total",            format: "currency", irsLine: "9d", description: "Other investments — EOY" },
    // Line 10a: Buildings and depreciable assets
    { pdfFieldName: `${ASSETS}Line10a[0].f4_45[0]`, factName: "boy_buildings_depreciable_total", format: "currency", irsLine: "10a-a", description: "Depreciable assets — BOY" },
    { pdfFieldName: `${ASSETS}Line10a[0].f4_46[0]`, factName: "boy_buildings_depreciable_total", format: "currency", irsLine: "10a-b", description: "Depreciable assets — BOY" },
    { pdfFieldName: `${ASSETS}Line10a[0].f4_47[0]`, factName: "buildings_depreciable_total",     format: "currency", irsLine: "10a-c", description: "Depreciable assets — EOY" },
    { pdfFieldName: `${ASSETS}Line10a[0].f4_48[0]`, factName: "buildings_depreciable_total",     format: "currency", irsLine: "10a-d", description: "Depreciable assets — EOY" },
    // Line 10b: Less accumulated depreciation
    { pdfFieldName: `${ASSETS}Line10b[0].f4_49[0]`, factName: "boy_accum_depreciation_total",  format: "currency", irsLine: "10b-a", description: "Accum depreciation — BOY" },
    { pdfFieldName: `${ASSETS}Line10b[0].f4_50[0]`, factName: "boy_accum_depreciation_total",  format: "currency", irsLine: "10b-b", description: "Accum depreciation — BOY" },
    { pdfFieldName: `${ASSETS}Line10b[0].f4_51[0]`, factName: "accum_depreciation_total",      format: "currency", irsLine: "10b-c", description: "Accum depreciation — EOY" },
    { pdfFieldName: `${ASSETS}Line10b[0].f4_52[0]`, factName: "accum_depreciation_total",      format: "currency", irsLine: "10b-d", description: "Accum depreciation — EOY" },
    // Line 11a: Depletable assets
    { pdfFieldName: `${ASSETS}Line11a[0].f4_53[0]`, factName: "boy_other_assets_total",  format: "currency", irsLine: "11a-a", description: "Depletable assets — BOY" },
    { pdfFieldName: `${ASSETS}Line11a[0].f4_54[0]`, factName: "boy_other_assets_total",  format: "currency", irsLine: "11a-b", description: "Depletable assets — BOY" },
    { pdfFieldName: `${ASSETS}Line11a[0].f4_55[0]`, factName: "other_assets_total",      format: "currency", irsLine: "11a-c", description: "Depletable assets — EOY" },
    { pdfFieldName: `${ASSETS}Line11a[0].f4_56[0]`, factName: "other_assets_total",      format: "currency", irsLine: "11a-d", description: "Depletable assets — EOY" },
    // Line 11b: Less accumulated depletion
    { pdfFieldName: `${ASSETS}Line11b[0].f4_57[0]`, factName: "boy_accum_depreciation_total", format: "currency", irsLine: "11b-a", description: "Accum depletion — BOY" },
    { pdfFieldName: `${ASSETS}Line11b[0].f4_58[0]`, factName: "boy_accum_depreciation_total", format: "currency", irsLine: "11b-b", description: "Accum depletion — BOY" },
    { pdfFieldName: `${ASSETS}Line11b[0].f4_59[0]`, factName: "accum_depletion_total",        format: "currency", irsLine: "11b-c", description: "Accum depletion — EOY" },
    { pdfFieldName: `${ASSETS}Line11b[0].f4_60[0]`, factName: "accum_depletion_total",        format: "currency", irsLine: "11b-d", description: "Accum depletion — EOY" },
    // Line 12: Land
    { pdfFieldName: `${ASSETS}Line12[0].f4_61[0]`,  factName: "boy_land_total",               format: "currency", irsLine: "12a", description: "Land — BOY" },
    { pdfFieldName: `${ASSETS}Line12[0].f4_62[0]`,  factName: "boy_land_total",               format: "currency", irsLine: "12b", description: "Land — BOY" },
    { pdfFieldName: `${ASSETS}Line12[0].f4_63[0]`,  factName: "land_total",                   format: "currency", irsLine: "12c", description: "Land — EOY" },
    { pdfFieldName: `${ASSETS}Line12[0].f4_64[0]`,  factName: "land_total",                   format: "currency", irsLine: "12d", description: "Land — EOY" },
    // Line 13a: Intangible assets
    { pdfFieldName: `${ASSETS}Line13a[0].f4_65[0]`, factName: "boy_intangible_assets_total",  format: "currency", irsLine: "13a-a", description: "Intangibles — BOY" },
    { pdfFieldName: `${ASSETS}Line13a[0].f4_66[0]`, factName: "boy_intangible_assets_total",  format: "currency", irsLine: "13a-b", description: "Intangibles — BOY" },
    { pdfFieldName: `${ASSETS}Line13a[0].f4_67[0]`, factName: "intangible_assets_total",      format: "currency", irsLine: "13a-c", description: "Intangibles — EOY" },
    { pdfFieldName: `${ASSETS}Line13a[0].f4_68[0]`, factName: "intangible_assets_total",      format: "currency", irsLine: "13a-d", description: "Intangibles — EOY" },
    // Line 13b: Less accumulated amortization
    { pdfFieldName: `${ASSETS}Line13b[0].f4_69[0]`, factName: "boy_accum_amortization_total", format: "currency", irsLine: "13b-a", description: "Accum amortization — BOY" },
    { pdfFieldName: `${ASSETS}Line13b[0].f4_70[0]`, factName: "boy_accum_amortization_total", format: "currency", irsLine: "13b-b", description: "Accum amortization — BOY" },
    { pdfFieldName: `${ASSETS}Line13b[0].f4_71[0]`, factName: "accum_amortization_total",     format: "currency", irsLine: "13b-c", description: "Accum amortization — EOY" },
    { pdfFieldName: `${ASSETS}Line13b[0].f4_72[0]`, factName: "accum_amortization_total",     format: "currency", irsLine: "13b-d", description: "Accum amortization — EOY" },
    // Line 14: Other assets
    { pdfFieldName: `${ASSETS}Line14[0].f4_73[0]`,  factName: "boy_other_assets_total",       format: "currency", irsLine: "14a", description: "Other assets — BOY" },
    { pdfFieldName: `${ASSETS}Line14[0].f4_74[0]`,  factName: "boy_other_assets_total",       format: "currency", irsLine: "14b", description: "Other assets — BOY" },
    { pdfFieldName: `${ASSETS}Line14[0].f4_75[0]`,  factName: "other_assets_total",           format: "currency", irsLine: "14c", description: "Other assets — EOY" },
    { pdfFieldName: `${ASSETS}Line14[0].f4_76[0]`,  factName: "other_assets_total",           format: "currency", irsLine: "14d", description: "Other assets — EOY" },
    // Line 15: Total assets
    { pdfFieldName: `${ASSETS}Line15[0].f4_77[0]`,  factName: "boy_total_assets",             format: "currency", irsLine: "15a", description: "Total assets — BOY" },
    { pdfFieldName: `${ASSETS}Line15[0].f4_78[0]`,  factName: "boy_total_assets",             format: "currency", irsLine: "15b", description: "Total assets — BOY" },
    { pdfFieldName: `${ASSETS}Line15[0].f4_79[0]`,  factName: "total_assets_bs",              format: "currency", irsLine: "15c", description: "Total assets — EOY" },
    { pdfFieldName: `${ASSETS}Line15[0].f4_80[0]`,  factName: "total_assets_bs",              format: "currency", irsLine: "15d", description: "Total assets — EOY" },

    // ── Liabilities & Shareholders' Equity ────────────────────────────────────
    // Line 16: Accounts payable
    { pdfFieldName: `${LIAB}Line16[0].f4_81[0]`,  factName: "boy_accounts_payable_total",   format: "currency", irsLine: "16a", description: "AP — BOY" },
    { pdfFieldName: `${LIAB}Line16[0].f4_82[0]`,  factName: "boy_accounts_payable_total",   format: "currency", irsLine: "16b", description: "AP — BOY" },
    { pdfFieldName: `${LIAB}Line16[0].f4_83[0]`,  factName: "accounts_payable_total",       format: "currency", irsLine: "16c", description: "AP — EOY" },
    { pdfFieldName: `${LIAB}Line16[0].f4_84[0]`,  factName: "accounts_payable_total",       format: "currency", irsLine: "16d", description: "AP — EOY" },
    // Line 17: Mortgages, notes, bonds payable < 1 year
    { pdfFieldName: `${LIAB}Line17[0].f4_85[0]`,  factName: "boy_short_term_notes_total",   format: "currency", irsLine: "17a", description: "Short-term notes — BOY" },
    { pdfFieldName: `${LIAB}Line17[0].f4_86[0]`,  factName: "boy_short_term_notes_total",   format: "currency", irsLine: "17b", description: "Short-term notes — BOY" },
    { pdfFieldName: `${LIAB}Line17[0].f4_87[0]`,  factName: "short_term_notes_total",       format: "currency", irsLine: "17c", description: "Short-term notes — EOY" },
    { pdfFieldName: `${LIAB}Line17[0].f4_88[0]`,  factName: "short_term_notes_total",       format: "currency", irsLine: "17d", description: "Short-term notes — EOY" },
    // Line 18: Other current liabilities
    { pdfFieldName: `${LIAB}Line18[0].f4_89[0]`,  factName: "boy_other_current_liabilities_total", format: "currency", irsLine: "18a", description: "Other current liabilities — BOY" },
    { pdfFieldName: `${LIAB}Line18[0].f4_90[0]`,  factName: "boy_other_current_liabilities_total", format: "currency", irsLine: "18b", description: "Other current liabilities — BOY" },
    { pdfFieldName: `${LIAB}Line18[0].f4_91[0]`,  factName: "other_current_liabilities_total",     format: "currency", irsLine: "18c", description: "Other current liabilities — EOY" },
    { pdfFieldName: `${LIAB}Line18[0].f4_92[0]`,  factName: "other_current_liabilities_total",     format: "currency", irsLine: "18d", description: "Other current liabilities — EOY" },
    // Line 19: Loans from shareholders
    { pdfFieldName: `${LIAB}Line19[0].f4_93[0]`,  factName: "boy_shareholder_loans_total",  format: "currency", irsLine: "19a", description: "Shareholder loans — BOY" },
    { pdfFieldName: `${LIAB}Line19[0].f4_94[0]`,  factName: "boy_shareholder_loans_total",  format: "currency", irsLine: "19b", description: "Shareholder loans — BOY" },
    { pdfFieldName: `${LIAB}Line19[0].f4_95[0]`,  factName: "shareholder_loans_total",      format: "currency", irsLine: "19c", description: "Shareholder loans — EOY" },
    { pdfFieldName: `${LIAB}Line19[0].f4_96[0]`,  factName: "shareholder_loans_total",      format: "currency", irsLine: "19d", description: "Shareholder loans — EOY" },
    // Line 20: Mortgages, notes, bonds payable >= 1 year
    { pdfFieldName: `${LIAB}Line20[0].f4_97[0]`,  factName: "boy_long_term_liabilities_total", format: "currency", irsLine: "20a", description: "Long-term liabilities — BOY" },
    { pdfFieldName: `${LIAB}Line20[0].f4_98[0]`,  factName: "boy_long_term_liabilities_total", format: "currency", irsLine: "20b", description: "Long-term liabilities — BOY" },
    { pdfFieldName: `${LIAB}Line20[0].f4_99[0]`,  factName: "long_term_liabilities_total",     format: "currency", irsLine: "20c", description: "Long-term liabilities — EOY" },
    { pdfFieldName: `${LIAB}Line20[0].f4_100[0]`, factName: "long_term_liabilities_total",     format: "currency", irsLine: "20d", description: "Long-term liabilities — EOY" },
    // Line 21: Other liabilities
    { pdfFieldName: `${LIAB}Line21[0].f4_101[0]`, factName: "boy_other_current_liabilities_total", format: "currency", irsLine: "21a", description: "Other liabilities — BOY" },
    { pdfFieldName: `${LIAB}Line21[0].f4_102[0]`, factName: "boy_other_current_liabilities_total", format: "currency", irsLine: "21b", description: "Other liabilities — BOY" },
    { pdfFieldName: `${LIAB}Line21[0].f4_103[0]`, factName: "other_current_liabilities_total",     format: "currency", irsLine: "21c", description: "Other liabilities — EOY" },
    { pdfFieldName: `${LIAB}Line21[0].f4_104[0]`, factName: "other_current_liabilities_total",     format: "currency", irsLine: "21d", description: "Other liabilities — EOY" },
    // Line 22: Capital stock
    { pdfFieldName: `${LIAB}Line22[0].f4_105[0]`, factName: "boy_capital_stock_total",      format: "currency", irsLine: "22a", description: "Capital stock — BOY" },
    { pdfFieldName: `${LIAB}Line22[0].f4_106[0]`, factName: "boy_capital_stock_total",      format: "currency", irsLine: "22b", description: "Capital stock — BOY" },
    { pdfFieldName: `${LIAB}Line22[0].f4_107[0]`, factName: "capital_stock_total",          format: "currency", irsLine: "22c", description: "Capital stock — EOY" },
    { pdfFieldName: `${LIAB}Line22[0].f4_108[0]`, factName: "capital_stock_total",          format: "currency", irsLine: "22d", description: "Capital stock — EOY" },
    // Line 23: Additional paid-in capital
    { pdfFieldName: `${LIAB}Line23[0].f4_109[0]`, factName: "boy_additional_paid_in_capital", format: "currency", irsLine: "23a", description: "APIC — BOY" },
    { pdfFieldName: `${LIAB}Line23[0].f4_110[0]`, factName: "boy_additional_paid_in_capital", format: "currency", irsLine: "23b", description: "APIC — BOY" },
    { pdfFieldName: `${LIAB}Line23[0].f4_111[0]`, factName: "additional_paid_in_capital",     format: "currency", irsLine: "23c", description: "APIC — EOY" },
    { pdfFieldName: `${LIAB}Line23[0].f4_112[0]`, factName: "additional_paid_in_capital",     format: "currency", irsLine: "23d", description: "APIC — EOY" },
    // Line 24: Retained earnings
    { pdfFieldName: `${LIAB}Line24[0].f4_113[0]`, factName: "boy_retained_earnings_total",  format: "currency", irsLine: "24a", description: "Retained earnings — BOY" },
    { pdfFieldName: `${LIAB}Line24[0].f4_114[0]`, factName: "boy_retained_earnings_total",  format: "currency", irsLine: "24b", description: "Retained earnings — BOY" },
    { pdfFieldName: `${LIAB}Line24[0].f4_115[0]`, factName: "retained_earnings_total",      format: "currency", irsLine: "24c", description: "Retained earnings — EOY" },
    { pdfFieldName: `${LIAB}Line24[0].f4_116[0]`, factName: "retained_earnings_total",      format: "currency", irsLine: "24d", description: "Retained earnings — EOY" },
    // Line 25: Adjustments to shareholders' equity
    { pdfFieldName: `${LIAB}Line25[0].f4_117[0]`, factName: "boy_equity_adjustments_total", format: "currency", irsLine: "25a", description: "Equity adjustments — BOY" },
    { pdfFieldName: `${LIAB}Line25[0].f4_118[0]`, factName: "boy_equity_adjustments_total", format: "currency", irsLine: "25b", description: "Equity adjustments — BOY" },
    { pdfFieldName: `${LIAB}Line25[0].f4_119[0]`, factName: "equity_adjustments_total",     format: "currency", irsLine: "25c", description: "Equity adjustments — EOY" },
    { pdfFieldName: `${LIAB}Line25[0].f4_120[0]`, factName: "equity_adjustments_total",     format: "currency", irsLine: "25d", description: "Equity adjustments — EOY" },
    // Line 26: Less cost of treasury stock
    { pdfFieldName: `${LIAB}Line26[0].f4_121[0]`, factName: "boy_treasury_stock_total",     format: "currency", irsLine: "26a", description: "Treasury stock — BOY" },
    { pdfFieldName: `${LIAB}Line26[0].f4_122[0]`, factName: "boy_treasury_stock_total",     format: "currency", irsLine: "26b", description: "Treasury stock — BOY" },
    { pdfFieldName: `${LIAB}Line26[0].f4_123[0]`, factName: "treasury_stock_total",         format: "currency", irsLine: "26c", description: "Treasury stock — EOY" },
    { pdfFieldName: `${LIAB}Line26[0].f4_124[0]`, factName: "treasury_stock_total",         format: "currency", irsLine: "26d", description: "Treasury stock — EOY" },
    // Line 27: Total liabilities and shareholders' equity
    { pdfFieldName: `${LIAB}Line27[0].f4_125[0]`, factName: "boy_total_assets",             format: "currency", irsLine: "27a", description: "Total L+E — BOY" },
    { pdfFieldName: `${LIAB}Line27[0].f4_126[0]`, factName: "boy_total_assets",             format: "currency", irsLine: "27b", description: "Total L+E — BOY" },
    { pdfFieldName: `${LIAB}Line27[0].f4_127[0]`, factName: "total_assets_bs",              format: "currency", irsLine: "27c", description: "Total L+E — EOY" },
    { pdfFieldName: `${LIAB}Line27[0].f4_128[0]`, factName: "total_assets_bs",              format: "currency", irsLine: "27d", description: "Total L+E — EOY" },
  ],
};
