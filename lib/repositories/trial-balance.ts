import { db } from "@/lib/db";
import type { TaxAdjustment, TrialBalanceLine } from "@/src/models";

// ── Trial balance lines ───────────────────────────────────────────────────────

export async function upsertTrialBalanceLines(lines: TrialBalanceLine[]) {
  if (lines.length === 0) return;
  const { error } = await db.from("trial_balance_lines").upsert(lines as never[]);
  if (error) throw error;
}

export async function getTrialBalanceLines(entityId: string, taxYear: number): Promise<TrialBalanceLine[]> {
  const { data, error } = await db
    .from("trial_balance_lines")
    .select("*")
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear);
  if (error) throw error;
  return data as unknown as TrialBalanceLine[];
}

// ── Tax adjustments ───────────────────────────────────────────────────────────

export async function upsertAdjustments(adjustments: TaxAdjustment[]) {
  if (adjustments.length === 0) return;
  const { error } = await db.from("tax_adjustments").upsert(adjustments as never[]);
  if (error) throw error;
}

export async function getAdjustments(entityId: string, taxYear: number): Promise<TaxAdjustment[]> {
  const { data, error } = await db
    .from("tax_adjustments")
    .select("*")
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear);
  if (error) throw error;
  return data as unknown as TaxAdjustment[];
}
