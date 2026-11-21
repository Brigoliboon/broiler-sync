import { describe, expect, it } from "vitest";
import { buildIncidents, openIncidents, type AlertEvent } from "./incidents";

let id = 0;
function ev(event: string, code: string, ts: string): AlertEvent {
  id += 1;
  return { id, device_id: "BS-01", ts, received_at: ts, event, code, severity: "warning", message: null, value: null, age: null, source: "device" };
}

describe("incidents", () => {
  it("pairs start and clear and keeps unmatched starts open", () => {
    const events = [
      ev("start", "C_HUM_HIGH", "2026-11-21T13:00:00Z"),
      ev("start", "DEVICE_OFFLINE", "2026-11-21T07:00:00Z"),
      ev("clear", "DEVICE_OFFLINE", "2026-11-21T07:14:00Z"),
      ev("info", "BOOT", "2026-11-21T07:15:00Z"),
    ];
    const all = buildIncidents(events);
    expect(all.map((i) => [i.code, i.open])).toEqual([
      ["C_HUM_HIGH", true],
      ["DEVICE_OFFLINE", false],
    ]);
    expect(all[1].end?.ts).toBe("2026-11-21T07:14:00Z");
    expect(openIncidents(events).map((i) => i.code)).toEqual(["C_HUM_HIGH"]);
  });

  it("ignores repeated starts and stray clears", () => {
    const events = [
      ev("clear", "E_WIND_HIGH", "2026-11-21T01:00:00Z"),
      ev("start", "E_WIND_HIGH", "2026-11-21T02:00:00Z"),
      ev("start", "E_WIND_HIGH", "2026-11-21T02:05:00Z"),
    ];
    const all = buildIncidents(events);
    expect(all).toHaveLength(1);
    expect(all[0].start.ts).toBe("2026-11-21T02:00:00Z");
  });
});
