// @ts-expect-error intuit-oauth ships no type declarations
import OAuthClient from "intuit-oauth";
import { tokenStore, realmStore } from "@/lib/token-store";

export function makeOAuthClient() {
  return new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID ?? "",
    clientSecret: process.env.QBO_CLIENT_SECRET ?? "",
    environment: process.env.QBO_ENV ?? "sandbox",
    redirectUri:
      process.env.QBO_REDIRECT_URI ??
      "http://localhost:3001/api/auth/qbo/callback",
  });
}

/**
 * Returns a valid OAuthClient with a refreshed token for the given entity.
 * Throws if the entity has no stored token.
 */
export async function getClientForEntity(entityId: string) {
  const token = tokenStore.get(entityId);
  if (!token) throw new Error(`No QBO token for entity ${entityId}`);

  const client = makeOAuthClient();
  client.setToken(token);

  if (client.isAccessTokenValid()) return client;

  // Token expired — refresh it
  try {
    const refreshed = await client.refresh();
    tokenStore.set(entityId, refreshed.getToken());
    return client;
  } catch (err) {
    // Refresh token also expired — force re-auth
    tokenStore.delete(entityId);
    realmStore.delete(entityId);
    throw new Error(`QBO token expired for entity ${entityId} — re-auth required`);
  }
}
