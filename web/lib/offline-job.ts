/**
 * Pure DEVICE_OFFLINE start/dedupe rules (FR-23, DESIGN.md §6.2).
 * A device is stale when last_seen_at is at least the timeout old
 * (12 minutes by default). Open at most one start per outage; a later
 * start is allowed only after a clear (or if there is no prior event).
 * Reconnect clear lives in touchDevice; this module only decides starts.
 */
import { deviceOfflineAfterMs } from "./dashboard-utils";

export const DEVICE_OFFLINE_CODE = "DEVICE_OFFLINE";
export const DEVICE_OFFLINE_SEVERITY = "warning";
export const DEVICE_OFFLINE_MESSAGE = "No data from the ESP32 for over 12 min";

export type OfflineScanDevice = {
  device_id: string;
  last_seen_at: string | null;
  disabled_at: string | null;
};

export function isStaleLastSeen(
  lastSeenAt: string | null,
  now: number = Date.now(),
  thresholdMs: number = deviceOfflineAfterMs(),
): boolean {
  if (!lastSeenAt) return false;
  const timestamp = new Date(lastSeenAt).getTime();
  if (Number.isNaN(timestamp)) return false;
  return now - timestamp >= thresholdMs;
}

export function shouldOpenOfflineAlert(
  device: Pick<OfflineScanDevice, "last_seen_at" | "disabled_at">,
  latestOfflineEvent: string | null | undefined,
  now: number = Date.now(),
  thresholdMs: number = deviceOfflineAfterMs(),
): boolean {
  if (device.disabled_at) return false;
  if (!isStaleLastSeen(device.last_seen_at, now, thresholdMs)) return false;
  return latestOfflineEvent !== "start";
}

export function offlineAlertRow(deviceId: string, ts: string) {
  return {
    device_id: deviceId,
    ts,
    uptime_s: null,
    event: "start" as const,
    code: DEVICE_OFFLINE_CODE,
    severity: DEVICE_OFFLINE_SEVERITY,
    message: DEVICE_OFFLINE_MESSAGE,
    value: null,
    age: null,
    source: "server" as const,
  };
}
