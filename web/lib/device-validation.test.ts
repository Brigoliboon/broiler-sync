import { describe, expect, it } from "vitest";
import {
  BatchValidationError,
  MAX_BATCH,
  validateAlertBatch,
  validateReadingBatch,
} from "./device-validation";

const DEVICE_ID = "farm-01";

function reading(overrides: Record<string, unknown> = {}) {
  return {
    device_id: DEVICE_ID,
    ts: "2026-11-20T03:12:00+08:00",
    uptime_s: 3600,
    age: 4,
    setpoint: 27,
    e_temp: 28.1,
    e_hum: 62,
    e_wind: 0.08,
    e_temp_status: "ok",
    e_wind_status: "ok",
    c_temp: 27.4,
    c_hum: 64,
    c_wind: 0.05,
    c_temp_status: "ok",
    c_wind_status: "ok",
    batt_v: 12.41,
    fan: true,
    lamp: false,
    mode: "AUTO",
    alert_level: "ok",
    alert_codes: [],
    reason: "interval",
    ...overrides,
  };
}

function alert(overrides: Record<string, unknown> = {}) {
  return {
    device_id: DEVICE_ID,
    ts: "2026-11-20T03:12:00+08:00",
    uptime_s: 3600,
    event: "start",
    code: "E_HUM_LOW",
    severity: "warning",
    message: "Experimental humidity too low",
    value: 47.2,
    age: 4,
    ...overrides,
  };
}

describe("validateReadingBatch", () => {
  it("accepts a well-formed firmware snapshot", () => {
    const result = validateReadingBatch([reading()], DEVICE_ID);

    expect(result.skipped).toEqual([]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].alert_codes).toEqual([]);
  });

  it("accepts null values from the SD buffer", () => {
    const result = validateReadingBatch(
      [
        reading({
          ts: null,
          e_temp: null,
          c_temp: null,
          batt_v: null,
          e_temp_status: null,
          reason: null,
        }),
      ],
      DEVICE_ID,
    );

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].e_temp).toBeNull();
  });

  it("skips items with the wrong device id", () => {
    const result = validateReadingBatch(
      [reading({ device_id: "other-farm" }), reading()],
      DEVICE_ID,
    );

    expect(result.valid).toHaveLength(1);
    expect(result.skipped).toEqual([
      { index: 0, error: "device_id does not match x-device-id" },
    ]);
  });

  it("skips invalid enums and timestamps", () => {
    const result = validateReadingBatch(
      [
        reading({ mode: "AUTO " }),
        reading({ e_temp_status: "bad" }),
        reading({ ts: "not-a-date" }),
      ],
      DEVICE_ID,
    );

    expect(result.valid).toHaveLength(0);
    expect(result.skipped.map((item) => item.index)).toEqual([0, 1, 2]);
  });

  it("skips items beyond the sync batch limit", () => {
    const payload = Array.from({ length: MAX_BATCH + 1 }, () => reading());
    const result = validateReadingBatch(payload, DEVICE_ID);

    expect(result.valid).toHaveLength(MAX_BATCH);
    expect(result.skipped).toEqual([
      { index: MAX_BATCH, error: `batch is limited to ${MAX_BATCH} items` },
    ]);
  });

  it("rejects a body that is not an array", () => {
    expect(() => validateReadingBatch({}, DEVICE_ID)).toThrow(
      BatchValidationError,
    );
  });
});

describe("validateAlertBatch", () => {
  it("accepts a device event", () => {
    const result = validateAlertBatch([alert()], DEVICE_ID);

    expect(result.valid).toHaveLength(1);
    expect(result.skipped).toEqual([]);
  });

  it("skips invalid events and keeps valid ones", () => {
    const result = validateAlertBatch(
      [alert(), alert({ event: "unknown" }), alert({ severity: "info" })],
      DEVICE_ID,
    );

    expect(result.valid).toHaveLength(1);
    expect(result.skipped.map((item) => item.index)).toEqual([1, 2]);
  });
});


