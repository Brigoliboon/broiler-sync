/** Pure helpers for the History and Export screens: ranges, Manila dates, metrics. */

export type HistoryRange = "24h" | "7d" | "custom";
export type HistoryMetric = "temp" | "hum" | "wind";

export const MAX_CUSTOM_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila has no DST.

/** Calendar date (YYYY-MM-DD) in Asia/Manila for an instant. */
export function manilaDate(value: number | string | Date): string {
  return new Date(new Date(value).getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Start of a Manila calendar day as an instant (ms). */
export function manilaDayStart(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) - MANILA_OFFSET_MS;
}

export type HistoryQuery = {
  range: HistoryRange;
  metric: HistoryMetric;
  /** Inclusive Manila dates covered by the daily summary. */
  from: string;
  to: string;
  /** Instants covered by the chart. */
  start: number;
  end: number;
};

type Params = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Normalizes `?range=&metric=&from=&to=`, defaulting to the last 7 days of temperature. */
export function parseHistoryQuery(params: Params, now: number): HistoryQuery {
  const metricParam = one(params.metric);
  const metric: HistoryMetric = metricParam === "hum" || metricParam === "wind" ? metricParam : "temp";
  const rangeParam = one(params.range);
  const today = manilaDate(now);

  if (rangeParam === "24h") {
    return { range: "24h", metric, from: manilaDate(now - DAY_MS), to: today, start: now - DAY_MS, end: now };
  }

  if (rangeParam === "custom") {
    let from = one(params.from);
    let to = one(params.to);
    if (!isIsoDate(to) || to > today) to = today;
    if (!isIsoDate(from) || from > to) from = addDays(to, -6);
    if (daysBetween(from, to) > MAX_CUSTOM_DAYS - 1) from = addDays(to, -(MAX_CUSTOM_DAYS - 1));
    return { range: "custom", metric, from, to, start: manilaDayStart(from), end: Math.min(now, manilaDayStart(addDays(to, 1))) };
  }

  const from = addDays(today, -6);
  return { range: "7d", metric, from, to: today, start: manilaDayStart(from), end: now };
}

/** Query string for a history link, keeping the other choices. */
export function historyHref(query: HistoryQuery, change: Partial<Pick<HistoryQuery, "range" | "metric">>): string {
  const range = change.range ?? query.range;
  const metric = change.metric ?? query.metric;
  const params = new URLSearchParams();
  if (range !== "7d") params.set("range", range);
  if (metric !== "temp") params.set("metric", metric);
  if (range === "custom") {
    params.set("from", query.from);
    params.set("to", query.to);
  }
  const qs = params.toString();
  return qs ? `/history?${qs}` : "/history";
}

/** Flock day for a Manila date, or null when the flock start is unknown. */
export function flockDay(date: string, flockStart: string | null | undefined): number | null {
  if (!flockStart || !isIsoDate(flockStart.slice(0, 10))) return null;
  const day = daysBetween(flockStart.slice(0, 10), date);
  return day >= 0 ? day : null;
}

const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });

/** "Nov 21" for a YYYY-MM-DD date. */
export function shortDate(date: string): string {
  return SHORT.format(new Date(`${date}T00:00:00Z`));
}

/** "Sat" for a YYYY-MM-DD date. */
export function weekday(date: string): string {
  return WEEKDAY.format(new Date(`${date}T00:00:00Z`));
}

/** Inclusive list of dates from `from` to `to`. */
export function dateList(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to && days.length <= 400; d = addDays(d, 1)) days.push(d);
  return days;
}
