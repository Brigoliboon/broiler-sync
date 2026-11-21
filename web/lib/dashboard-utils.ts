export const DEVICE_OFFLINE_MS = 12 * 60 * 1000;

export function isDeviceOnline(
  lastSeenAt: string | null,
  now: number = Date.now(),
): boolean {
  if (!lastSeenAt) return false;
  const timestamp = new Date(lastSeenAt).getTime();
  if (Number.isNaN(timestamp)) return false;
  const age = now - timestamp;
  return age >= 0 && age < DEVICE_OFFLINE_MS;
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
