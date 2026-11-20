export const MAX_BATCH = 20;

const STATUSES = [
  "ok",
  "no_data",
  "range",
  "frozen",
  "disconnected",
  "unknown",
] as const;
const MODES = ["AUTO", "MANUAL"] as const;
const ALERT_LEVELS = ["ok", "warning", "critical"] as const;
const REASONS = ["interval", "alert", "relay", "mode"] as const;
const EVENTS = ["start", "clear", "info"] as const;
const SEVERITIES = ["ok", "warning", "critical"] as const;

type Status = (typeof STATUSES)[number];
type Mode = (typeof MODES)[number];
type AlertLevel = (typeof ALERT_LEVELS)[number];
type Reason = (typeof REASONS)[number];
type Event = (typeof EVENTS)[number];
type Severity = (typeof SEVERITIES)[number];

export type DeviceReading = {
  device_id: string;
  ts: string | null;
  uptime_s: number;
  age: number | null;
  setpoint: number | null;
  e_temp: number | null;
  e_hum: number | null;
  e_wind: number | null;
  e_temp_status: Status | null;
  e_wind_status: Status | null;
  c_temp: number | null;
  c_hum: number | null;
  c_wind: number | null;
  c_temp_status: Status | null;
  c_wind_status: Status | null;
  batt_v: number | null;
  fan: boolean;
  lamp: boolean;
  mode: Mode;
  alert_level: AlertLevel;
  alert_codes: string[];
  reason: Reason | null;
};

export type DeviceAlert = {
  device_id: string;
  ts: string | null;
  uptime_s: number | null;
  event: Event;
  code: string;
  severity: Severity;
  message: string | null;
  value: number | null;
  age: number | null;
};

export type SkippedItem = {
  index: number;
  error: string;
};

export type BatchResult<T> = {
  valid: T[];
  skipped: SkippedItem[];
};

export class BatchValidationError extends Error {}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string or null`);
  }
  return value;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean`);
  }
  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number or null`);
  }
  return value;
}

function nullableInteger(
  value: unknown,
  field: string,
  min?: number,
): number | null {
  const number = nullableNumber(value, field);
  if (number === null) return null;
  if (!Number.isInteger(number)) {
    throw new Error(`${field} must be an integer or null`);
  }
  if (min !== undefined && number < min) {
    throw new Error(`${field} must be at least ${min}`);
  }
  return number;
}

function requiredInteger(value: unknown, field: string, min?: number): number {
  const number = nullableInteger(value, field, min);
  if (number === null) throw new Error(`${field} is required`);
  return number;
}

function requiredEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${field} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function nullableEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T | null {
  if (value === null || value === undefined) return null;
  return requiredEnum(value, field, allowed);
}

function timestamp(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error(`${field} must be an ISO-8601 string or null`);
  }
  const iso =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    );
  if (!iso || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an ISO-8601 string with an offset or Z`);
  }
  return value;
}

function alertCodes(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error("alert_codes must be an array of strings");
  }
  return value.map((item, index) => {
    if (typeof item !== "string") {
      throw new Error(`alert_codes[${index}] must be a string`);
    }
    return item;
  });
}

function validateReading(
  value: unknown,
  expectedDeviceId: string,
): DeviceReading {
  if (!isObject(value)) throw new Error("item must be an object");

  const deviceId = requiredString(value.device_id, "device_id");
  if (deviceId !== expectedDeviceId) {
    throw new Error("device_id does not match x-device-id");
  }

  return {
    device_id: deviceId,
    ts: timestamp(value.ts, "ts"),
    uptime_s: requiredInteger(value.uptime_s, "uptime_s", 0),
    age: nullableInteger(value.age, "age", -1),
    setpoint: nullableNumber(value.setpoint, "setpoint"),
    e_temp: nullableNumber(value.e_temp, "e_temp"),
    e_hum: nullableNumber(value.e_hum, "e_hum"),
    e_wind: nullableNumber(value.e_wind, "e_wind"),
    e_temp_status: nullableEnum(value.e_temp_status, "e_temp_status", STATUSES),
    e_wind_status: nullableEnum(value.e_wind_status, "e_wind_status", STATUSES),
    c_temp: nullableNumber(value.c_temp, "c_temp"),
    c_hum: nullableNumber(value.c_hum, "c_hum"),
    c_wind: nullableNumber(value.c_wind, "c_wind"),
    c_temp_status: nullableEnum(value.c_temp_status, "c_temp_status", STATUSES),
    c_wind_status: nullableEnum(value.c_wind_status, "c_wind_status", STATUSES),
    batt_v: nullableNumber(value.batt_v, "batt_v"),
    fan: requiredBoolean(value.fan, "fan"),
    lamp: requiredBoolean(value.lamp, "lamp"),
    mode: requiredEnum(value.mode, "mode", MODES),
    alert_level: requiredEnum(value.alert_level, "alert_level", ALERT_LEVELS),
    alert_codes: alertCodes(value.alert_codes),
    reason: nullableEnum(value.reason, "reason", REASONS),
  };
}

function validateAlert(value: unknown, expectedDeviceId: string): DeviceAlert {
  if (!isObject(value)) throw new Error("item must be an object");

  const deviceId = requiredString(value.device_id, "device_id");
  if (deviceId !== expectedDeviceId) {
    throw new Error("device_id does not match x-device-id");
  }

  return {
    device_id: deviceId,
    ts: timestamp(value.ts, "ts"),
    uptime_s: nullableInteger(value.uptime_s, "uptime_s", 0),
    event: requiredEnum(value.event, "event", EVENTS),
    code: requiredString(value.code, "code"),
    severity: requiredEnum(value.severity, "severity", SEVERITIES),
    message: nullableString(value.message, "message"),
    value: nullableNumber(value.value, "value"),
    age: nullableInteger(value.age, "age", -1),
  };
}

function validateBatch<T>(
  payload: unknown,
  validateItem: (item: unknown) => T,
): BatchResult<T> {
  if (!Array.isArray(payload)) {
    throw new BatchValidationError("body must be a JSON array");
  }

  const valid: T[] = [];
  const skipped: SkippedItem[] = [];

  for (let index = 0; index < payload.length; index += 1) {
    if (index >= MAX_BATCH) {
      skipped.push({ index, error: `batch is limited to ${MAX_BATCH} items` });
      continue;
    }

    try {
      valid.push(validateItem(payload[index]));
    } catch (error) {
      skipped.push({
        index,
        error: error instanceof Error ? error.message : "invalid item",
      });
    }
  }

  return { valid, skipped };
}

export function validateReadingBatch(
  payload: unknown,
  expectedDeviceId: string,
): BatchResult<DeviceReading> {
  return validateBatch(payload, (item) => validateReading(item, expectedDeviceId));
}

export function validateAlertBatch(
  payload: unknown,
  expectedDeviceId: string,
): BatchResult<DeviceAlert> {
  return validateBatch(payload, (item) => validateAlert(item, expectedDeviceId));
}
