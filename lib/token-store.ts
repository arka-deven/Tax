// Persistent token store backed by Supabase — works on serverless (Vercel/Lambda).
import { db } from "./db";

export const tokenStore = {
  async get(entityId: string): Promise<unknown | undefined> {
    const { data } = await db
      .from("qbo_tokens")
      .select("token_json")
      .eq("entity_id", entityId)
      .single();
    return (data as { token_json?: unknown } | null)?.token_json ?? undefined;
  },

  async has(entityId: string): Promise<boolean> {
    const { data } = await db
      .from("qbo_tokens")
      .select("entity_id")
      .eq("entity_id", entityId)
      .single();
    return !!data;
  },

  async set(entityId: string, token: unknown): Promise<void> {
    await db.from("qbo_tokens").upsert(
      { entity_id: entityId, token_json: token, updated_at: new Date().toISOString() } as never,
      { onConflict: "entity_id" },
    );
  },

  async delete(entityId: string): Promise<void> {
    await db.from("qbo_tokens").delete().eq("entity_id", entityId);
  },
};

export const realmStore = {
  async get(entityId: string): Promise<string | undefined> {
    const { data } = await db
      .from("qbo_tokens")
      .select("realm_id")
      .eq("entity_id", entityId)
      .single();
    return (data as { realm_id?: string | null } | null)?.realm_id ?? undefined;
  },

  async set(entityId: string, realmId: string): Promise<void> {
    await db
      .from("qbo_tokens")
      .update({ realm_id: realmId, updated_at: new Date().toISOString() } as never)
      .eq("entity_id", entityId);
  },

  async delete(entityId: string): Promise<void> {
    await db.from("qbo_tokens").update({ realm_id: null } as never).eq("entity_id", entityId);
  },
};
