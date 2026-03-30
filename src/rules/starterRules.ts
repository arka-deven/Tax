/**
 * Starter rules — sourced from IRS instructions (2024 tax year).
 *
 * Sources:
 *   Form 1120  — https://www.irs.gov/instructions/i1120
 *   Form 1120-S — https://www.irs.gov/instructions/i1120s
 *   Form 1065  — https://www.irs.gov/instructions/i1065
 *   Schedule C  — https://www.irs.gov/instructions/i1040sc
 *   Schedule SE — https://www.irs.gov/instructions/i1040sse
 *   Form 990   — https://www.irs.gov/instructions/i990
 *   Form 4562  — https://www.irs.gov/instructions/i4562
 *   Form 4797  — https://www.irs.gov/instructions/i4797
 *   Form 8825  — https://www.irs.gov/forms-pubs/about-form-8825
 */

import type { RuleDefinition } from "../models/index.js";
import type { Condition, RuleAction, OnUnknown } from "../engines/RuleEngine.js";

function rule(
  id: string,
  family: string,
  taxYear: number,
  entityScope: string[],
  condition: Condition,
  action: RuleAction,
  onUnknown: OnUnknown,
  citation: { document: string; section: string; text: string }
): RuleDefinition {
  return {
    rule_id: id,
    rule_family: family,
    rule_version: "1.0",
    tax_year: taxYear,
    entity_scope: entityScope,
    jurisdiction_scope: ["US"],
    effective_from: `${taxYear}-01-01`,
    effective_to: null,
    condition_json: condition,
    action_json: action,
    on_unknown_json: onUnknown,
    source_document: citation.document,
    source_section: citation.section,
    source_citation_text: citation.text,
    status: "active",
    created_at: new Date().toISOString(),
    supersedes_rule_id: null,
  };
}

const YEAR = 2024;
const SKIP: OnUnknown = { emit_diagnostic: true, skip_rule: true, diagnostic_severity: "warning" };
const WARN: OnUnknown = { emit_diagnostic: true, skip_rule: false, diagnostic_severity: "warning" };
const ALL_ENTITIES = ["c_corp", "s_corp", "llc_partnership", "partnership", "llc_single", "sole_prop", "nonprofit"];

