import { createClient } from "@supabase/supabase-js";
import type { Database } from "./db-types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Service-role client — server-side only, never exposed to the browser.
// If env vars are missing, DB calls will fail gracefully at call-time instead of crashing on import.
export const db = createClient<Database>(url || "https://placeholder.supabase.co", key || "placeholder", {
  auth: { persistSession: false },
});

export const dbConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
