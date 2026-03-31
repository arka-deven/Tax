import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Return all connected QBO entities (id + realm_id) from Supabase. */
export async function GET() {
  const { data, error } = await db
    .from("qbo_tokens")
    .select("entity_id, realm_id")
    .not("realm_id", "is", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[connections] Supabase error:", error.message);
    return NextResponse.json({ entities: [] });
  }

  const rows = data as { entity_id: string; realm_id: string }[] | null;
  return NextResponse.json({
    entities: (rows ?? []).map((r) => ({ entityId: r.entity_id, realmId: r.realm_id })),
  });
}
