import { db } from "@/lib/db";
import type {
  Diagnostic,
  FormRequirement,
  TaxCodeMapping,
  TaxFact,
} from "@/src/models";

// ── Tax code mappings ─────────────────────────────────────────────────────────

export async function upsertMappings(mappings: TaxCodeMapping[]) {
  if (mappings.length === 0) return;
  const { error } = await db.from("tax_code_mappings").upsert(mappings);
  if (error) throw error;
}

export async function getMappings(entityId: string, taxYear: number): Promise<TaxCodeMapping[]> {
  const { data, error } = await db
    .from("tax_code_mappings")
    .select("*")
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear);
  if (error) throw error;
  return data as unknown as TaxCodeMapping[];
}

// ── Tax facts ─────────────────────────────────────────────────────────────────

export async function upsertFacts(facts: TaxFact[]) {
  if (facts.length === 0) return;
  const { error } = await db
    .from("tax_facts")
    .upsert(facts, { onConflict: "entity_id,tax_year,fact_name" });
  if (error) throw error;
}

export async function getFacts(entityId: string, taxYear: number): Promise<TaxFact[]> {
  const { data, error } = await db
    .from("tax_facts")
    .select("*")
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear);
  if (error) throw error;
  return data as unknown as TaxFact[];
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export async function replaceDiagnostics(entityId: string, taxYear: number, diagnostics: Diagnostic[]) {
  // Delete stale open diagnostics then insert fresh ones
  await db
    .from("diagnostics")
    .delete()
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear)
    .eq("resolution_status", "open");

  if (diagnostics.length === 0) return;
  const { error } = await db.from("diagnostics").insert(diagnostics);
  if (error) throw error;
}

export async function getDiagnostics(entityId: string, taxYear: number): Promise<Diagnostic[]> {
  const { data, error } = await db
    .from("diagnostics")
    .select("*")
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear);
  if (error) throw error;
  return data as unknown as Diagnostic[];
}

// ── Form requirements ─────────────────────────────────────────────────────────

export async function upsertFormRequirements(requirements: FormRequirement[]) {
  if (requirements.length === 0) return;
  const { error } = await db.from("form_requirements").upsert(requirements);
  if (error) throw error;
}

export async function getFormRequirements(entityId: string, taxYear: number): Promise<FormRequirement[]> {
  const { data, error } = await db
    .from("form_requirements")
    .select("*")
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear);
  if (error) throw error;
  return data as unknown as FormRequirement[];
}
