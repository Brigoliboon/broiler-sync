export const DEVICE_OFFLINE_MS = 12 * 60 * 1000;

/** Offline timeout in ms. Override with DEVICE_OFFLINE_AFTER_MS (default 12 minutes). */
export function deviceOfflineAfterMs(): number {
  const raw = process.env.DEVICE_OFFLINE_AFTER_MS;
  if (!raw) return DEVICE_OFFLINE_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : DEVICE_OFFLINE_MS;
}

export function isDeviceOnline(
  lastSeenAt: string | null,
  now: number = Date.now(),
  thresholdMs: number = deviceOfflineAfterMs(),
): boolean {
  if (!lastSeenAt) return false;
  const timestamp = new Date(lastSeenAt).getTime();
  if (Number.isNaN(timestamp)) return false;
  const age = now - timestamp;
  return age >= 0 && age < thresholdMs;
}

export function formatNumber(
  value: number | null | undefined,
  digits: number,
  unit = "",
): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}${unit}`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(timestamp);
}
