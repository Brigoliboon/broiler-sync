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
