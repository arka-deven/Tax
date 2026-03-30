import { NextRequest, NextResponse } from "next/server";
import { tokenStore, realmStore } from "@/lib/token-store";

export async function GET(request: NextRequest) {
  const entityId = request.nextUrl.searchParams.get("entityId");
  if (!entityId)
    return NextResponse.json({ error: "entityId required" }, { status: 400 });

  const connected = tokenStore.has(entityId);
  const realmId = realmStore.get(entityId) ?? null;

  return NextResponse.json({ entityId, connected, realmId });
}
