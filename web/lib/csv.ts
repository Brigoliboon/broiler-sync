/** Pure CSV export helpers (FR-22): Excel-friendly UTF-8 with BOM, CRLF lines. */
import { addDays, daysBetween, isIsoDate, manilaDayStart } from "./history";

export const CSV_BOM = "\uFEFF";
export const CSV_HEADER = ["timestamp", "compartment", "temp °C", "humidity %", "air m/s", "fan", "lamp", "mode"];
export const MAX_EXPORT_DAYS = 92;

export type ExportCompartment = "both" | "experimental" | "control";

export type ExportQuery = {
  farmId: string;
  from: string;
  to: string;
  compartment: ExportCompartment;
  /** [start, end) instants for the `ts` filter. */
  start: string;
  end: string;
};

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Neutralize spreadsheet formulas, then quote when needed.
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function csvLine(values: readonly unknown[]): string {
  return `${values.map(csvEscape).join(",")}\r\n`;
}

/** "2026-11-21 23:18:05" in Asia/Manila, which Excel reads as a date-time. */
export function manilaTimestamp(value: string): string {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return value;
  return new Date(ts + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

export type CompartmentRow = {
  ts: string;
  compartment_slug: string;
  temp: number | null;
  hum: number | null;
  wind: number | null;
  fan: boolean;
  lamp: boolean;
  mode: string;
};

export function rowValues(row: CompartmentRow): unknown[] {
  return [
    manilaTimestamp(row.ts),
    row.compartment_slug === "experimental" ? "Experimental" : row.compartment_slug === "control" ? "Control" : row.compartment_slug,
    row.temp,
    row.hum,
    row.wind,
    row.fan ? "ON" : "OFF",
    row.lamp ? "ON" : "OFF",
    row.mode === "MANUAL" ? "Manual" : row.mode === "AUTO" ? "Auto" : row.mode,
  ];
}

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function get(params: Params, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validates `farm_id`, `from`, `to` (Manila dates, inclusive) and `compartment`. */
export function parseExportQuery(params: Params, today: string): ExportQuery | { error: string } {
  const farmId = get(params, "farm_id") ?? "";
  const from = get(params, "from");
  const to = get(params, "to");
  const c = get(params, "compartment") ?? "both";
  if (!UUID.test(farmId)) return { error: "Pick a farm" };
  if (!isIsoDate(from) || !isIsoDate(to)) return { error: "Pick a From and To date" };
  if (from > to) return { error: "From must be on or before To" };
  if (to > today) return { error: "To can't be in the future" };
  if (daysBetween(from, to) + 1 > MAX_EXPORT_DAYS) return { error: `Export up to ${MAX_EXPORT_DAYS} days at a time` };
  if (c !== "both" && c !== "experimental" && c !== "control") return { error: "Unknown compartment" };
  return {
    farmId,
    from,
    to,
    compartment: c,
    start: new Date(manilaDayStart(from)).toISOString(),
    end: new Date(manilaDayStart(addDays(to, 1))).toISOString(),
  };
}

export function exportFilename(farmName: string, from: string, to: string): string {
  const slug = farmName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "farm";
  return `broilersync-${slug}-${from}-to-${to}.csv`;
}
