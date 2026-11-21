import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { userDb } from "./client";
import { throwIfError } from "./errors";

export const DAILY_STAT_COLUMNS = [
  "device_id",
  "compartment_slug",
  "day",
  "temp_min",
  "temp_max",
  "temp_avg",
  "hum_min",
  "hum_max",
  "hum_avg",
  "wind_min",
  "wind_max",
  "wind_avg",
  "reading_count",
] as const;

export type DailyStat = {
  device_id: string;
  compartment_slug: string;
  day: string;
  temp_min: number | null;
  temp_max: number | null;
  temp_avg: number | null;
  hum_min: number | null;
  hum_max: number | null;
  hum_avg: number | null;
  wind_min: number | null;
  wind_max: number | null;
  wind_avg: number | null;
  reading_count: number;
};

export type DailyStatQuery = {
  deviceId?: string;
  from?: string;
  to?: string;
};

const SELECT = DAILY_STAT_COLUMNS.join(", ");

export async function listDailyStats(
  options: DailyStatQuery = {},
  client?: SupabaseClient,
): Promise<DailyStat[]> {
  const db = await userDb(client);
  let query = db
    .from("daily_stats")
    .select(SELECT)
    .order("day", { ascending: true });
  if (options.deviceId) query = query.eq("device_id", options.deviceId);
  if (options.from) query = query.gte("day", options.from);
  if (options.to) query = query.lte("day", options.to);
  const result = await query;
  return (throwIfError(result, "could not list daily stats") ?? []) as DailyStat[];
}
