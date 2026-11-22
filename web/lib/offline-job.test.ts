import { describe, expect, it } from "vitest";
import { DEVICE_OFFLINE_MS } from "./dashboard-utils";
import {
  DEVICE_OFFLINE_CODE,
  DEVICE_OFFLINE_MESSAGE,
  DEVICE_OFFLINE_SEVERITY,
  isStaleLastSeen,
  offlineAlertRow,
  shouldOpenOfflineAlert,
} from "./offline-job";

const now = Date.parse("2026-11-22T06:00:00Z");

function device(overrides: { last_seen_at?: string | null; disabled_at?: string | null } = {}) {
  return {
    device_id: "BS-01",
    last_seen_at: overrides.last_seen_at === undefined
      ? new Date(now - DEVICE_OFFLINE_MS - 1).toISOString()
      : overrides.last_seen_at,
    disabled_at: overrides.disabled_at ?? null,
  };
}

describe("isStaleLastSeen", () => {
  it("is not stale just under the 12 minute timeout", () => {
    expect(isStaleLastSeen(new Date(now - DEVICE_OFFLINE_MS + 1).toISOString(), now)).toBe(false);
  });

  it("is stale at or beyond the timeout", () => {
    expect(isStaleLastSeen(new Date(now - DEVICE_OFFLINE_MS).toISOString(), now)).toBe(true);
    expect(isStaleLastSeen(new Date(now - DEVICE_OFFLINE_MS - 60_000).toISOString(), now)).toBe(true);
  });

  it("ignores missing, invalid and future last_seen_at", () => {
    expect(isStaleLastSeen(null, now)).toBe(false);
    expect(isStaleLastSeen("not-a-date", now)).toBe(false);
    expect(isStaleLastSeen(new Date(now + 60_000).toISOString(), now)).toBe(false);
  });
});

describe("shouldOpenOfflineAlert (dedupe)", () => {
  it("opens a start when a live device has been silent too long and has no open incident", () => {
    expect(shouldOpenOfflineAlert(device(), null, now)).toBe(true);
    expect(shouldOpenOfflineAlert(device(), "clear", now)).toBe(true);
  });

  it("does not open a second start while an outage is already open", () => {
    expect(shouldOpenOfflineAlert(device(), "start", now)).toBe(false);
  });

  it("opens again after a clear, once the device is stale (new outage)", () => {
    expect(shouldOpenOfflineAlert(device(), "clear", now)).toBe(true);
  });

  it("does not open for a device that is still checking in", () => {
    const recent = device({ last_seen_at: new Date(now - 5 * 60 * 1000).toISOString() });
    expect(shouldOpenOfflineAlert(recent, null, now)).toBe(false);
    expect(shouldOpenOfflineAlert(recent, "clear", now)).toBe(false);
  });

  it("does not open for a device that has never checked in", () => {
    expect(shouldOpenOfflineAlert(device({ last_seen_at: null }), null, now)).toBe(false);
  });

  it("does not open for a disabled device, even if last_seen_at is stale", () => {
    expect(
      shouldOpenOfflineAlert(device({ disabled_at: "2026-11-21T00:00:00Z" }), "clear", now),
    ).toBe(false);
  });
});

describe("offlineAlertRow", () => {
  it("builds a server start row for DEVICE_OFFLINE", () => {
    expect(offlineAlertRow("BS-01", "2026-11-22T06:00:00.000Z")).toEqual({
      device_id: "BS-01",
      ts: "2026-11-22T06:00:00.000Z",
      uptime_s: null,
      event: "start",
      code: DEVICE_OFFLINE_CODE,
      severity: DEVICE_OFFLINE_SEVERITY,
      message: DEVICE_OFFLINE_MESSAGE,
      value: null,
      age: null,
      source: "server",
    });
  });
});
