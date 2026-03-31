import { NextRequest, NextResponse } from "next/server";
import { makeOAuthClient } from "@/lib/qbo-client";
import { tokenStore, realmStore } from "@/lib/token-store";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const entityId = searchParams.get("state") ?? "";
  const realmId = searchParams.get("realmId") ?? "";

  if (!entityId)
    return NextResponse.redirect(new URL("/auth/qbo/connected?error=missing_state", request.url));

  const client = makeOAuthClient();

  try {
    await client.createToken(request.url);
    await tokenStore.set(entityId, client.getToken());
    if (realmId) await realmStore.set(entityId, realmId);
  } catch (err) {
    console.error("QBO OAuth callback error:", err);
    return NextResponse.redirect(new URL("/auth/qbo/connected?error=oauth_failed", request.url));
  }

  // Fetch company name from QBO CompanyInfo
  let companyName = "";
  let ein = "";
  if (realmId) {
    try {
      const base =
        process.env.QBO_ENV === "production"
          ? "https://quickbooks.api.intuit.com"
          : "https://sandbox-quickbooks.api.intuit.com";

      const url = `${base}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`;
      const response = await client.makeApiCall({ url, method: "GET" });
      const body = (typeof response.getJson === "function" ? response.getJson() : response.json) as { CompanyInfo?: { CompanyName?: string; LegalName?: string; FederalEin?: string } };
      companyName = body.CompanyInfo?.LegalName ?? body.CompanyInfo?.CompanyName ?? "";
      ein = body.CompanyInfo?.FederalEin ?? "";
    } catch {
      // non-fatal — company name stays empty
    }
  }

  const params = new URLSearchParams({ entityId });
  if (companyName) params.set("companyName", companyName);
  if (ein) params.set("ein", ein);

  return NextResponse.redirect(
    new URL(`/auth/qbo/connected?${params.toString()}`, request.url),
  );
}
