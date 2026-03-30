import type { FormPdfMapping, FillContext } from "../types";

const ASSETS = "topmostSubform[0].Page6[0].Table_SchL_Assets[0].";
const LIAB = "topmostSubform[0].Page6[0].Table_SchL_Liabilities[0].";

export const SCH_L_MAPPING: FormPdfMapping = {
  formCode: "Sch L",
  pdfFileName: "f1120.pdf",
  taxYear: 2025,
  fields: [
    // -------------------------------------------------------------------------
    // Assets — Line 1: Cash
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line1[0].f6_1[0]`,
      format: "currency",
      irsLine: "1a",
      description: "Cash — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line1[0].f6_2[0]`,
      format: "currency",
      irsLine: "1b",
      description: "Cash — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line1[0].f6_3[0]`,
      format: "currency",
      irsLine: "1c",
      description: "Cash — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line1[0].f6_4[0]`,
      factName: "cash_total",
      format: "currency",
      irsLine: "1d",
      description: "Cash — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 2a: Trade notes and accounts receivable
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line2a[0].f6_5[0]`,
      format: "currency",
      irsLine: "2a-a",
      description: "Trade notes and accounts receivable — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line2a[0].f6_6[0]`,
      format: "currency",
      irsLine: "2a-b",
      description: "Trade notes and accounts receivable — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line2a[0].f6_7[0]`,
      format: "currency",
      irsLine: "2a-c",
      description: "Trade notes and accounts receivable — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line2a[0].f6_8[0]`,
      factName: "accounts_receivable_total",
      format: "currency",
      irsLine: "2a-d",
      description: "Trade notes and accounts receivable — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 2b: Less allowance for bad debts
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line2b[0].f6_9[0]`,
      format: "currency",
      irsLine: "2b-a",
      description: "Less allowance for bad debts — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line2b[0].f6_10[0]`,
      format: "currency",
      irsLine: "2b-b",
      description: "Less allowance for bad debts — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line2b[0].f6_11[0]`,
      format: "currency",
      irsLine: "2b-c",
      description: "Less allowance for bad debts — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line2b[0].f6_12[0]`,
      factName: "allowance_bad_debts_total",
      format: "currency",
      irsLine: "2b-d",
      description: "Less allowance for bad debts — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 3: Inventories
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line3[0].f6_13[0]`,
      format: "currency",
      irsLine: "3a",
      description: "Inventories — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line3[0].f6_14[0]`,
      format: "currency",
      irsLine: "3b",
      description: "Inventories — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line3[0].f6_15[0]`,
      format: "currency",
      irsLine: "3c",
      description: "Inventories — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line3[0].f6_16[0]`,
      factName: "inventory_total",
      format: "currency",
      irsLine: "3d",
      description: "Inventories — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 4: U.S. government obligations
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line4[0].f6_17[0]`,
      format: "currency",
      irsLine: "4a",
      description: "U.S. government obligations — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line4[0].f6_18[0]`,
      format: "currency",
      irsLine: "4b",
      description: "U.S. government obligations — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line4[0].f6_19[0]`,
      format: "currency",
      irsLine: "4c",
      description: "U.S. government obligations — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line4[0].f6_20[0]`,
      format: "currency",
      irsLine: "4d",
      description: "U.S. government obligations — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 5: Tax-exempt securities
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line5[0].f6_21[0]`,
      format: "currency",
      irsLine: "5a",
      description: "Tax-exempt securities — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line5[0].f6_22[0]`,
      format: "currency",
      irsLine: "5b",
      description: "Tax-exempt securities — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line5[0].f6_23[0]`,
      format: "currency",
      irsLine: "5c",
      description: "Tax-exempt securities — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line5[0].f6_24[0]`,
      format: "currency",
      irsLine: "5d",
      description: "Tax-exempt securities — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 6: Other current assets
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line6[0].f6_25[0]`,
      format: "currency",
      irsLine: "6a",
      description: "Other current assets — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line6[0].f6_26[0]`,
      format: "currency",
      irsLine: "6b",
      description: "Other current assets — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line6[0].f6_27[0]`,
      format: "currency",
      irsLine: "6c",
      description: "Other current assets — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line6[0].f6_28[0]`,
      factName: "other_current_assets_total",
      format: "currency",
      irsLine: "6d",
      description: "Other current assets — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 7: Loans to shareholders
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line7[0].f6_29[0]`,
      format: "currency",
      irsLine: "7a",
      description: "Loans to shareholders — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line7[0].f6_30[0]`,
      format: "currency",
      irsLine: "7b",
      description: "Loans to shareholders — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line7[0].f6_31[0]`,
      format: "currency",
      irsLine: "7c",
      description: "Loans to shareholders — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line7[0].f6_32[0]`,
      factName: "loans_to_officers_total",
      format: "currency",
      irsLine: "7d",
      description: "Loans to shareholders — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 8: Mortgage and real estate loans
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line8[0].f6_33[0]`,
      format: "currency",
      irsLine: "8a",
      description: "Mortgage and real estate loans — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line8[0].f6_34[0]`,
      format: "currency",
      irsLine: "8b",
      description: "Mortgage and real estate loans — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line8[0].f6_35[0]`,
      format: "currency",
      irsLine: "8c",
      description: "Mortgage and real estate loans — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line8[0].f6_36[0]`,
      format: "currency",
      irsLine: "8d",
      description: "Mortgage and real estate loans — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 9: Other investments
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line9[0].f6_37[0]`,
      format: "currency",
      irsLine: "9a",
      description: "Other investments — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line9[0].f6_38[0]`,
      format: "currency",
      irsLine: "9b",
      description: "Other investments — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line9[0].f6_39[0]`,
      format: "currency",
      irsLine: "9c",
      description: "Other investments — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line9[0].f6_40[0]`,
      format: "currency",
      irsLine: "9d",
      description: "Other investments — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 10a: Buildings and other depreciable assets
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line10a[0].f6_41[0]`,
      format: "currency",
      irsLine: "10a-a",
      description: "Buildings and other depreciable assets — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line10a[0].f6_42[0]`,
      format: "currency",
      irsLine: "10a-b",
      description: "Buildings and other depreciable assets — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line10a[0].f6_43[0]`,
      format: "currency",
      irsLine: "10a-c",
      description: "Buildings and other depreciable assets — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line10a[0].f6_44[0]`,
      factName: "buildings_depreciable_total",
      format: "currency",
      irsLine: "10a-d",
      description: "Buildings and other depreciable assets — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 10b: Less accumulated depreciation
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line10b[0].f6_45[0]`,
      format: "currency",
      irsLine: "10b-a",
      description: "Less accumulated depreciation — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line10b[0].f6_46[0]`,
      format: "currency",
      irsLine: "10b-b",
      description: "Less accumulated depreciation — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line10b[0].f6_47[0]`,
      format: "currency",
      irsLine: "10b-c",
      description: "Less accumulated depreciation — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line10b[0].f6_48[0]`,
      factName: "accum_depreciation_total",
      format: "currency",
      irsLine: "10b-d",
      description: "Less accumulated depreciation — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 11a: Depletable assets
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line11a[0].f6_49[0]`,
      format: "currency",
      irsLine: "11a-a",
      description: "Depletable assets — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line11a[0].f6_50[0]`,
      format: "currency",
      irsLine: "11a-b",
      description: "Depletable assets — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line11a[0].f6_51[0]`,
      format: "currency",
      irsLine: "11a-c",
      description: "Depletable assets — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line11a[0].f6_52[0]`,
      format: "currency",
      irsLine: "11a-d",
      description: "Depletable assets — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 11b: Less accumulated depletion
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line11b[0].f6_53[0]`,
      format: "currency",
      irsLine: "11b-a",
      description: "Less accumulated depletion — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line11b[0].f6_54[0]`,
      format: "currency",
      irsLine: "11b-b",
      description: "Less accumulated depletion — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line11b[0].f6_55[0]`,
      format: "currency",
      irsLine: "11b-c",
      description: "Less accumulated depletion — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line11b[0].f6_56[0]`,
      format: "currency",
      irsLine: "11b-d",
      description: "Less accumulated depletion — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 12: Land (net of any amortization)
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line12[0].f6_57[0]`,
      format: "currency",
      irsLine: "12a",
      description: "Land — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line12[0].f6_58[0]`,
      format: "currency",
      irsLine: "12b",
      description: "Land — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line12[0].f6_59[0]`,
      format: "currency",
      irsLine: "12c",
      description: "Land — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line12[0].f6_60[0]`,
      format: "currency",
      irsLine: "12d",
      description: "Land — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 13a: Intangible assets (amortizable only)
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line13a[0].f6_61[0]`,
      format: "currency",
      irsLine: "13a-a",
      description: "Intangible assets (amortizable only) — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line13a[0].f6_62[0]`,
      format: "currency",
      irsLine: "13a-b",
      description: "Intangible assets (amortizable only) — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line13a[0].f6_63[0]`,
      format: "currency",
      irsLine: "13a-c",
      description: "Intangible assets (amortizable only) — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line13a[0].f6_64[0]`,
      format: "currency",
      irsLine: "13a-d",
      description: "Intangible assets (amortizable only) — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 13b: Less accumulated amortization
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line13b[0].f6_65[0]`,
      format: "currency",
      irsLine: "13b-a",
      description: "Less accumulated amortization — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line13b[0].f6_66[0]`,
      format: "currency",
      irsLine: "13b-b",
      description: "Less accumulated amortization — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line13b[0].f6_67[0]`,
      format: "currency",
      irsLine: "13b-c",
      description: "Less accumulated amortization — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line13b[0].f6_68[0]`,
      format: "currency",
      irsLine: "13b-d",
      description: "Less accumulated amortization — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 14: Other assets
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line14[0].f6_69[0]`,
      format: "currency",
      irsLine: "14a",
      description: "Other assets — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line14[0].f6_70[0]`,
      format: "currency",
      irsLine: "14b",
      description: "Other assets — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line14[0].f6_71[0]`,
      format: "currency",
      irsLine: "14c",
      description: "Other assets — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line14[0].f6_72[0]`,
      factName: "other_assets_total",
      format: "currency",
      irsLine: "14d",
      description: "Other assets — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Assets — Line 15: Total assets
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${ASSETS}Line15[0].f6_73[0]`,
      format: "currency",
      irsLine: "15a",
      description: "Total assets — beginning of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line15[0].f6_74[0]`,
      format: "currency",
      irsLine: "15b",
      description: "Total assets — beginning of year (column b)",
    },
    {
      pdfFieldName: `${ASSETS}Line15[0].f6_75[0]`,
      format: "currency",
      irsLine: "15c",
      description: "Total assets — end of year (column a)",
    },
    {
      pdfFieldName: `${ASSETS}Line15[0].f6_76[0]`,
      factName: "total_assets",
      format: "currency",
      irsLine: "15d",
      description: "Total assets — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 16: Accounts payable
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line16[0].f6_77[0]`,
      format: "currency",
      irsLine: "16a",
      description: "Accounts payable — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line16[0].f6_78[0]`,
      format: "currency",
      irsLine: "16b",
      description: "Accounts payable — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line16[0].f6_79[0]`,
      format: "currency",
      irsLine: "16c",
      description: "Accounts payable — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line16[0].f6_80[0]`,
      factName: "accounts_payable_total",
      format: "currency",
      irsLine: "16d",
      description: "Accounts payable — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 17: Mortgages, notes, bonds payable in less than 1 year
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line17[0].f6_81[0]`,
      format: "currency",
      irsLine: "17a",
      description: "Mortgages, notes, bonds payable in less than 1 year — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line17[0].f6_82[0]`,
      format: "currency",
      irsLine: "17b",
      description: "Mortgages, notes, bonds payable in less than 1 year — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line17[0].f6_83[0]`,
      format: "currency",
      irsLine: "17c",
      description: "Mortgages, notes, bonds payable in less than 1 year — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line17[0].f6_84[0]`,
      format: "currency",
      irsLine: "17d",
      description: "Mortgages, notes, bonds payable in less than 1 year — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 18: Other current liabilities
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line18[0].f6_85[0]`,
      format: "currency",
      irsLine: "18a",
      description: "Other current liabilities — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line18[0].f6_86[0]`,
      format: "currency",
      irsLine: "18b",
      description: "Other current liabilities — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line18[0].f6_87[0]`,
      format: "currency",
      irsLine: "18c",
      description: "Other current liabilities — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line18[0].f6_88[0]`,
      factName: "other_current_liabilities_total",
      format: "currency",
      irsLine: "18d",
      description: "Other current liabilities — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 19: Loans from shareholders
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line19[0].f6_89[0]`,
      format: "currency",
      irsLine: "19a",
      description: "Loans from shareholders — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line19[0].f6_90[0]`,
      format: "currency",
      irsLine: "19b",
      description: "Loans from shareholders — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line19[0].f6_91[0]`,
      format: "currency",
      irsLine: "19c",
      description: "Loans from shareholders — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line19[0].f6_92[0]`,
      factName: "shareholder_loans_total",
      format: "currency",
      irsLine: "19d",
      description: "Loans from shareholders — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 20: Mortgages, notes, bonds payable in 1 year or more
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line20[0].f6_93[0]`,
      format: "currency",
      irsLine: "20a",
      description: "Mortgages, notes, bonds payable in 1 year or more — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line20[0].f6_94[0]`,
      format: "currency",
      irsLine: "20b",
      description: "Mortgages, notes, bonds payable in 1 year or more — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line20[0].f6_95[0]`,
      format: "currency",
      irsLine: "20c",
      description: "Mortgages, notes, bonds payable in 1 year or more — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line20[0].f6_96[0]`,
      factName: "long_term_liabilities_total",
      format: "currency",
      irsLine: "20d",
      description: "Mortgages, notes, bonds payable in 1 year or more — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 21: Other liabilities
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line21[0].f6_97[0]`,
      format: "currency",
      irsLine: "21a",
      description: "Other liabilities — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line21[0].f6_98[0]`,
      format: "currency",
      irsLine: "21b",
      description: "Other liabilities — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line21[0].f6_99[0]`,
      format: "currency",
      irsLine: "21c",
      description: "Other liabilities — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line21[0].f6_100[0]`,
      format: "currency",
      irsLine: "21d",
      description: "Other liabilities — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 22a: Capital stock
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line22a[0].f6_101[0]`,
      format: "currency",
      irsLine: "22a-a",
      description: "Capital stock — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line22a[0].f6_102[0]`,
      format: "currency",
      irsLine: "22a-b",
      description: "Capital stock — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line22a[0].f6_103[0]`,
      format: "currency",
      irsLine: "22a-c",
      description: "Capital stock — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line22a[0].f6_104[0]`,
      factName: "capital_stock_total",
      format: "currency",
      irsLine: "22a-d",
      description: "Capital stock — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 22b: Additional paid-in capital
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line22b[0].f6_105[0]`,
      format: "currency",
      irsLine: "22b-a",
      description: "Additional paid-in capital — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line22b[0].f6_106[0]`,
      format: "currency",
      irsLine: "22b-b",
      description: "Additional paid-in capital — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line22b[0].f6_107[0]`,
      format: "currency",
      irsLine: "22b-c",
      description: "Additional paid-in capital — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line22b[0].f6_108[0]`,
      format: "currency",
      irsLine: "22b-d",
      description: "Additional paid-in capital — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 23: Retained earnings — Appropriated
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line23[0].f6_109[0]`,
      format: "currency",
      irsLine: "23a",
      description: "Retained earnings — appropriated — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line23[0].f6_110[0]`,
      format: "currency",
      irsLine: "23b",
      description: "Retained earnings — appropriated — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line23[0].f6_111[0]`,
      format: "currency",
      irsLine: "23c",
      description: "Retained earnings — appropriated — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line23[0].f6_112[0]`,
      format: "currency",
      irsLine: "23d",
      description: "Retained earnings — appropriated — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 24: Retained earnings — Unappropriated
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line24[0].f6_113[0]`,
      format: "currency",
      irsLine: "24a",
      description: "Retained earnings — unappropriated — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line24[0].f6_114[0]`,
      format: "currency",
      irsLine: "24b",
      description: "Retained earnings — unappropriated — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line24[0].f6_115[0]`,
      format: "currency",
      irsLine: "24c",
      description: "Retained earnings — unappropriated — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line24[0].f6_116[0]`,
      format: "currency",
      irsLine: "24d",
      description: "Retained earnings — unappropriated — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 25: Adjustments to shareholders' equity
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line25[0].f6_117[0]`,
      format: "currency",
      irsLine: "25a",
      description: "Adjustments to shareholders' equity — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line25[0].f6_118[0]`,
      format: "currency",
      irsLine: "25b",
      description: "Adjustments to shareholders' equity — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line25[0].f6_119[0]`,
      format: "currency",
      irsLine: "25c",
      description: "Adjustments to shareholders' equity — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line25[0].f6_120[0]`,
      factName: "retained_earnings_total",
      format: "currency",
      irsLine: "25d",
      description: "Adjustments to shareholders' equity — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 26: Less cost of treasury stock
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line26[0].f6_121[0]`,
      format: "currency",
      irsLine: "26a",
      description: "Less cost of treasury stock — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line26[0].f6_122[0]`,
      format: "currency",
      irsLine: "26b",
      description: "Less cost of treasury stock — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line26[0].f6_123[0]`,
      format: "currency",
      irsLine: "26c",
      description: "Less cost of treasury stock — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line26[0].f6_124[0]`,
      format: "currency",
      irsLine: "26d",
      description: "Less cost of treasury stock — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 27: Total liabilities and shareholders' equity
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line27[0].f6_125[0]`,
      format: "currency",
      irsLine: "27a",
      description: "Total liabilities and shareholders' equity — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line27[0].f6_126[0]`,
      format: "currency",
      irsLine: "27b",
      description: "Total liabilities and shareholders' equity — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line27[0].f6_127[0]`,
      format: "currency",
      irsLine: "27c",
      description: "Total liabilities and shareholders' equity — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line27[0].f6_128[0]`,
      format: "currency",
      irsLine: "27d",
      description: "Total liabilities and shareholders' equity — end of year (column b)",
    },

    // -------------------------------------------------------------------------
    // Liabilities — Line 28: Memo line
    // -------------------------------------------------------------------------
    {
      pdfFieldName: `${LIAB}Line28[0].f6_129[0]`,
      format: "currency",
      irsLine: "28a",
      description: "Memo line — beginning of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line28[0].f6_130[0]`,
      format: "currency",
      irsLine: "28b",
      description: "Memo line — beginning of year (column b)",
    },
    {
      pdfFieldName: `${LIAB}Line28[0].f6_131[0]`,
      format: "currency",
      irsLine: "28c",
      description: "Memo line — end of year (column a)",
    },
    {
      pdfFieldName: `${LIAB}Line28[0].f6_132[0]`,
      compute: (ctx: FillContext) => {
        const totalAssets = Number(ctx.facts["total_assets"] ?? 0);
        return totalAssets !== 0 ? String(totalAssets) : undefined;
      },
      format: "currency",
      irsLine: "28d",
      description: "Memo line — end of year (column b) — total liabilities and equity (should equal total assets)",
    },
  ],
};
