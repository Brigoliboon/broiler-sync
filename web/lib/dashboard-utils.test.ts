import { describe, expect, it } from "vitest";
import {
  DEVICE_OFFLINE_MS,
  formatNumber,
  formatTime,
  isDeviceOnline,
} from "./dashboard-utils";

const now = new Date("2026-11-21T12:00:00Z").getTime();

describe("dashboard utilities", () => {
  describe("isDeviceOnline", () => {
    it("treats a recent check-in as online", () => {
      expect(
        isDeviceOnline(new Date(now - 5 * 60 * 1000).toISOString(), now),
      ).toBe(true);
    });

    it("treats a check-in at or beyond the offline threshold as offline", () => {
      expect(isDeviceOnline(new Date(now - DEVICE_OFFLINE_MS).toISOString(), now)).toBe(false);
      expect(isDeviceOnline(new Date(now - DEVICE_OFFLINE_MS - 1).toISOString(), now)).toBe(false);
    });

    it("treats missing, invalid and future timestamps as offline", () => {
      expect(isDeviceOnline(null, now)).toBe(false);
      expect(isDeviceOnline("not-a-date", now)).toBe(false);
      expect(isDeviceOnline(new Date(now + 60 * 1000).toISOString(), now)).toBe(false);
    });
  });

  describe("formatNumber", () => {
    it("formats numbers with digits and a unit", () => {
      expect(formatNumber(28.123, 1, "°C")).toBe("28.1°C");
      expect(formatNumber(0.05, 2, " m/s")).toBe("0.05 m/s");
    });

    it("returns a dash for missing or invalid values", () => {
      expect(formatNumber(null, 1)).toBe("—");
      expect(formatNumber(undefined, 1)).toBe("—");
      expect(formatNumber(Number.NaN, 1)).toBe("—");
    });
  });

  describe("formatTime", () => {
    it("returns a dash for missing values and the raw value for invalid ones", () => {
      expect(formatTime(null)).toBe("—");
      expect(formatTime("bad")).toBe("bad");
    });

    it("formats an instant in Asia/Manila", () => {
      const formatted = formatTime("2026-11-21T02:30:00Z");
      expect(formatted).toContain("Nov 21, 2026");
      expect(formatted).toContain("10:30");
    });
  });
});
