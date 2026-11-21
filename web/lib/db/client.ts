import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserClient } from "@/lib/supabase/server";

/** Use the provided client, or a fresh cookie-bound user client. */
export async function userDb(
  client?: SupabaseClient,
): Promise<SupabaseClient> {
  return client ?? createUserClient();
}
