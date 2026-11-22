import { timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron (and the Supabase pg_cron + pg_net stand-in) send
 * `Authorization: Bearer <CRON_SECRET>`. Reject if the secret is unset
 * or the header does not match.
 */
export function authorizeCron(request: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length);
  const expected = Buffer.from(secret);
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
