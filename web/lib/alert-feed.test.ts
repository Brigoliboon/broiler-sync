import { describe, expect, it } from "vitest";
import { feedItem } from "./alert-feed";
import type { AlertEvent, Incident } from "./incidents";

const now = Date.parse("2026-11-21T15:30:00Z"); // 11:30 PM Manila

function event(over: Partial<AlertEvent>): AlertEvent {
  return {
    id: 1,
    device_id: "BS-01",
    ts: "2026-11-21T15:18:00Z",
    received_at: "2026-11-21T15:18:00Z",
    event: "start",
    code: "C_HUM_HIGH",
    severity: "warning",
    message: null,
    value: 72,
    age: 12,
    source: "device",
    ...over,
  };
}

describe("alert feed", () => {
  it("describes an open humidity alert", () => {
    const incident: Incident = { key: "a", device_id: "BS-01", code: "C_HUM_HIGH", severity: "warning", start: event({}), end: null, open: true };
    expect(feedItem(incident, now)).toMatchObject({
      title: "Humidity high",
      detail: "Control at 72%, above the 70% limit",
      when: "Today 11:18 PM",
      scope: "Control",
      metric: "hum",
      open: true,
    });
  });

  it("describes a resolved offline incident", () => {
    const start = event({ code: "DEVICE_OFFLINE", value: null, ts: "2026-11-21T07:05:00Z", source: "server" });
    const end = event({ id: 2, code: "DEVICE_OFFLINE", event: "clear", ts: "2026-11-21T07:19:00Z" });
    const incident: Incident = { key: "b", device_id: "BS-01", code: "DEVICE_OFFLINE", severity: "warning", start, end, open: false };
    expect(feedItem(incident, now)).toMatchObject({
      title: "Device was offline",
      detail: "No data for 14 min, back online",
      when: "Today 3:05 PM",
      scope: "Farm",
      metric: "offline",
    });
  });

  it("labels yesterday", () => {
    const incident: Incident = {
      key: "c",
      device_id: "BS-01",
      code: "BATT_LOW",
      severity: "warning",
      start: event({ code: "BATT_LOW", value: 11.7, ts: "2026-11-19T22:30:00Z" }),
      end: null,
      open: true,
    };
    expect(feedItem(incident, now).when).toBe("Yesterday 6:30 AM");
  });
});
