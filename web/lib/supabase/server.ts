import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Per-request Supabase client bound to the user's cookie session.
 * RLS still applies. Never cache this across requests.
 */
export async function createUserClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component, which cannot write cookies.
          // The proxy / middleware refreshes the session instead.
        }
      },
    },
  });
}

/** Verified user id from the session cookie, or null if signed out. */
export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  const sub = data.claims.sub;
  return typeof sub === "string" && sub.length > 0 ? sub : null;
}