// Mirrors firmware/cloud.cpp csvToJson() + firmware/storage.cpp column layout.
const CSV_COL_NAMES = [
  "ts",
  "uptime_s",
  "age",
  "setpoint",
  "e_temp",
  "e_hum",
  "e_wind",
  "e_temp_status",
  "e_wind_status",
  "c_temp",
  "c_hum",
  "c_wind",
  "c_temp_status",
  "c_wind_status",
  "batt_v",
  "fan",
  "lamp",
  "mode",
  "alert_level",
  "alert_codes",
  "reason",
] as const;
const CSV_COL_TYPES = "SIIFFFFSSFFFSSFBBSSAS";

function csvLineToReading(line: string, deviceId: string): Record<string, unknown> {
  const out: Record<string, unknown> = { device_id: deviceId };
  let start = 0;
  for (let col = 0; col < CSV_COL_NAMES.length; col += 1) {
    const comma = line.indexOf(",", start);
    const field = (comma < 0 ? line.slice(start) : line.slice(start, comma)).trim();
    start = comma < 0 ? line.length : comma + 1;
    const name = CSV_COL_NAMES[col];
    const type = CSV_COL_TYPES[col];
    switch (type) {
      case "S":
        out[name] = field.length ? field : null;
        break;
      case "I":
        out[name] = field.length ? Number.parseInt(field, 10) : null;
        break;
      case "F":
        out[name] = field.length ? Number.parseFloat(field) : null;
        break;
      case "B":
        out[name] = field === "1";
        break;
      case "A":
        out[name] = field.length ? field.split("|").filter(Boolean) : [];
        break;
      default:
        throw new Error(`unknown column type ${type}`);
    }
  }
  return out;
}

// Typical interval snapshot (DESIGN.md §5.3 field set) as the firmware would log it.
const HEALTHY_CSV =
  "2026-11-21T16:36:38+08:00,10,7,27.0,28.1,62.0,0.08,ok,ok,27.4,64.0,0.05,ok,ok,12.41,1,0,AUTO,ok,,interval";

// RTC unset (empty ts) and faulted DHT/anemometer/battery fields (NaN written as empty).
const FAULTED_RTC_UNSET_CSV =
  ",8,7,,,,,unknown,unknown,,,,unknown,unknown,,0,0,AUTO,ok,,interval";

describe("firmware readings payload", () => {
  it("accepts a sample line from the firmware serializer", () => {
    const payload = [csvLineToReading(HEALTHY_CSV, DEVICE_ID)];
    const result = validateReadingBatch(payload, DEVICE_ID);

    expect(result.skipped).toEqual([]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]).toMatchObject({
      device_id: DEVICE_ID,
      ts: "2026-11-21T16:36:38+08:00",
      uptime_s: 10,
      age: 7,
      e_temp: 28.1,
      fan: true,
      lamp: false,
      mode: "AUTO",
      alert_codes: [],
      reason: "interval",
    });
  });

  it("accepts a faulted-sensor reading with an unset RTC", () => {
    const payload = [csvLineToReading(FAULTED_RTC_UNSET_CSV, DEVICE_ID)];
    const result = validateReadingBatch(payload, DEVICE_ID);

    expect(result.skipped).toEqual([]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].ts).toBeNull();
    expect(result.valid[0].e_temp).toBeNull();
    expect(result.valid[0].c_temp).toBeNull();
    expect(result.valid[0].batt_v).toBeNull();
    expect(result.valid[0].e_temp_status).toBe("unknown");
    expect(result.valid[0].setpoint).toBeNull();
    expect(result.valid[0].fan).toBe(false);
  });

  it("documents the pre-#14 body that made the API return 400", () => {
    const item = csvLineToReading(HEALTHY_CSV, DEVICE_ID);
    const objectJson = JSON.stringify(item);
    // ArduinoJson cleared the accumulating "[...]" String, leaving `{...}]`.
    const broken = `${objectJson}]`;
    expect(() => JSON.parse(broken)).toThrow();
    const fixed = `[${objectJson}]`;
    expect(validateReadingBatch(JSON.parse(fixed), DEVICE_ID).skipped).toEqual([]);
  });
});
