import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { userDb } from "./client";
import { throwIfError } from "./errors";

export const ALERT_COLUMNS = [
  "id",
  "device_id",
  "ts",
  "uptime_s",
  "event",
  "code",
  "severity",
  "message",
  "value",
  "age",
  "received_at",
  "source",
] as const;

export type Alert = {
  id: number;
  device_id: string;
  ts: string | null;
  uptime_s: number | null;
  event: string;
  code: string;
  severity: string;
  message: string | null;
  value: number | null;
  age: number | null;
  received_at: string;
  source: string;
};

export type AlertQuery = {
  deviceId?: string;
  limit?: number;
};

const SELECT = ALERT_COLUMNS.join(", ");

export async function listAlerts(
  options: AlertQuery = {},
  client?: SupabaseClient,
): Promise<Alert[]> {
  const db = await userDb(client);
  let query = db
    .from("alerts")
    .select(SELECT)
    .order("ts", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });
  if (options.deviceId) query = query.eq("device_id", options.deviceId);
  if (options.limit !== undefined) query = query.limit(options.limit);
  const result = await query;
  return (throwIfError(result, "could not list alerts") ?? []) as Alert[];
}
