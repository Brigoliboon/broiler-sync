import "server-only";

import { deviceOfflineAfterMs } from "@/lib/dashboard-utils";
import {
  DEVICE_OFFLINE_CODE,
  isStaleLastSeen,
  offlineAlertRow,
  shouldOpenOfflineAlert,
  type OfflineScanDevice,
} from "@/lib/offline-job";
import { notifyAlertStarts } from "@/lib/push/notify";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type OfflineScanSummary = {
  checked: number;
  opened: number;
  skipped: number;
  device_ids: string[];
};

/**
 * Marks stale devices with a single DEVICE_OFFLINE start per outage
 * and notifies the farm owner's web-push subscriptions.
 */
export async function runOfflineScan(now: number = Date.now()): Promise<OfflineScanSummary> {
  const db = supabaseAdmin();
  const thresholdMs = deviceOfflineAfterMs();
  const ts = new Date(now).toISOString();

  const { data, error } = await db
    .from("devices")
    .select("device_id, last_seen_at, disabled_at");
  if (error) throw new Error(`could not list devices: ${error.message}`);

  const devices = (data ?? []) as OfflineScanDevice[];
  const summary: OfflineScanSummary = {
    checked: devices.length,
    opened: 0,
    skipped: 0,
    device_ids: [],
  };

  for (const device of devices) {
    if (device.disabled_at || !isStaleLastSeen(device.last_seen_at, now, thresholdMs)) {
      summary.skipped += 1;
      continue;
    }

    const { data: latest, error: latestError } = await db
      .from("alerts")
      .select("event")
      .eq("device_id", device.device_id)
      .eq("code", DEVICE_OFFLINE_CODE)
      .order("ts", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) {
      throw new Error(`could not read offline alert: ${latestError.message}`);
    }

    if (!shouldOpenOfflineAlert(device, latest?.event, now, thresholdMs)) {
      summary.skipped += 1;
      continue;
    }

    const row = offlineAlertRow(device.device_id, ts);
    const { error: insertError } = await db.from("alerts").insert(row);
    if (insertError) {
      if (insertError.code === "23505") {
        summary.skipped += 1;
        continue;
      }
      throw new Error(`could not open offline alert: ${insertError.message}`);
    }

    await notifyAlertStarts(device.device_id, [row]);
    summary.opened += 1;
    summary.device_ids.push(device.device_id);
  }

  return summary;
}
