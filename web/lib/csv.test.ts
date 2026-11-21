import { describe, expect, it } from "vitest";
import { csvEscape, csvLine, exportFilename, manilaTimestamp, parseExportQuery, rowValues } from "./csv";

const farm = "6f1c2a1e-3b4d-4c5e-8f90-123456789abc";

describe("csv", () => {
  it("escapes values for Excel", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape('a "b", c')).toBe('"a ""b"", c"');
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(-1.5)).toBe("-1.5");
    expect(csvEscape("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvLine(["x", 1, true])).toBe("x,1,true\r\n");
  });

  it("formats rows in Manila time", () => {
    expect(manilaTimestamp("2026-11-21T15:18:05Z")).toBe("2026-11-21 23:18:05");
    expect(
      rowValues({ ts: "2026-11-21T15:18:05Z", compartment_slug: "control", temp: 25.9, hum: 72, wind: 0.08, fan: false, lamp: true, mode: "AUTO" }),
    ).toEqual(["2026-11-21 23:18:05", "Control", 25.9, 72, 0.08, "OFF", "ON", "Auto"]);
  });

  it("validates the query", () => {
    const ok = parseExportQuery(new URLSearchParams({ farm_id: farm, from: "2026-11-09", to: "2026-11-21" }), "2026-11-22");
    expect(ok).toEqual({
      farmId: farm,
      from: "2026-11-09",
      to: "2026-11-21",
      compartment: "both",
      start: "2026-11-08T16:00:00.000Z",
      end: "2026-11-21T16:00:00.000Z",
    });
    expect(parseExportQuery({ farm_id: "x", from: "2026-11-09", to: "2026-11-21" }, "2026-11-22")).toHaveProperty("error");
    expect(parseExportQuery({ farm_id: farm, from: "2026-11-21", to: "2026-11-09" }, "2026-11-22")).toHaveProperty("error");
    expect(parseExportQuery({ farm_id: farm, from: "2026-11-21", to: "2026-11-23" }, "2026-11-22")).toHaveProperty("error");
    expect(parseExportQuery({ farm_id: farm, from: "2026-01-01", to: "2026-11-21" }, "2026-11-22")).toHaveProperty("error");
    expect(parseExportQuery({ farm_id: farm, from: "2026-11-09", to: "2026-11-21", compartment: "attic" }, "2026-11-22")).toHaveProperty("error");
  });

  it("builds a safe filename", () => {
    expect(exportFilename("Dela Cruz Farm #2", "2026-11-09", "2026-11-21")).toBe("broilersync-dela-cruz-farm-2-2026-11-09-to-2026-11-21.csv");
  });
});
