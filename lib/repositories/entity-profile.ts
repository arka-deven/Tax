import { db } from "@/lib/db";

export interface EntityProfile {
  entity_id: string;
  legal_name: string | null;
  dba_name: string | null;
  entity_type: string | null;
  ein: string | null;
  state_of_incorporation: string | null;
  date_incorporated: string | null;
  business_start_date: string | null;
  s_election_date: string | null;
  naics_code: string | null;
  principal_business_activity: string | null;
  principal_product_service: string | null;
  accounting_method: string;
  fiscal_year_end_month: number;
  inventory_method: string;
  number_of_shareholders: number | null;
  number_of_partners: number | null;
  tax_exempt_status: string | null;
  website_url: string | null;
  home_office_sqft: number | null;
  home_total_sqft: number | null;
  prior_year_nol_carryforward: number;
  prior_year_capital_loss_cf: number;
  prior_year_charitable_cf: number;
  prior_year_179_carryover: number;
}

export interface EntityOwner {
  owner_id: string;
  entity_id: string;
  owner_name: string;
  owner_tin: string | null;
  owner_type: string;
  ownership_pct: number;
  profit_share_pct: number | null;
  loss_share_pct: number | null;
  is_managing: boolean;
  address_line1: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
}

export async function getEntityProfile(entityId: string): Promise<EntityProfile | null> {
  const { data, error } = await db
    .from("entity_profiles")
    .select("*")
    .eq("entity_id", entityId)
    .maybeSingle();
  if (error) { console.warn("Failed to load entity profile:", error.message); return null; }
  return data as EntityProfile | null;
}

export async function upsertEntityProfile(profile: Partial<EntityProfile> & { entity_id: string }): Promise<void> {
  const { error } = await db
    .from("entity_profiles")
    .upsert({ ...profile, updated_at: new Date().toISOString() } as never, { onConflict: "entity_id" });
  if (error) throw error;
}

export async function getEntityOwners(entityId: string): Promise<EntityOwner[]> {
  const { data, error } = await db
    .from("entity_owners")
    .select("*")
    .eq("entity_id", entityId)
    .order("ownership_pct", { ascending: false });
  if (error) { console.warn("Failed to load entity owners:", error.message); return []; }
  return (data ?? []) as EntityOwner[];
}
