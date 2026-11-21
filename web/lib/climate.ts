/**
 * Pure helpers for the app UI: alert codes, compartment limits and relative
 * times. No Supabase imports, so these are safe to unit test and to share.
 */

export type CompartmentSlug = "experimental" | "control";
export type Metric = "temp" | "hum" | "wind";

export const COMPARTMENTS: { slug: CompartmentSlug; name: string; prefix: "E_" | "C_" }[] = [
  { slug: "experimental", name: "Experimental", prefix: "E_" },
  { slug: "control", name: "Control", prefix: "C_" },
];

/** Half-width of the shaded target band around the age setpoint (design: 24-26 °C at 25 °C). */
export const TARGET_BAND_C = 1;

export type ClimateLimits = {
  hum_low: number;
  hum_high: number;
  hum_brood_low: number;
  hum_brood_days: number;
  wind_alert_ms: number[];
  wind_alert_until_days: number[];
};

export const DEFAULT_LIMITS: ClimateLimits = {
  hum_low: 50,
  hum_high: 70,
  hum_brood_low: 60,
  hum_brood_days: 3,
  wind_alert_ms: [0.15, 0.3, 0.5],
  wind_alert_until_days: [14, 21, 28],
};

/** Humidity band for a flock age (FR-23: 60-70% days 0-3, 50-70% from day 4). */
export function humidityLimits(
  age: number | null | undefined,
  limits: ClimateLimits = DEFAULT_LIMITS,
): { low: number; high: number } {
  const brood = typeof age === "number" && age <= limits.hum_brood_days;
  return { low: brood ? limits.hum_brood_low : limits.hum_low, high: limits.hum_high };
}

/** Air speed alert limit for a flock age, or null when no limit applies (after day 28). */
export function windLimit(
  age: number | null | undefined,
  limits: ClimateLimits = DEFAULT_LIMITS,
): number | null {
  if (typeof age !== "number") return null;
  for (let i = 0; i < limits.wind_alert_until_days.length; i += 1) {
    if (age <= limits.wind_alert_until_days[i]) return limits.wind_alert_ms[i] ?? null;
  }
  return null;
}

export type Severity = "ok" | "warning" | "critical";

const CRITICAL_CODES = new Set([
  "E_TEMP_SENSOR",
  "E_TEMP_HIGH_CRIT",
  "E_TEMP_LOW_CRIT",
  "BATT_CRIT",
]);

export function codeSeverity(code: string): Severity {
  if (code === "BOOT") return "ok";
  return CRITICAL_CODES.has(code) ? "critical" : "warning";
}

export function codeCompartment(code: string): CompartmentSlug | null {
  if (code.startsWith("E_")) return "experimental";
  if (code.startsWith("C_")) return "control";
  return null;
}

export function codeMetric(code: string): Metric | null {
  if (/^[EC]_TEMP_/.test(code)) return "temp";
  if (/^[EC]_HUM_/.test(code)) return "hum";
  if (/^[EC]_WIND_/.test(code)) return "wind";
  return null;
}

/** Active alert codes for one compartment, grouped by metric. */
export function compartmentAlerts(codes: readonly string[] | null | undefined, slug: CompartmentSlug) {
  const own = (codes ?? []).filter((code) => codeCompartment(code) === slug);
  return {
    codes: own,
    count: own.length,
    temp: own.some((code) => codeMetric(code) === "temp"),
    hum: own.some((code) => codeMetric(code) === "hum"),
    wind: own.some((code) => codeMetric(code) === "wind"),
  };
}

/** Sort codes most severe first, keeping the original order otherwise. */
export function sortBySeverity(codes: readonly string[]): string[] {
  const rank = (code: string) => (codeSeverity(code) === "critical" ? 0 : 1);
  return codes
    .map((code, index) => ({ code, index }))
    .sort((a, b) => rank(a.code) - rank(b.code) || a.index - b.index)
    .map(({ code }) => code);
}

export type AlertContext = {
  /** Reading value for the metric the code is about (°C, %, m/s or V). */
  value?: number | null;
  age?: number | null;
  setpoint?: number | null;
  limits?: ClimateLimits;
  battWarnV?: number;
  battCritV?: number;
};

export type AlertDescription = {
  title: string;
  /** "Control", "Experimental" or null for farm-wide codes. */
  scope: string | null;
  metric: string | null;
  valueText: string | null;
  relation: "above" | "below" | "at or above" | "at or below" | null;
  limitText: string | null;
  limitSuffix: string;
  /** Plain sentence without the scope, e.g. "Control at 72%, above the 70% limit". */
  detail: string;
};

