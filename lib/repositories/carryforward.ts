import { db } from "@/lib/db";

export interface CarryforwardItem {
  carryforward_id: string;
  entity_id: string;
  tax_year_originated: number;
  carryforward_type: string; // nol, capital_loss, charitable, section_179, interest_163j
  original_amount: number;
  remaining_amount: number;
  expiration_year: number | null;
}

export async function getCarryforwards(entityId: string): Promise<CarryforwardItem[]> {
  const { data, error } = await db
    .from("carryforward_items")
    .select("*")
    .eq("entity_id", entityId)
    .gt("remaining_amount", 0)
    .order("tax_year_originated", { ascending: true });
  if (error) { console.warn("Failed to load carryforwards:", error.message); return []; }
  return (data ?? []) as CarryforwardItem[];
}

export async function upsertCarryforward(item: CarryforwardItem): Promise<void> {
  const { error } = await db.from("carryforward_items").upsert(item as never, { onConflict: "carryforward_id" });
  if (error) console.warn("Failed to upsert carryforward:", error.message);
}
