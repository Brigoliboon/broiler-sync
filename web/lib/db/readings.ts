import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { userDb } from "./client";
import { throwIfError } from "./errors";

export const READING_COLUMNS = [
  "id",
  "device_id",
  "ts",
  "uptime_s",
  "age",
  "setpoint",
  "e_temp",
  "e_hum",
  "e_wind",
  "e_temp_status",
  "e_wind_status",
  "c_temp",
  "c_hum",
  "c_wind",
  "c_temp_status",
  "c_wind_status",
  "batt_v",
  "fan",
  "lamp",
  "mode",
  "alert_level",
  "alert_codes",
  "reason",
  "received_at",
] as const;

export type Reading = {
  id: number;
  device_id: string;
  ts: string | null;
  uptime_s: number;
  age: number | null;
  setpoint: number | null;
  e_temp: number | null;
  e_hum: number | null;
  e_wind: number | null;
  e_temp_status: string | null;
  e_wind_status: string | null;
  c_temp: number | null;
  c_hum: number | null;
  c_wind: number | null;
  c_temp_status: string | null;
  c_wind_status: string | null;
  batt_v: number | null;
  fan: boolean;
  lamp: boolean;
  mode: string;
  alert_level: string;
  alert_codes: string[] | null;
  reason: string | null;
  received_at: string;
};

export const COMPARTMENT_READING_COLUMNS = [
  "id",
  "device_id",
  "ts",
  "uptime_s",
  "age",
  "setpoint",
  "compartment_slug",
  "temp",
  "hum",
  "wind",
  "temp_status",
  "wind_status",
  "batt_v",
  "fan",
  "lamp",
  "mode",
  "alert_level",
  "alert_codes",
  "reason",
  "received_at",
] as const;

export type CompartmentReading = {
  id: number;
  device_id: string;
  ts: string | null;
  uptime_s: number;
  age: number | null;
  setpoint: number | null;
  compartment_slug: string;
  temp: number | null;
  hum: number | null;
  wind: number | null;
  temp_status: string | null;
  wind_status: string | null;
  batt_v: number | null;
  fan: boolean;
  lamp: boolean;
  mode: string;
  alert_level: string;
  alert_codes: string[] | null;
  reason: string | null;
  received_at: string;
};

export type ReadingQuery = {
  deviceId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

const READING_SELECT = READING_COLUMNS.join(", ");
const COMPARTMENT_SELECT = COMPARTMENT_READING_COLUMNS.join(", ");

export async function listLatestReadings(
  client?: SupabaseClient,
): Promise<Reading[]> {
  const db = await userDb(client);
  const result = await db.from("latest_readings").select(READING_SELECT);
  return (throwIfError(result, "could not list latest readings") ??
    []) as Reading[];
}

function withReadingFilters<T extends {
  eq: (column: string, value: string) => T;
  gte: (column: string, value: string) => T;
  lte: (column: string, value: string) => T;
  limit: (count: number) => T;
}>(query: T, options: ReadingQuery): T {
  let next = query;
  if (options.deviceId) next = next.eq("device_id", options.deviceId);
  if (options.from) next = next.gte("ts", options.from);
  if (options.to) next = next.lte("ts", options.to);
  if (options.limit !== undefined) next = next.limit(options.limit);
  return next;
}

export async function listReadings(
  options: ReadingQuery = {},
  client?: SupabaseClient,
): Promise<Reading[]> {
  const db = await userDb(client);
  const result = await withReadingFilters(
    db
      .from("readings")
      .select(READING_SELECT)
      .order("ts", { ascending: true, nullsFirst: false }),
    options,
  );
  return (throwIfError(result, "could not list readings") ?? []) as Reading[];
}

export async function listCompartmentReadings(
  options: ReadingQuery = {},
  client?: SupabaseClient,
): Promise<CompartmentReading[]> {
  const db = await userDb(client);
  const result = await withReadingFilters(
    db
      .from("compartment_readings")
      .select(COMPARTMENT_SELECT)
      .order("ts", { ascending: true, nullsFirst: false }),
    options,
  );
  return (throwIfError(result, "could not list compartment readings") ??
    []) as CompartmentReading[];
}

export async function getLatestReading(
  deviceId: string,
  client?: SupabaseClient,
): Promise<Reading | null> {
  const db = await userDb(client);
  const result = await db
    .from("latest_readings")
    .select(READING_SELECT)
    .eq("device_id", deviceId)
    .maybeSingle();
  return throwIfError(result, "could not load latest reading") as Reading | null;
}