function fmt(value: number | null | undefined, digits: number, unit: string): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${value.toFixed(digits)}${unit}`;
}

/** Human text for a firmware or server alert code (DESIGN.md §6). */
export function describeAlert(code: string, ctx: AlertContext = {}): AlertDescription {
  const compartment = codeCompartment(code);
  const scope = compartment === "experimental" ? "Experimental" : compartment === "control" ? "Control" : null;
  const limits = ctx.limits ?? DEFAULT_LIMITS;
  const base = { scope, metric: null, valueText: null, relation: null, limitText: null, limitSuffix: "" } as const;
  const where = scope ?? "Farm";
  const suffix = code.replace(/^[EC]_/, "");

  const climate = (
    title: string,
    metric: string,
    valueText: string | null,
    relation: AlertDescription["relation"],
    limitText: string | null,
    limitSuffix = "",
  ): AlertDescription => {
    const parts = [valueText ? `${where} at ${valueText}` : where];
    if (relation && limitText) parts.push(`${relation} the ${limitText} limit${limitSuffix}`);
    return { title, scope, metric, valueText, relation, limitText, limitSuffix, detail: parts.join(", ") };
  };

  switch (suffix) {
    case "HUM_HIGH": {
      const { high } = humidityLimits(ctx.age, limits);
      return climate("Humidity high", "humidity", fmt(ctx.value, 0, "%"), "above", `${high}%`);
    }
    case "HUM_LOW": {
      const { low } = humidityLimits(ctx.age, limits);
      return climate("Humidity low", "humidity", fmt(ctx.value, 0, "%"), "below", `${low}%`);
    }
    case "WIND_HIGH": {
      const limit = windLimit(ctx.age, limits);
      const forDay = typeof ctx.age === "number" ? ` for day ${ctx.age}` : "";
      return climate("Air speed high", "air speed", fmt(ctx.value, 2, " m/s"), "at or above", fmt(limit, 2, " m/s"), forDay);
    }
    case "TEMP_HIGH":
    case "TEMP_HIGH_CRIT":
      return climate("Temperature high", "temperature", fmt(ctx.value, 1, " °C"), "above", fmt(ctx.setpoint, 1, " °C"), " (setpoint)");
    case "TEMP_LOW":
    case "TEMP_LOW_CRIT":
      return climate("Temperature low", "temperature", fmt(ctx.value, 1, " °C"), "below", fmt(ctx.setpoint, 1, " °C"), " (setpoint)");
    case "TEMP_SENSOR":
      return { ...base, title: "Temperature sensor fault", detail: `${where} DHT22 is not giving valid readings` };
    case "WIND_SENSOR":
      return { ...base, title: "Air speed sensor fault", detail: `${where} anemometer is disconnected or out of range` };
    case "BATT_LOW":
    case "BATT_CRIT": {
      const limit = code === "BATT_CRIT" ? (ctx.battCritV ?? 11.0) : (ctx.battWarnV ?? 11.8);
      return climate(code === "BATT_CRIT" ? "Battery critical" : "Battery low", "battery", fmt(ctx.value, 1, " V"), "at or below", fmt(limit, 1, " V"));
    }
    case "BATT_SENSOR":
      return { ...base, title: "Battery sensor fault", detail: "Battery voltage can't be read" };
    case "DEVICE_OFFLINE":
      return { ...base, title: "Device offline", detail: "No data from the ESP32 for over 12 min" };
    case "SD_ERROR":
      return { ...base, title: "SD card error", detail: "SD card is missing or failing" };
    case "RTC_LOST":
      return { ...base, title: "Clock not set", detail: "The ESP32 clock lost its time" };
    case "AGE_UNKNOWN":
      return { ...base, title: "Flock age unknown", detail: "Set the flock start date in Farm settings" };
    case "BOOT":
      return { ...base, title: "Device restarted", detail: "The ESP32 started up" };
    default:
      return { ...base, title: code.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()), detail: where };
  }
}

/** "just now", "1 min ago", "3 h ago", "2 d ago". */
export function formatAgo(value: string | null | undefined, now: number = Date.now()): string | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  const minutes = Math.max(0, Math.floor((now - ts) / 60_000));
  if (minutes < 1) return "just now";
  return `${formatSpan(minutes)} ago`;
}

/** Duration in minutes as "14 min", "3 h" or "2 d". */
export function formatSpan(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.floor(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

const MANILA = "Asia/Manila";

export function formatClock(value: string | number | Date): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: MANILA }).format(new Date(value));
}

export function formatHour(value: string | number | Date): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: MANILA }).format(new Date(value));
}

/** Two-letter initials for an avatar. */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  // First letters of the first two words, as in the design ("Juan Dela Cruz" -> "JD").
  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Age setpoint (FR-7 table, `age_thresholds`) for a flock day, or null. */
export function setpointForAge(
  thresholds: readonly { from_day: number; to_day: number | null; setpoint_c: number }[],
  age: number | null | undefined,
): number | null {
  if (typeof age !== "number") return null;
  const band = thresholds.find((t) => age >= t.from_day && (t.to_day === null || age <= t.to_day));
  return band ? Number(band.setpoint_c) : null;
}
