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
