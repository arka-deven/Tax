import { createClient } from "@supabase/supabase-js";
import type { Database } from "./db-types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

// Service-role client — server-side only, never exposed to the browser.
export const db = createClient<Database>(url, key, {
  auth: { persistSession: false },
});
