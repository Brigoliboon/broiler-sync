import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { userDb } from "./client";
import { throwIfError } from "./errors";

export const PUSH_SUBSCRIPTION_COLUMNS = [
  "id",
  "owner_id",
  "endpoint",
  "p256dh",
  "auth",
  "user_agent",
  "created_at",
] as const;

export type PushSubscription = {
  id: string;
  owner_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
};

const SELECT = PUSH_SUBSCRIPTION_COLUMNS.join(", ");

export async function listPushSubscriptions(
  client?: SupabaseClient,
): Promise<PushSubscription[]> {
  const db = await userDb(client);
  const result = await db
    .from("push_subscriptions")
    .select(SELECT)
    .order("created_at", { ascending: false });
  return (throwIfError(result, "could not list push subscriptions") ??
    []) as PushSubscription[];
}

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
};

/** Save the signed-in owner's browser subscription (RLS: own rows, active owners). */
export async function savePushSubscription(
  ownerId: string,
  input: PushSubscriptionInput,
  client?: SupabaseClient,
): Promise<void> {
  const db = await userDb(client);
  const result = await db.from("push_subscriptions").upsert(
    {
      owner_id: ownerId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent,
    },
    { onConflict: "endpoint" },
  );
  throwIfError(result, "could not save push subscription");
}

export async function deletePushSubscription(
  endpoint: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = await userDb(client);
  const result = await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
  throwIfError(result, "could not remove push subscription");
}
