import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseSecret, supabaseUrl } from "./env";

let client: SupabaseClient | undefined;

/**
 * Service-role client. Bypasses RLS. Use only for the device API,
 * cron/jobs, and admin provisioning (`auth.admin`).
 */
export function supabaseAdmin(): SupabaseClient {
  if (client) return client;

  client = createClient(supabaseUrl(), supabaseSecret(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return client;
}
