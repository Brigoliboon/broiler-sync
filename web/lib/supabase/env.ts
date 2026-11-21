import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

/** Project URL. Prefers the server-only name; falls back to the existing public env. */
export function supabaseUrl(): string {
  return required(
    "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL",
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

/** Publishable (anon) key for the user-session client. Not the service role. */
export function supabasePublishableKey(): string {
  return required(
    "SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/** Service-role secret. Never expose this to the browser. */
export function supabaseSecret(): string {
  return required("SUPABASE_SECRET", process.env.SUPABASE_SECRET);
}
