import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { userDb } from "./client";
import { throwIfError } from "./errors";

export const DEVICE_SETTING_COLUMNS = [
  "device_id",
  "flock_start",
  "age_override_days",
  "mode",
  "fan_on_delta",
  "fan_off_delta",
  "lamp_on_delta",
  "lamp_off_delta",
  "temp_warn_delta",
  "temp_crit_delta",
  "brood_days",
  "fan_max_on_s",
  "fan_rest_s",
  "hum_low",
  "hum_high",
  "hum_brood_low",
  "hum_brood_days",
  "wind_alert_ms",
  "wind_alert_until_days",
  "batt_warn_v",
  "batt_crit_v",
  "min_switch_s",
  "manual_minutes",
  "manual_id",
  "manual_fan",
  "manual_lamp",
  "updated_at",
] as const;

export type DeviceSettings = {
  device_id: string;
  flock_start: string | null;
  age_override_days: number | null;
  mode: string;
  fan_on_delta: number;
  fan_off_delta: number;
  lamp_on_delta: number;
  lamp_off_delta: number;
  temp_warn_delta: number;
  temp_crit_delta: number;
  brood_days: number;
  fan_max_on_s: number;
  fan_rest_s: number;
  hum_low: number;
  hum_high: number;
  hum_brood_low: number;
  hum_brood_days: number;
  wind_alert_ms: number[];
  wind_alert_until_days: number[];
  batt_warn_v: number;
  batt_crit_v: number;
  min_switch_s: number;
  manual_minutes: number;
  manual_id: number;
  manual_fan: boolean;
  manual_lamp: boolean;
  updated_at: string | null;
};

const SELECT = DEVICE_SETTING_COLUMNS.join(", ");

export async function getDeviceSettings(
  deviceId: string,
  client?: SupabaseClient,
): Promise<DeviceSettings | null> {
  const db = await userDb(client);
  const result = await db
    .from("device_settings")
    .select(SELECT)
    .eq("device_id", deviceId)
    .maybeSingle();
  return throwIfError(result, "could not load device settings") as
    | DeviceSettings
    | null;
}
