/** Pure rules for which alert events become web pushes (DESIGN.md §6.4). */

export type PushableEvent = {
  event: string;
  code: string;
  severity: string;
  message?: string | null;
  value?: number | null;
  age?: number | null;
  ts: string | null;
};

/** Older events are backfill after an outage; they are stored but not pushed. */
export const PUSH_MAX_AGE_MS = 30 * 60 * 1000;

export function shouldPush(event: PushableEvent, now: number): boolean {
  if (event.event !== "start") return false;
  if (event.code === "BOOT" || event.severity === "ok") return false;
  if (!event.ts) return true;
  const ts = new Date(event.ts).getTime();
  if (Number.isNaN(ts)) return true;
  return now - ts <= PUSH_MAX_AGE_MS;
}

export type PushPayload = {
  code: string;
  severity: string;
  message: string | null;
  device_id: string;
  ts: string | null;
  farm_name: string;
  title: string;
  body: string;
};

/** Notification payload. No secrets: only the alert, device id and farm name. */
export function buildPayload(
  event: PushableEvent,
  deviceId: string,
  farmName: string,
  text: { title: string; detail: string },
): PushPayload {
  return {
    code: event.code,
    severity: event.severity,
    message: event.message ?? null,
    device_id: deviceId,
    ts: event.ts,
    farm_name: farmName,
    title: `${farmName}: ${text.title}`,
    body: text.detail,
  };
}

/** Push services answer 404/410 when a subscription is gone; delete it then. */
export function isGoneStatus(status: number | undefined): boolean {
  return status === 404 || status === 410;
}
