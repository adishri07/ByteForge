// Server-side database connection. NEVER import this in browser ("use client") code:
// the secret key has full access to the database.
// Owner: Member 3
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
