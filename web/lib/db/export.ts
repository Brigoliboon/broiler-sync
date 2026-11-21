import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompartmentRow, ExportCompartment } from "@/lib/csv";
import { userDb } from "./client";
import { throwIfError } from "./errors";

const PAGE = 1000;
const SELECT = "ts, compartment_slug, temp, hum, wind, fan, lamp, mode";

/** Number of readings with a timestamp in [start, end). RLS-scoped. */
export async function countReadings(
  deviceId: string,
  start: string,
  end: string,
  client?: SupabaseClient,
): Promise<number> {
  const db = await userDb(client);
  const result = await db
    .from("readings")
    .select("id", { count: "exact", head: true })
    .eq("device_id", deviceId)
    .gte("ts", start)
    .lt("ts", end);
  throwIfError(result, "could not count readings");
  return result.count ?? 0;
}

/**
 * Yields compartment rows oldest first, one page at a time, from the
 * `compartment_readings` view (RLS of `readings` applies).
 */
export async function* compartmentRowPages(
  deviceId: string,
  start: string,
  end: string,
  compartment: ExportCompartment,
  client?: SupabaseClient,
): AsyncGenerator<CompartmentRow[]> {
  const db = await userDb(client);
  for (let offset = 0; ; offset += PAGE) {
    let query = db
      .from("compartment_readings")
      .select(SELECT)
      .eq("device_id", deviceId)
      .gte("ts", start)
      .lt("ts", end);
    if (compartment !== "both") query = query.eq("compartment_slug", compartment);
    const result = await query
      .order("ts", { ascending: true })
      .order("compartment_slug", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE - 1);
    const page = (throwIfError(result, "could not load readings for export") ?? []) as CompartmentRow[];
    if (page.length) yield page;
    if (page.length < PAGE) return;
  }
}
