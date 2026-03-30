import { db } from "@/lib/db";
import type { CanonicalLedgerAccount, CanonicalLedgerEntry } from "@/src/models";

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function upsertAccounts(accounts: CanonicalLedgerAccount[]) {
  if (accounts.length === 0) return;
  const { error } = await db.from("canonical_ledger_accounts").upsert(accounts as never[]);
  if (error) throw error;
}

export async function getAccounts(entityId: string): Promise<CanonicalLedgerAccount[]> {
  const { data, error } = await db
    .from("canonical_ledger_accounts")
    .select("*")
    .eq("entity_id", entityId);
  if (error) throw error;
  return data as unknown as CanonicalLedgerAccount[];
}

export async function getAccountTypeMap(entityId: string): Promise<Map<string, string>> {
  const accounts = await getAccounts(entityId);
  return new Map(accounts.map((a) => [a.canonical_account_id, a.account_type]));
}

export async function getAccountSubtypeMap(entityId: string): Promise<Map<string, string>> {
  const accounts = await getAccounts(entityId);
  return new Map(accounts.map((a) => [a.canonical_account_id, a.account_subtype]));
}

// ── Entries ───────────────────────────────────────────────────────────────────

export async function upsertEntries(entries: CanonicalLedgerEntry[]) {
  if (entries.length === 0) return;
  // Insert in batches of 500 to stay within Supabase limits
  for (let i = 0; i < entries.length; i += 500) {
    const batch = entries.slice(i, i + 500);
    const { error } = await db.from("canonical_ledger_entries").upsert(batch as never[]);
    if (error) throw error;
  }
}

export async function getEntries(entityId: string, taxYear: number): Promise<CanonicalLedgerEntry[]> {
  const { data, error } = await db
    .from("canonical_ledger_entries")
    .select("*")
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear);
  if (error) throw error;
  return data as unknown as CanonicalLedgerEntry[];
}