export const STARTER_RULES: RuleDefinition[] = [

  // ── C-CORPORATION ─────────────────────────────────────────────────────────
  // Every domestic corporation must file Form 1120 (IRC §11; Form 1120 instructions).

  rule(
    "RULE_CCORP_1120",
    "entity_type",
    YEAR,
    ["c_corp"],
    { fact: "entity_type", op: "eq", value: "c_corp" },
    {
      form_code: "1120",
      requirement_status: "required",
      explanation: "All domestic C corporations must file Form 1120 — U.S. Corporation Income Tax Return (IRC §11).",
    },
    SKIP,
    { document: "Form 1120 Instructions", section: "Who Must File", text: "Unless exempt under section 501, all domestic corporations must file Form 1120." }
  ),

  // Schedule L (Balance Sheet) — required for all 1120 filers.
  rule(
    "RULE_CCORP_SCHEDULE_L",
    "balance_sheet",
    YEAR,
    ["c_corp"],
    { fact: "entity_type", op: "eq", value: "c_corp" },
    {
      form_code: "1120",
      schedule_code: "L",
      requirement_status: "required",
      explanation: "Schedule L (Balance Sheet per Books) is required for all Form 1120 filers.",
    },
    SKIP,
    { document: "Form 1120 Instructions", section: "Schedule L", text: "All Form 1120 filers must complete Schedule L." }
  ),

  // Schedule M-1 — required when total assets < $10M (otherwise M-3).
  rule(
    "RULE_CCORP_M1",
    "book_to_tax",
    YEAR,
    ["c_corp"],
    {
      and: [
        { fact: "entity_type", op: "eq", value: "c_corp" },
        { fact: "total_assets", op: "lt", value: 10_000_000 },
      ],
    },
    {
      form_code: "1120",
      schedule_code: "M-1",
      requirement_status: "required",
      explanation: "Schedule M-1 reconciles book income to taxable income. Required when total assets are under $10M.",
    },
    WARN,
    { document: "Form 1120 Instructions", section: "Schedule M-1", text: "Complete Schedule M-1 if total assets are less than $10 million." }
  ),

  // Schedule M-3 — required when total assets ≥ $10M.
  rule(
    "RULE_CCORP_M3",
    "book_to_tax",
    YEAR,
    ["c_corp"],
    {
      and: [
        { fact: "entity_type", op: "eq", value: "c_corp" },
        { fact: "total_assets", op: "gte", value: 10_000_000 },
      ],
    },
    {
      form_code: "1120",
      schedule_code: "M-3",
      requirement_status: "required",
      explanation: "Schedule M-3 is required when total assets are $10 million or more at year-end.",
    },
    WARN,
    { document: "Form 1120 Instructions", section: "Schedule M-3", text: "Corporations with $10 million or more in total assets must file Schedule M-3 instead of M-1." }
  ),

  // Schedule M-2 — required for all 1120 filers (retained earnings reconciliation).
  rule(
    "RULE_CCORP_M2",
    "retained_earnings",
    YEAR,
    ["c_corp"],
    { fact: "entity_type", op: "eq", value: "c_corp" },
    {
      form_code: "1120",
      schedule_code: "M-2",
      requirement_status: "required",
      explanation: "Schedule M-2 (Analysis of Unappropriated Retained Earnings) is required for all Form 1120 filers.",
    },
    SKIP,
    { document: "Form 1120 Instructions", section: "Schedule M-2", text: "All Form 1120 filers must complete Schedule M-2." }
  ),

  // Officer compensation — reported on 1120 Line 12.
  rule(
    "RULE_CCORP_OFFICER_COMP_1125E",
    "compensation",
    YEAR,
    ["c_corp"],
    {
      and: [
        { fact: "entity_type", op: "eq", value: "c_corp" },
        { fact: "officer_compensation_total", op: "gt", value: 0 },
      ],
    },
    {
      form_code: "1125-E",
      requirement_status: "required",
      explanation: "Form 1125-E (Compensation of Officers) is required when officer compensation is claimed on Form 1120 Line 12.",
    },
    WARN,
    { document: "Form 1120 Instructions", section: "Line 12", text: "Corporations that deduct officer compensation must attach Form 1125-E." }
  ),

  // Charitable contributions — limited to 10% of taxable income (IRC §170(b)(2)).
  rule(
    "RULE_CCORP_CHARITABLE",
    "deduction_limitation",
    YEAR,
    ["c_corp"],
    {
      and: [
        { fact: "entity_type", op: "eq", value: "c_corp" },
        { fact: "charitable_contributions_total", op: "gt", value: 0 },
      ],
    },
    {
      form_code: "1120",
      schedule_code: "M-1",
      requirement_status: "required",
      explanation: "Charitable contributions by C corporations are limited to 10% of taxable income (IRC §170(b)(2)). Excess reported on Schedule M-1 Line 5.",
    },
    WARN,
    { document: "IRC §170(b)(2); Form 1120 Instructions", section: "Line 19", text: "C corporation charitable deductions are limited to 10% of taxable income before the deduction." }
  ),

  // Foreign tax credit — Form 1118 (IRC §901).
  rule(
    "RULE_CCORP_FOREIGN_1118",
    "foreign",
    YEAR,
    ["c_corp"],
    {
      and: [
        { fact: "entity_type", op: "eq", value: "c_corp" },
        { fact: "foreign_activity_present", op: "eq", value: true },
      ],
    },
    {
      form_code: "1118",
      requirement_status: "required",
      explanation: "Form 1118 (Foreign Tax Credit) is required when the corporation has foreign income or paid foreign taxes (IRC §901).",
    },
    WARN,
    { document: "IRC §901; Form 1118 Instructions", section: "Who Must File", text: "Corporations claiming a foreign tax credit must file Form 1118." }
  ),

  // ── S-CORPORATION ─────────────────────────────────────────────────────────
  // Must have filed Form 2553 election (IRC §1362).

  rule(
    "RULE_SCORP_1120S",
    "entity_type",
    YEAR,
    ["s_corp"],
    { fact: "entity_type", op: "eq", value: "s_corp" },
    {
      form_code: "1120-S",
      requirement_status: "required",
      explanation: "S corporations must file Form 1120-S — U.S. Income Tax Return for an S Corporation.",
    },
    SKIP,
    { document: "Form 1120-S Instructions", section: "Who Must File", text: "A corporation must file Form 1120-S if it elected S corporation status and the election remains in effect." }
  ),

  rule(
    "RULE_SCORP_K1",
    "k1",
    YEAR,
    ["s_corp"],
    { fact: "entity_type", op: "eq", value: "s_corp" },
    {
      form_code: "1120-S",
      schedule_code: "K-1",
      requirement_status: "required",
      explanation: "One Schedule K-1 per shareholder is required. Reports each shareholder's pro-rata share of income, deductions, and credits.",
    },
    SKIP,
    { document: "Form 1120-S Instructions", section: "Schedule K-1", text: "Each shareholder must receive a Schedule K-1 showing their allocable share items." }
  ),

  rule(
    "RULE_SCORP_M1",
    "book_to_tax",
    YEAR,
    ["s_corp"],
    { fact: "entity_type", op: "eq", value: "s_corp" },
    {
      form_code: "1120-S",
      schedule_code: "M-1",
      requirement_status: "required",
      explanation: "Schedule M-1 reconciles book income to ordinary income on Form 1120-S. Required unless Schedule M-3 is filed.",
    },
    SKIP,
    { document: "Form 1120-S Instructions", section: "Schedule M-1", text: "Complete Schedule M-1 to reconcile book income to tax income." }
  ),

  rule(
    "RULE_SCORP_M2",
    "retained_earnings",
    YEAR,
    ["s_corp"],
    { fact: "entity_type", op: "eq", value: "s_corp" },
    {
      form_code: "1120-S",
      schedule_code: "M-2",
      requirement_status: "required",
      explanation: "Schedule M-2 (Analysis of Accumulated Adjustments Account) is required for all S corporations.",
    },
    SKIP,
    { document: "Form 1120-S Instructions", section: "Schedule M-2", text: "All S corporations must complete Schedule M-2 to track the accumulated adjustments account." }
  ),

  // Officer compensation — reasonable compensation required (IRC §3121(d)(1)).
  rule(
    "RULE_SCORP_OFFICER_COMP",
    "compensation",
    YEAR,
    ["s_corp"],
    {
      and: [
        { fact: "entity_type", op: "eq", value: "s_corp" },
        { fact: "officer_compensation_total", op: "gt", value: 0 },
      ],
    },
    {
      form_code: "1120-S",
      requirement_status: "required",
      explanation: "S-Corp officer-shareholders must receive reasonable W-2 compensation. Reported on Form 1120-S Line 7. IRS may reclassify distributions as wages.",
    },
    WARN,
    { document: "IRC §3121(d)(1); Form 1120-S Instructions", section: "Line 7", text: "Officer shareholders performing services must receive reasonable compensation subject to employment taxes." }
  ),

  // Form 8825 — rental real estate for S-corps.
  rule(
    "RULE_SCORP_RENTAL_8825",
    "rental",
    YEAR,
    ["s_corp"],
    {
      and: [
        { fact: "entity_type", op: "eq", value: "s_corp" },
        { fact: "rental_income_present", op: "eq", value: true },
      ],
    },
    {
      form_code: "8825",
      requirement_status: "required",
      explanation: "Form 8825 (Rental Real Estate Income and Expenses) is required for S corporations with rental real estate activity.",
    },
    WARN,
    { document: "Form 8825 Instructions", section: "Who Must File", text: "Partnerships and S corporations use Form 8825 to report rental real estate income and expenses." }
  ),

  // ── PARTNERSHIP / MULTI-MEMBER LLC ─────────────────────────────────────────

  rule(
    "RULE_PARTNERSHIP_1065",
    "entity_type",
    YEAR,
    ["llc_partnership", "partnership"],
    {
      or: [
        { fact: "entity_type", op: "eq", value: "llc_partnership" },
        { fact: "entity_type", op: "eq", value: "partnership" },
      ],
    },
    {
      form_code: "1065",
      requirement_status: "required",
      explanation: "Every domestic partnership must file Form 1065 — U.S. Return of Partnership Income (IRC §6031).",
    },
    SKIP,
    { document: "Form 1065 Instructions", section: "Who Must File", text: "Every domestic partnership must file Form 1065 unless it neither receives income nor incurs deductible expenditures." }
  ),

  rule(
    "RULE_PARTNERSHIP_K1",
    "k1",
    YEAR,
    ["llc_partnership", "partnership"],
    {
      or: [
        { fact: "entity_type", op: "eq", value: "llc_partnership" },
        { fact: "entity_type", op: "eq", value: "partnership" },
      ],
    },
    {
      form_code: "1065",
      schedule_code: "K-1",
      requirement_status: "required",
      explanation: "One Schedule K-1 per partner is required, reporting each partner's distributive share of income, deductions, credits, and other items (IRC §6031(b)).",
    },
    SKIP,
    { document: "IRC §6031(b); Form 1065 Instructions", section: "Schedule K-1", text: "The partnership must furnish a copy of Schedule K-1 to each partner." }
  ),

  rule(
    "RULE_PARTNERSHIP_M1",
    "book_to_tax",
    YEAR,
    ["llc_partnership", "partnership"],
    {
      or: [
        { fact: "entity_type", op: "eq", value: "llc_partnership" },
        { fact: "entity_type", op: "eq", value: "partnership" },
      ],
    },
    {
      form_code: "1065",
      schedule_code: "M-1",
      requirement_status: "required",
      explanation: "Schedule M-1 reconciles book income to tax return income. Required unless Schedule M-3 is filed.",
    },
    SKIP,
    { document: "Form 1065 Instructions", section: "Schedule M-1", text: "Complete Schedule M-1 unless filing Schedule M-3." }
  ),

  rule(
    "RULE_PARTNERSHIP_M2",
    "capital_accounts",
    YEAR,
    ["llc_partnership", "partnership"],
    {
      or: [
        { fact: "entity_type", op: "eq", value: "llc_partnership" },
        { fact: "entity_type", op: "eq", value: "partnership" },
      ],
    },
    {
      form_code: "1065",
      schedule_code: "M-2",
      requirement_status: "required",
      explanation: "Schedule M-2 analyzes changes in partners' capital accounts during the year.",
    },
    SKIP,
    { document: "Form 1065 Instructions", section: "Schedule M-2", text: "All partnerships must complete Schedule M-2 to report analysis of partners' capital accounts." }
  ),

  // Form 8825 — rental real estate for partnerships.
  rule(
    "RULE_PARTNERSHIP_RENTAL_8825",
    "rental",
    YEAR,
    ["llc_partnership", "partnership"],
    {
      and: [
        {
          or: [
            { fact: "entity_type", op: "eq", value: "llc_partnership" },
            { fact: "entity_type", op: "eq", value: "partnership" },
          ],
        },
        { fact: "rental_income_present", op: "eq", value: true },
      ],
    },
    {
      form_code: "8825",
      requirement_status: "required",
      explanation: "Form 8825 reports rental real estate income and expenses for partnerships.",
    },
    WARN,
    { document: "Form 8825 Instructions", section: "Who Must File", text: "Partnerships use Form 8825 to report income and deductible expenses from rental real estate activities." }
  ),

  // ── SOLE PROPRIETOR / SINGLE-MEMBER LLC ───────────────────────────────────

  rule(
    "RULE_SOLEPROP_SCHEDULE_C",
    "entity_type",
    YEAR,
    ["llc_single", "sole_prop"],
    {
      or: [
        { fact: "entity_type", op: "eq", value: "llc_single" },
        { fact: "entity_type", op: "eq", value: "sole_prop" },
      ],
    },
    {
      form_code: "Schedule C",
      requirement_status: "required",
      explanation: "Sole proprietors and single-member LLCs report business income on Schedule C of Form 1040.",
    },
    SKIP,
    { document: "Schedule C Instructions", section: "Who Must File", text: "Use Schedule C to report income or loss from a business operated as a sole proprietor." }
  ),

  // Schedule SE — net self-employment income ≥ $400 (IRC §1401).
  rule(
    "RULE_SOLEPROP_SCHEDULE_SE",
    "se_tax",
    YEAR,
    ["llc_single", "sole_prop"],
    {
      and: [
        {
          or: [
            { fact: "entity_type", op: "eq", value: "llc_single" },
            { fact: "entity_type", op: "eq", value: "sole_prop" },
          ],
        },
        { fact: "net_income_before_tax", op: "gte", value: 400 },
      ],
    },
    {
      form_code: "Schedule SE",
      requirement_status: "required",
      explanation: "Schedule SE is required when net self-employment earnings are $400 or more. SE tax rate is 15.3% up to the Social Security wage base.",
    },
    WARN,
    { document: "Schedule SE Instructions; IRC §1401", section: "Who Must File", text: "File Schedule SE if net self-employment earnings (line 4c) are $400 or more." }
  ),

  // Meals deduction — 50% limitation (IRC §274(n)) — all entities.
  rule(
    "RULE_MEALS_50PCT",
    "deduction_limitation",
    YEAR,
    ALL_ENTITIES,
    { fact: "meals_subject_to_limitation_total", op: "gt", value: 0 },
    {
      form_code: "Schedule C",
      requirement_status: "possible",
      explanation: "Meals expense is subject to 50% limitation under IRC §274(n). Schedule C Line 24b for sole props; Schedule M-1 Line 4b for corps.",
    },
    WARN,
    { document: "IRC §274(n)(1); Schedule C Instructions", section: "Line 24b", text: "Only 50% of otherwise deductible meals expense is allowed." }
  ),

  // ── NONPROFIT ─────────────────────────────────────────────────────────────

  // Form 990 — gross receipts ≥ $200,000 OR total assets ≥ $500,000.
  rule(
    "RULE_NONPROFIT_990",
    "entity_type",
    YEAR,
    ["nonprofit"],
    {
      and: [
        { fact: "entity_type", op: "eq", value: "nonprofit" },
        {
          or: [
            { fact: "gross_receipts_total", op: "gte", value: 200_000 },
            { fact: "total_assets", op: "gte", value: 500_000 },
          ],
        },
      ],
    },
    {
      form_code: "990",
      requirement_status: "required",
      explanation: "Form 990 is required for 501(c)(3) organizations with gross receipts ≥ $200,000 or total assets ≥ $500,000.",
    },
    WARN,
    { document: "Form 990 Instructions", section: "Filing Thresholds", text: "Organizations with gross receipts ≥ $200,000 or total assets ≥ $500,000 must file Form 990." }
  ),

  // Form 990-EZ — gross receipts < $200,000 AND total assets < $500,000.
  rule(
    "RULE_NONPROFIT_990EZ",
    "entity_type",
    YEAR,
    ["nonprofit"],
    {
      and: [
        { fact: "entity_type", op: "eq", value: "nonprofit" },
        { fact: "gross_receipts_total", op: "lt", value: 200_000 },
        { fact: "total_assets", op: "lt", value: 500_000 },
        { fact: "gross_receipts_total", op: "gt", value: 50_000 },
      ],
    },
    {
      form_code: "990-EZ",
      requirement_status: "required",
      explanation: "Form 990-EZ may be filed by organizations with gross receipts < $200,000 AND total assets < $500,000 (but gross receipts > $50,000).",
    },
    WARN,
    { document: "Form 990 Instructions", section: "Filing Thresholds", text: "Organizations with gross receipts < $200,000 and total assets < $500,000 may file Form 990-EZ." }
  ),

  // Form 990-N — gross receipts ≤ $50,000.
  rule(
    "RULE_NONPROFIT_990N",
    "entity_type",
    YEAR,
    ["nonprofit"],
    {
      and: [
        { fact: "entity_type", op: "eq", value: "nonprofit" },
        { fact: "gross_receipts_total", op: "lte", value: 50_000 },
      ],
    },
    {
      form_code: "990-N",
      requirement_status: "required",
      explanation: "Organizations with gross receipts of $50,000 or less may file Form 990-N (e-Postcard) instead of Form 990 or 990-EZ.",
    },
    WARN,
    { document: "Form 990 Instructions", section: "Filing Thresholds", text: "Organizations with gross receipts of $50,000 or less may file Form 990-N." }
  ),

  // Schedule A — all 501(c)(3) public charities.
  rule(
    "RULE_NONPROFIT_SCHEDULE_A",
    "public_support",
    YEAR,
    ["nonprofit"],
    { fact: "entity_type", op: "eq", value: "nonprofit" },
    {
      form_code: "990",
      schedule_code: "A",
      requirement_status: "required",
      explanation: "Schedule A (Public Charity Status and Public Support) is required for all 501(c)(3) organizations. Reports public support percentage.",
    },
    SKIP,
    { document: "Form 990 Schedule A Instructions", section: "Who Must File", text: "All 501(c)(3) organizations answering 'Yes' on Form 990 Part IV Line 1 must complete Schedule A." }
  ),

  // ── CROSS-ENTITY RULES ────────────────────────────────────────────────────

  // Form 4562 — depreciation; required when depreciable assets present.
  // Also required on any corporate return (not 1120-S) regardless of asset placement.
  rule(
    "RULE_DEPRECIATION_4562",
    "depreciation",
    YEAR,
    ALL_ENTITIES,
    { fact: "has_depreciable_assets", op: "eq", value: true },
    {
      form_code: "4562",
      requirement_status: "required",
      explanation: "Form 4562 is required when claiming depreciation, Section 179 expensing, or bonus depreciation. Section 179 limit: $1,160,000 (2023); phase-out at $2,890,000.",
    },
    WARN,
    { document: "Form 4562 Instructions", section: "Who Must File", text: "File Form 4562 if claiming depreciation for property placed in service, Section 179 deduction, or depreciation on vehicles or listed property." }
  ),

  // Form 4797 — sale of business property / depreciation recapture.
  rule(
    "RULE_ASSET_SALE_4797",
    "asset_sale",
    YEAR,
    ALL_ENTITIES,
    { fact: "has_asset_sales", op: "eq", value: true },
    {
      form_code: "4797",
      requirement_status: "required",
      explanation: "Form 4797 (Sales of Business Property) is required for sale or exchange of business property, involuntary conversions, and depreciation recapture under §§1245/1250.",
    },
    WARN,
    { document: "Form 4797 Instructions", section: "Who Must File", text: "File Form 4797 for sales/exchanges of property used in trade or business, including depreciation recapture." }
  ),

  // Form 1125-A — Cost of Goods Sold; required when COGS is claimed.
  rule(
    "RULE_COGS_1125A",
    "cogs",
    YEAR,
    ["c_corp", "s_corp", "llc_partnership", "partnership"],
    {
      and: [
        {
          or: [
            { fact: "entity_type", op: "eq", value: "c_corp" },
            { fact: "entity_type", op: "eq", value: "s_corp" },
            { fact: "entity_type", op: "eq", value: "llc_partnership" },
            { fact: "entity_type", op: "eq", value: "partnership" },
          ],
        },
        { fact: "cogs_total", op: "gt", value: 0 },
      ],
    },
    {
      form_code: "1125-A",
      requirement_status: "required",
      explanation: "Form 1125-A (Cost of Goods Sold) must be attached to Form 1120, 1120-S, or 1065 when cost of goods sold is deducted.",
    },
    WARN,
    { document: "Form 1120 Instructions; Form 1065 Instructions", section: "Cost of Goods Sold", text: "Attach Form 1125-A when deducting cost of goods sold." }
  ),

  // Interest expense — Form 8990 limitation may apply when interest expense is significant.
  rule(
    "RULE_INTEREST_LIMITATION_8990",
    "deduction_limitation",
    YEAR,
    ["c_corp", "s_corp", "llc_partnership", "partnership"],
    {
      and: [
        {
          or: [
            { fact: "entity_type", op: "eq", value: "c_corp" },
            { fact: "entity_type", op: "eq", value: "s_corp" },
            { fact: "entity_type", op: "eq", value: "llc_partnership" },
            { fact: "entity_type", op: "eq", value: "partnership" },
          ],
        },
        { fact: "interest_income_total", op: "gt", value: 0 },
      ],
    },
    {
      form_code: "8990",
      requirement_status: "possible",
      explanation: "Form 8990 (Limitation on Business Interest Expense) may be required under IRC §163(j) when business interest expense exceeds 30% of adjusted taxable income.",
    },
    WARN,
    { document: "IRC §163(j); Form 8990 Instructions", section: "Who Must File", text: "Taxpayers with business interest expense may need to limit it to 30% of ATI under IRC §163(j)." }
  ),
];
