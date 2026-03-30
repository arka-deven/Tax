import { NextRequest, NextResponse } from "next/server";
// @ts-expect-error intuit-oauth ships no type declarations
import OAuthClient from "intuit-oauth";
import { makeOAuthClient } from "@/lib/qbo-client";

export async function GET(request: NextRequest) {
  const entityId = request.nextUrl.searchParams.get("entityId");
  if (!entityId)
    return NextResponse.json({ error: "entityId required" }, { status: 400 });

  const client = makeOAuthClient();

  const authUri: string = client.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: entityId,
  });

  return NextResponse.redirect(authUri);
}
