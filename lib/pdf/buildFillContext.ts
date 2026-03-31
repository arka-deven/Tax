import type { FillContext, OfficerInfo, OwnerInfo } from "./types";

/**
 * Build a FillContext from database query results.
 *
 * This is the single bridge between DB tables and the PDF filler.
 * Each data source maps to a specific part of the context:
 *
 *   tax_facts        → ctx.facts       (all factName→value pairs)
 *   entity_profiles  → ctx.meta.*      (company name, EIN, address, etc.)
 *   entity_officers  → ctx.meta.officers[]
 *   entity_owners    → ctx.meta.owners[]
 *   schedule_b_answers → ctx.meta.scheduleBAnswers
 */

interface EntityProfile {
  legal_name?: string;
  dba_name?: string;
  ein?: string;
  entity_type?: string;
  accounting_method?: string;
  state_of_incorporation?: string;
  date_incorporated?: string;
  s_election_date?: string;
  business_start_date?: string;
  naics_code?: string;
  principal_business_activity?: string;
  principal_product_service?: string;
  fiscal_year_end_month?: number;
  number_of_shareholders?: number;
  number_of_partners?: number;
  tax_exempt_status?: string;
  website_url?: string;
  inventory_method?: string;
  home_office_sqft?: number;
  home_total_sqft?: number;
  // Address (may come from QBO CompanyInfo or entity_profiles)
  address_line1?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
}

interface TaxFactRow {
  fact_name: string;
  fact_value_json: unknown;
}

interface OfficerRow {
  name: string;
  ssn?: string;
  title?: string;
  percent_of_time: number;
  percent_of_stock: number;
  compensation: number;
  is_common_stock?: boolean;
}

interface OwnerRow {
  owner_id: string;
  owner_name: string;
  owner_tin?: string;
  owner_type?: string;
  ownership_pct: number;
  profit_share_pct: number;
  loss_share_pct: number;
  address_line1?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  is_managing?: boolean;
}

interface ScheduleBRow {
  question_number: string;
  answer_value: string;
}

/**
 * Assemble a FillContext from raw DB query results.
 *
 * Usage:
 * ```ts
 * const ctx = buildFillContext({
 *   taxYear: 2024,
 *   profile: entityProfileRow,
 *   facts: taxFactRows,
 *   officers: officerRows,
 *   owners: ownerRows,
 *   scheduleBAnswers: scheduleBRows,
 * });
 * ```
 */
export function buildFillContext(params: {
  taxYear: number;
  profile: EntityProfile;
  facts: TaxFactRow[];
  officers?: OfficerRow[];
  owners?: OwnerRow[];
  scheduleBAnswers?: ScheduleBRow[];
}): FillContext {
  const { taxYear, profile, facts, officers, owners, scheduleBAnswers } = params;

  // Build facts record
  const factsRecord: Record<string, unknown> = {};
  for (const row of facts) {
    factsRecord[row.fact_name] = row.fact_value_json;
  }

  // Build officers array
  const officerInfos: OfficerInfo[] = (officers ?? []).map((o) => ({
    name: o.name,
    ssn: o.ssn,
    title: o.title,
    percentTime: o.percent_of_time,
    percentStock: o.percent_of_stock,
    compensation: o.compensation,
    isCommonStock: o.is_common_stock,
  }));

  // Build owners array
  const ownerInfos: OwnerInfo[] = (owners ?? []).map((o) => ({
    ownerId: o.owner_id,
    ownerName: o.owner_name,
    tin: o.owner_tin,
    ownerType: o.owner_type,
    ownershipPct: o.ownership_pct,
    profitSharePct: o.profit_share_pct,
    lossSharePct: o.loss_share_pct,
    address: o.address_line1,
    city: o.address_city,
    state: o.address_state,
    zip: o.address_zip,
    isManaging: o.is_managing,
  }));

  // Build schedule B answers
  const sbAnswers: Record<string, string> = {};
  for (const row of scheduleBAnswers ?? []) {
    sbAnswers[row.question_number] = row.answer_value;
  }

  return {
    facts: factsRecord,
    meta: {
      companyName: profile.legal_name ?? profile.dba_name,
      dbaName: profile.dba_name,
      ein: profile.ein,
      address: profile.address_line1,
      city: profile.address_city,
      state: profile.address_state ?? profile.state_of_incorporation,
      zip: profile.address_zip,
      taxYear,
      entityType: profile.entity_type,
      accountingMethod: profile.accounting_method,
      dateIncorporated: profile.date_incorporated,
      sElectionDate: profile.s_election_date,
      businessStartDate: profile.business_start_date,
      naicsCode: profile.naics_code,
      principalBusinessActivity: profile.principal_business_activity,
      principalProductService: profile.principal_product_service,
      fiscalYearEndMonth: profile.fiscal_year_end_month,
      numberOfShareholders: profile.number_of_shareholders,
      numberOfPartners: profile.number_of_partners,
      taxExemptStatus: profile.tax_exempt_status,
      websiteUrl: profile.website_url,
      inventoryMethod: profile.inventory_method,
      homeOfficeSqft: profile.home_office_sqft,
      homeTotalSqft: profile.home_total_sqft,
      officers: officerInfos,
      owners: ownerInfos,
      scheduleBAnswers: sbAnswers,
    },
  };
}
