/** Pure presentation for the Alerts screen: day labels and resolved text. */
import { describeAlert, formatClock, formatSpan, type AlertContext } from "./climate";
import { manilaDate, shortDate } from "./history";
import { eventTime, type Incident } from "./incidents";

export type FeedItem = {
  key: string;
  code: string;
  open: boolean;
  severity: "critical" | "warning";
  metric: "temp" | "hum" | "wind" | "offline" | "battery" | "other";
  title: string;
  detail: string;
  when: string;
  scope: string;
};

function dayWord(ts: number, now: number): string {
  const day = manilaDate(ts);
  if (day === manilaDate(now)) return "Today";
  if (day === manilaDate(now - 24 * 60 * 60 * 1000)) return "Yesterday";
  return shortDate(day);
}

function metricOf(code: string): FeedItem["metric"] {
  if (/_TEMP_/.test(code)) return "temp";
  if (/_HUM_/.test(code)) return "hum";
  if (/_WIND_/.test(code)) return "wind";
  if (code === "DEVICE_OFFLINE") return "offline";
  if (code.startsWith("BATT_")) return "battery";
  return "other";
}

export function feedItem(incident: Incident, now: number, ctx: Omit<AlertContext, "value" | "age"> = {}): FeedItem {
  const start = incident.start;
  const desc = describeAlert(incident.code, { ...ctx, value: start.value, age: start.age });
  const startedAt = eventTime(start);
  let detail = desc.detail;
  if (!incident.open && incident.end) {
    const minutes = (eventTime(incident.end) - startedAt) / 60_000;
    detail =
      incident.code === "DEVICE_OFFLINE"
        ? `No data for ${formatSpan(minutes)}, back online`
        : `${desc.detail} · cleared after ${formatSpan(minutes)}`;
  }
  return {
    key: incident.key,
    code: incident.code,
    open: incident.open,
    severity: incident.severity === "critical" ? "critical" : "warning",
    metric: metricOf(incident.code),
    title: !incident.open && incident.code === "DEVICE_OFFLINE" ? "Device was offline" : desc.title,
    detail,
    when: `${dayWord(startedAt, now)} ${formatClock(startedAt)}`,
    scope: desc.scope ?? "Farm",
  };
}
