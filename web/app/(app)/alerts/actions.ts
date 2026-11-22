"use server";

import { getAuthUserId } from "@/lib/supabase/server";
import { deletePushSubscription, savePushSubscription } from "@/lib/db/push-subscriptions";

export type PushResult = { ok: boolean; error?: string };

function validEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1024) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validKey(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256 && /^[A-Za-z0-9_-]+=*$/.test(value);
}

/** Store this browser's push subscription for the signed-in owner. */
export async function subscribePush(input: {
  endpoint: unknown;
  p256dh: unknown;
  auth: unknown;
  userAgent?: unknown;
}): Promise<PushResult> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Sign in again to turn on alerts" };
  if (!validEndpoint(input.endpoint) || !validKey(input.p256dh) || !validKey(input.auth)) {
    return { ok: false, error: "This browser sent an invalid subscription" };
  }
  try {
    await savePushSubscription(userId, {
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: typeof input.userAgent === "string" ? input.userAgent.slice(0, 300) : null,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't save. Only farm owner accounts can get push alerts." };
  }
}

/** Remove this browser's subscription (RLS: only the caller's own rows). */
export async function unsubscribePush(endpoint: unknown): Promise<PushResult> {
  const userId = await getAuthUserId();
  if (!userId) return { ok: false, error: "Sign in again" };
  if (!validEndpoint(endpoint)) return { ok: false, error: "Invalid subscription" };
  try {
    await deletePushSubscription(endpoint);
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't turn off alerts" };
  }
}
