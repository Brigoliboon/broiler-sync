import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { userDb } from "./client";
import { throwIfError } from "./errors";

/** Public device columns. Never include `key_hash`. */
export const DEVICE_PUBLIC_COLUMNS = [
  "device_id",
  "farm_id",
  "last_seen_at",
  "disabled_at",
  "created_at",
] as const;

export type PublicDevice = {
  device_id: string;
  farm_id: string;
  last_seen_at: string | null;
  disabled_at: string | null;
  created_at: string;
};

const SELECT = DEVICE_PUBLIC_COLUMNS.join(", ");

export async function listDevices(
  client?: SupabaseClient,
): Promise<PublicDevice[]> {
  const db = await userDb(client);
  const result = await db.from("devices").select(SELECT).order("device_id");
  return (throwIfError(result, "could not list devices") ?? []) as PublicDevice[];
}

export async function getDevice(
  deviceId: string,
  client?: SupabaseClient,
): Promise<PublicDevice | null> {
  const db = await userDb(client);
  const result = await db
    .from("devices")
    .select(SELECT)
    .eq("device_id", deviceId)
    .maybeSingle();
  return throwIfError(result, "could not load device") as PublicDevice | null;
}
