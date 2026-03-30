import { db } from "@/lib/db";

export interface CapitalTransaction {
  transaction_id: string;
  entity_id: string;
  tax_year: number;
  description: string;
  date_acquired: string | null;
  date_sold: string;
  proceeds: number;
  cost_basis: number;
  gain_loss: number;
  holding_period: "short_term" | "long_term";
  form_8949_box: string;
}

export async function getCapitalTransactions(entityId: string, taxYear: number): Promise<CapitalTransaction[]> {
  const { data, error } = await db
    .from("capital_transactions")
    .select("*")
    .eq("entity_id", entityId)
    .eq("tax_year", taxYear)
    .order("date_sold", { ascending: true });
  if (error) { console.warn("Failed to load capital transactions:", error.message); return []; }
  return (data ?? []) as CapitalTransaction[];
}
