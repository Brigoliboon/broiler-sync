import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { userDb } from "./client";
import { throwIfError } from "./errors";

/** The slim reading columns the History charts need. */
export type SeriesRow = {
  ts: string;
  age: number | null;
  setpoint: number | null;
  e_temp: number | null;
  e_hum: number | null;
  e_wind: number | null;
  c_temp: number | null;
  c_hum: number | null;
  c_wind: number | null;
};

const SELECT = "ts, age, setpoint, e_temp, e_hum, e_wind, c_temp, c_hum, c_wind";
const PAGE = 1000;
/** Safety cap: 31 days of 1-minute readings is about 44,640 rows. */
const MAX_ROWS = 50_000;

/**
 * Readings with a timestamp in [from, to), oldest first. Pages through the
 * PostgREST row limit. RLS limits rows to the caller's own devices.
 */
export async function listReadingSeries(
  deviceId: string,
  from: string,
  to: string,
  client?: SupabaseClient,
): Promise<SeriesRow[]> {
  const db = await userDb(client);
  const rows: SeriesRow[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const result = await db
      .from("readings")
      .select(SELECT)
      .eq("device_id", deviceId)
      .gte("ts", from)
      .lt("ts", to)
      .order("ts", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    const page = (throwIfError(result, "could not load reading history") ?? []) as SeriesRow[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}
