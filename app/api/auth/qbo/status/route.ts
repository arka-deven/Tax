import { NextRequest, NextResponse } from "next/server";
import { tokenStore, realmStore } from "@/lib/token-store";
import { getClientForEntity } from "@/lib/qbo-client";

export async function GET(request: NextRequest) {
  const entityId = request.nextUrl.searchParams.get("entityId");
  if (!entityId)
    return NextResponse.json({ error: "entityId required" }, { status: 400 });

  const connected = tokenStore.has(entityId);
  const realmId = realmStore.get(entityId) ?? null;

  if (!connected || !realmId) {
    return NextResponse.json({ entityId, connected: false, realmId: null });
  }

  // Token exists on disk — report connected.
  // Try to fetch company info, but don't fail the connection check if QBO is unreachable.
  let companyName = "";
  let ein = "";
  try {
    const client = await getClientForEntity(entityId);
    const base =
      process.env.QBO_ENV === "production"
        ? "https://quickbooks.api.intuit.com"
        : "https://sandbox-quickbooks.api.intuit.com";

    const url = `${base}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`;
    const response = await client.makeApiCall({ url, method: "GET" });
    const body = (typeof response.getJson === "function" ? response.getJson() : response.json) as {
      CompanyInfo?: { CompanyName?: string; LegalName?: string; FederalEin?: string };
    };
    companyName = body.CompanyInfo?.LegalName ?? body.CompanyInfo?.CompanyName ?? "";
    ein = body.CompanyInfo?.FederalEin ?? "";
  } catch (err) {
    // Check if this is a hard auth failure (refresh token expired) vs transient error
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("re-auth required") || !tokenStore.has(entityId)) {
      // Token was deleted by getClientForEntity — truly disconnected
      return NextResponse.json({ entityId, connected: false, realmId: null });
    }
    // Transient error (network, sandbox down) — still connected, just can't fetch info
    console.warn("[status] QBO API call failed but token exists, reporting connected:", msg);
  }

  return NextResponse.json({ entityId, connected: true, realmId, companyName, ein });
}
