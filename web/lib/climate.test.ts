import { describe, expect, it } from "vitest";
import {
  compartmentAlerts,
  describeAlert,
  formatAgo,
  formatSpan,
  humidityLimits,
  initials,
  sortBySeverity,
  windLimit,
} from "./climate";

describe("climate limits", () => {
  it("uses the brooding humidity floor on days 0-3", () => {
    expect(humidityLimits(0)).toEqual({ low: 60, high: 70 });
    expect(humidityLimits(3)).toEqual({ low: 60, high: 70 });
    expect(humidityLimits(4)).toEqual({ low: 50, high: 70 });
    expect(humidityLimits(null)).toEqual({ low: 50, high: 70 });
  });

  it("picks the air speed limit by age and none after day 28", () => {
    expect(windLimit(12)).toBe(0.15);
    expect(windLimit(15)).toBe(0.3);
    expect(windLimit(28)).toBe(0.5);
    expect(windLimit(29)).toBeNull();
    expect(windLimit(null)).toBeNull();
  });
});

describe("alert codes", () => {
  it("groups compartment codes by metric", () => {
    const flags = compartmentAlerts(["C_HUM_HIGH", "E_TEMP_HIGH", "BATT_LOW"], "control");
    expect(flags).toMatchObject({ count: 1, hum: true, temp: false, wind: false });
    expect(compartmentAlerts(null, "experimental").count).toBe(0);
  });

  it("sorts critical codes first", () => {
    expect(sortBySeverity(["C_HUM_HIGH", "BATT_CRIT", "E_WIND_HIGH"])).toEqual(["BATT_CRIT", "C_HUM_HIGH", "E_WIND_HIGH"]);
  });

  it("describes a humidity alert like the design", () => {
    const d = describeAlert("C_HUM_HIGH", { value: 72.4, age: 12 });
    expect(d).toMatchObject({ title: "Humidity high", scope: "Control", valueText: "72%", relation: "above", limitText: "70%" });
    expect(d.detail).toBe("Control at 72%, above the 70% limit");
  });

  it("describes an air speed alert with the day limit", () => {
    expect(describeAlert("E_WIND_HIGH", { value: 0.31, age: 18 }).detail).toBe(
      "Experimental at 0.31 m/s, at or above the 0.30 m/s limit for day 18",
    );
  });

  it("falls back to text for codes without values", () => {
    expect(describeAlert("DEVICE_OFFLINE").title).toBe("Device offline");
    expect(describeAlert("SOMETHING_NEW").title).toBe("Something new");
  });
});

describe("formatting", () => {
  const now = Date.parse("2026-11-22T10:00:00Z");
  it("formats relative times", () => {
    expect(formatAgo("2026-11-22T09:59:40Z", now)).toBe("just now");
    expect(formatAgo("2026-11-22T09:59:00Z", now)).toBe("1 min ago");
    expect(formatAgo("2026-11-22T07:00:00Z", now)).toBe("3 h ago");
    expect(formatAgo(null, now)).toBeNull();
    expect(formatSpan(60 * 50)).toBe("2 d");
  });

  it("makes initials", () => {
    expect(initials("Juan Dela Cruz")).toBe("JD");
    expect(initials("Maria")).toBe("M");
    expect(initials("")).toBe("?");
  });
});
