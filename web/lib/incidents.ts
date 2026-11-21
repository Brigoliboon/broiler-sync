/**
 * Turns the alerts event log (start / clear / info) into incidents.
 * An incident is open while the latest event for its (device, code) is `start`
 * (DESIGN.md §2.6). Pure, so it is unit tested and shared by the dashboard
 * banner, the alert counts and the Alerts screen.
 */

export type AlertEvent = {
  id: number;
  device_id: string;
  ts: string | null;
  received_at: string;
  event: string;
  code: string;
  severity: string;
  message: string | null;
  value: number | null;
  age: number | null;
  source: string;
};

export type Incident = {
  key: string;
  device_id: string;
  code: string;
  severity: string;
  start: AlertEvent;
  end: AlertEvent | null;
  open: boolean;
};

export function eventTime(event: Pick<AlertEvent, "ts" | "received_at">): number {
  const ts = new Date(event.ts ?? event.received_at).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

export function buildIncidents(events: readonly AlertEvent[]): Incident[] {
  const ordered = [...events].sort((a, b) => eventTime(a) - eventTime(b) || a.id - b.id);
  const open = new Map<string, Incident>();
  const incidents: Incident[] = [];

  for (const event of ordered) {
    const id = `${event.device_id}:${event.code}`;
    if (event.event === "start") {
      if (open.has(id)) continue;
      const incident: Incident = {
        key: `${id}:${event.id}`,
        device_id: event.device_id,
        code: event.code,
        severity: event.severity,
        start: event,
        end: null,
        open: true,
      };
      open.set(id, incident);
      incidents.push(incident);
    } else if (event.event === "clear") {
      const incident = open.get(id);
      if (!incident) continue;
      incident.end = event;
      incident.open = false;
      open.delete(id);
    }
  }

  return incidents.sort((a, b) => eventTime(b.start) - eventTime(a.start) || b.start.id - a.start.id);
}

export function openIncidents(events: readonly AlertEvent[]): Incident[] {
  return buildIncidents(events).filter((incident) => incident.open);
}
