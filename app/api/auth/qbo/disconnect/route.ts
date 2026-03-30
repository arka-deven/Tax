import { NextRequest, NextResponse } from "next/server";
import { getClientForEntity } from "@/lib/qbo-client";
import { tokenStore, realmStore } from "@/lib/token-store";

export async function POST(request: NextRequest) {
  const { entityId } = (await request.json()) as { entityId?: string };
  if (!entityId)
    return NextResponse.json({ error: "entityId required" }, { status: 400 });

  try {
    const client = await getClientForEntity(entityId);
    await client.revoke();
  } catch {
    // Token may already be invalid — still clean up local state
  }

  tokenStore.delete(entityId);
  realmStore.delete(entityId);

  return NextResponse.json({ disconnected: true });
}
