import type { FormPdfMapping, FillContext } from "../types";

const P3 = "topmostSubform[0].Page3[0].";

/**
 * Schedule K — Shareholders' Distributive Share Items (1120-S pages 3-4).
 * Maps Schedule K engine factNames to actual PDF field IDs.
 */
export const SCH_K_MAPPING: FormPdfMapping = {
  formCode: "Sch K",
  pdfFileName: "f1120s.pdf",
  taxYear: 2025,
  fields: [
    // ── Header ────────────────────────────────────────────────────────────────
    { pdfFieldName: "topmostSubform[0].Page1[0].f1_4[0]", compute: (ctx: FillContext) => ctx.meta.companyName, format: "string", irsLine: "header", description: "Corporation name" },
    { pdfFieldName: "topmostSubform[0].Page1[0].f1_9[0]", compute: (ctx: FillContext) => ctx.meta.ein, format: "string", irsLine: "B", description: "EIN" },

    // ── Income (Loss) ─────────────────────────────────────────────────────────
    { pdfFieldName: `${P3}f3_1[0]`,  factName: "sk_ordinary_business_income",  format: "currency", irsLine: "1",   description: "Ordinary business income (loss)" },
    { pdfFieldName: `${P3}f3_2[0]`,  factName: "sk_net_rental_real_estate",    format: "currency", irsLine: "2",   description: "Net rental real estate income (loss)" },
    { pdfFieldName: `${P3}f3_3[0]`,  factName: "sk_other_net_rental",          format: "currency", irsLine: "3a",  description: "Other gross rental income (loss)" },
    { pdfFieldName: `${P3}f3_4[0]`,  factName: "sk_interest_income",           format: "currency", irsLine: "4",   description: "Interest income" },
    { pdfFieldName: `${P3}f3_5[0]`,  factName: "sk_ordinary_dividends",        format: "currency", irsLine: "5a",  description: "Ordinary dividends" },
    { pdfFieldName: `${P3}f3_6[0]`,  factName: "sk_qualified_dividends",       format: "currency", irsLine: "5b",  description: "Qualified dividends" },
    { pdfFieldName: `${P3}f3_7[0]`,  factName: "sk_royalties",                 format: "currency", irsLine: "6",   description: "Royalties" },
    { pdfFieldName: `${P3}f3_8[0]`,  factName: "sk_net_stcg",                  format: "currency", irsLine: "7",   description: "Net short-term capital gain (loss)" },
    { pdfFieldName: `${P3}f3_9[0]`,  factName: "sk_net_ltcg",                  format: "currency", irsLine: "8a",  description: "Net long-term capital gain (loss)" },
    { pdfFieldName: `${P3}f3_10[0]`, factName: "sk_net_section_1231",          format: "currency", irsLine: "9",   description: "Net section 1231 gain (loss)" },
    { pdfFieldName: `${P3}f3_11[0]`, factName: "sk_other_income",              format: "currency", irsLine: "10",  description: "Other income (loss)" },

    // ── Deductions ────────────────────────────────────────────────────────────
    { pdfFieldName: `${P3}f3_12[0]`, factName: "sk_section_179",               format: "currency", irsLine: "11",  description: "Section 179 deduction" },
    { pdfFieldName: `${P3}f3_13[0]`, factName: "sk_charitable_contributions",  format: "currency", irsLine: "12a", description: "Charitable contributions" },
    { pdfFieldName: `${P3}f3_14[0]`, factName: "sk_investment_interest",       format: "currency", irsLine: "12b", description: "Investment interest expense" },

    // ── Credits (Lines 13a-13e) ───────────────────────────────────────────────
    { pdfFieldName: `${P3}f3_15[0]`, factName: "sk_low_income_housing_credit", format: "currency", irsLine: "13a", description: "Low-income housing credit (§42(j)(5))" },
    { pdfFieldName: `${P3}f3_16[0]`, factName: "sk_low_income_housing_other",  format: "currency", irsLine: "13b", description: "Low-income housing credit (other)" },
    { pdfFieldName: `${P3}f3_17[0]`, factName: "sk_qualified_rehab",           format: "currency", irsLine: "13c", description: "Qualified rehabilitation expenditures" },
    { pdfFieldName: `${P3}f3_18[0]`, factName: "sk_other_rental_credits",      format: "currency", irsLine: "13d", description: "Other rental real estate credits" },
    { pdfFieldName: `${P3}f3_19[0]`, factName: "sk_other_credits",             format: "currency", irsLine: "13e", description: "Other credits" },

    // ── Foreign Transactions (Lines 14a-14n) ──────────────────────────────────
    { pdfFieldName: `${P3}f3_20[0]`, factName: "sk_foreign_gross_income",      format: "currency", irsLine: "14b", description: "Gross income from all sources" },
    { pdfFieldName: `${P3}f3_21[0]`, factName: "sk_foreign_gross_income_sourced", format: "currency", irsLine: "14c", description: "Gross income sourced at shareholder level" },
    { pdfFieldName: `${P3}f3_22[0]`, factName: "sk_foreign_taxes_paid",        format: "currency", irsLine: "14f", description: "Total foreign taxes paid" },

    // ── AMT Items (Lines 15a-15d) ─────────────────────────────────────────────
    { pdfFieldName: `${P3}f3_37[0]`, factName: "sk_amt_post_1986_depreciation", format: "currency", irsLine: "15a", description: "Post-1986 depreciation adjustment" },
    { pdfFieldName: `${P3}f3_38[0]`, factName: "sk_amt_adjusted_gain_loss",     format: "currency", irsLine: "15b", description: "Adjusted gain or loss" },

    // ── Items Affecting Shareholder Basis (Lines 16a-16d) ─────────────────────
    { pdfFieldName: `${P3}f3_39[0]`, factName: "sk_tax_exempt_interest",       format: "currency", irsLine: "16a", description: "Tax-exempt interest income" },
    { pdfFieldName: `${P3}f3_40[0]`, factName: "sk_other_tax_exempt",          format: "currency", irsLine: "16b", description: "Other tax-exempt income" },
    { pdfFieldName: `${P3}f3_41[0]`, factName: "sk_nondeductible_expenses",    format: "currency", irsLine: "16c", description: "Nondeductible expenses" },
    { pdfFieldName: `${P3}f3_42[0]`, factName: "sk_distributions",             format: "currency", irsLine: "16d", description: "Distributions" },
  ],
};
