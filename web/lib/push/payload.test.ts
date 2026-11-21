import { describe, expect, it } from "vitest";
import { buildPayload, isGoneStatus, shouldPush } from "./payload";

const now = Date.parse("2026-11-22T00:00:00Z");

describe("push rules", () => {
  it("pushes only fresh start events that are not info", () => {
    expect(shouldPush({ event: "start", code: "C_HUM_HIGH", severity: "warning", ts: "2026-11-21T23:50:00Z" }, now)).toBe(true);
    expect(shouldPush({ event: "clear", code: "C_HUM_HIGH", severity: "warning", ts: "2026-11-21T23:50:00Z" }, now)).toBe(false);
    expect(shouldPush({ event: "info", code: "BOOT", severity: "ok", ts: null }, now)).toBe(false);
    expect(shouldPush({ event: "start", code: "BOOT", severity: "ok", ts: null }, now)).toBe(false);
    // backfilled after an outage
    expect(shouldPush({ event: "start", code: "BATT_LOW", severity: "warning", ts: "2026-11-21T20:00:00Z" }, now)).toBe(false);
    // unknown time (RTC unset) still notifies
    expect(shouldPush({ event: "start", code: "RTC_LOST", severity: "warning", ts: null }, now)).toBe(true);
  });

  it("builds a payload without secrets", () => {
    const payload = buildPayload(
      { event: "start", code: "C_HUM_HIGH", severity: "warning", ts: "2026-11-21T23:50:00Z", message: "hum 72" },
      "BS-01",
      "Dela Cruz Farm",
      { title: "Humidity high", detail: "Control at 72%, above the 70% limit" },
    );
    expect(payload).toEqual({
      code: "C_HUM_HIGH",
      severity: "warning",
      message: "hum 72",
      device_id: "BS-01",
      ts: "2026-11-21T23:50:00Z",
      farm_name: "Dela Cruz Farm",
      title: "Dela Cruz Farm: Humidity high",
      body: "Control at 72%, above the 70% limit",
    });
  });

  it("treats 404 and 410 as gone", () => {
    expect(isGoneStatus(410)).toBe(true);
    expect(isGoneStatus(404)).toBe(true);
    expect(isGoneStatus(500)).toBe(false);
  });
});
