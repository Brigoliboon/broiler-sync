import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { userDb } from "./client";
import { throwIfError } from "./errors";

export const AGE_THRESHOLD_COLUMNS = [
  "from_day",
  "to_day",
  "setpoint_c",
] as const;

export type AgeThreshold = {
  from_day: number;
  to_day: number | null;
  setpoint_c: number;
};

const SELECT = AGE_THRESHOLD_COLUMNS.join(", ");

export async function listAgeThresholds(
  client?: SupabaseClient,
): Promise<AgeThreshold[]> {
  const db = await userDb(client);
  const result = await db
    .from("age_thresholds")
    .select(SELECT)
    .order("from_day");
  return (throwIfError(result, "could not list age thresholds") ??
    []) as AgeThreshold[];
}
