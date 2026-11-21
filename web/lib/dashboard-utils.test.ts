import { describe, expect, it } from "vitest";
import {
  DEVICE_OFFLINE_MS,
  formatNumber,
  formatTime,
  isDeviceOnline,
} from "./dashboard-utils";

const NOW = Date.parse("2026-11-21T12:00:00Z");

describe("isDeviceOnline", () => {
  it("treats recent contact as online", () => {
    expect(
      isDeviceOnline("2026-11-21T11:55:00Z", NOW),
    ).toBe(true);
  });

  it("treats old contact and null as offline", () => {
    expect(isDeviceOnline("2026-11-21T11:40:00Z", NOW)).toBe(false);
    expect(isDeviceOnline(null, NOW)).toBe(false);
  });

  it("uses the 12 minute threshold", () => {
    expect(isDeviceOnline(new Date(NOW - DEVICE_OFFLINE_MS + 1).toISOString(), NOW)).toBe(true);
    expect(isDeviceOnline(new Date(NOW - DEVICE_OFFLINE_MS).toISOString(), NOW)).toBe(false);
  });
});

describe("formatNumber", () => {
  it("formats finite values and hides missing ones", () => {
    expect(formatNumber(26.14, 1, "°C")).toBe("26.1°C");
    expect(formatNumber(12.4, 2, " V")).toBe("12.40 V");
    expect(formatNumber(null, 1, "°C")).toBe("—");
  });
});

describe("formatTime", () => {
  it("formats a timestamp and hides missing ones", () => {
    expect(formatTime(null)).toBe("—");
    expect(formatTime("bad")).toBe("bad");
    expect(formatTime("2026-11-21T04:00:00+08:00")).toContain("Nov 21, 2026");
  });
});
