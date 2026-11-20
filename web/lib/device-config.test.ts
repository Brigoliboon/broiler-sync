import { describe, expect, it } from "vitest";
import { defaultDeviceConfig, deviceConfigFromRow } from "./device-config";

describe("deviceConfigFromRow", () => {
  it("returns a complete default config when no row exists", () => {
    const config = deviceConfigFromRow(null);

    expect(config).toEqual(defaultDeviceConfig);
    expect(config.wind_alert_ms).toEqual([0.15, 0.3, 0.5]);
  });

  it("maps a stored row and ignores unknown fields", () => {
    const config = deviceConfigFromRow({
      device_id: "farm-01",
      flock_start: "2026-11-01",
      age_override_days: 7,
      mode: "manual",
      fan_on_delta: 2.5,
      wind_alert_ms: [0.2, 0.4, 0.6],
      wind_alert_until_days: [10, 20, 30],
      manual_id: 3,
      manual_fan: true,
      updated_at: "2026-11-20T00:00:00Z",
    });

    expect(config.flock_start).toBe("2026-11-01");
    expect(config.age_override_days).toBe(7);
    expect(config.mode).toBe("manual");
    expect(config.fan_on_delta).toBe(2.5);
    expect(config.wind_alert_ms).toEqual([0.2, 0.4, 0.6]);
    expect(config.wind_alert_until_days).toEqual([10, 20, 30]);
    expect(config.manual_id).toBe(3);
    expect(config.manual_fan).toBe(true);
    expect(config.fan_off_delta).toBe(defaultDeviceConfig.fan_off_delta);
    expect(config).not.toHaveProperty("device_id");
    expect(config).not.toHaveProperty("updated_at");
  });

  it("falls back when arrays are malformed", () => {
    const config = deviceConfigFromRow({
      wind_alert_ms: [0.2],
      wind_alert_until_days: null,
    });

    expect(config.wind_alert_ms).toEqual(defaultDeviceConfig.wind_alert_ms);
    expect(config.wind_alert_until_days).toEqual(
      defaultDeviceConfig.wind_alert_until_days,
    );
  });
});
