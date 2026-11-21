import { describe, expect, it } from "vitest";
import { dateList, flockDay, historyHref, manilaDate, parseHistoryQuery, shortDate } from "./history";

// 2026-11-22 01:30 in Manila
const now = Date.parse("2026-11-21T17:30:00Z");

describe("history query", () => {
  it("uses Manila dates", () => {
    expect(manilaDate(now)).toBe("2026-11-22");
    expect(manilaDate("2026-11-21T15:59:59Z")).toBe("2026-11-21");
  });

  it("defaults to the last 7 days of temperature", () => {
    const q = parseHistoryQuery({}, now);
    expect(q).toMatchObject({ range: "7d", metric: "temp", from: "2026-11-16", to: "2026-11-22", end: now });
    expect(new Date(q.start).toISOString()).toBe("2026-11-15T16:00:00.000Z");
  });

  it("supports the last 24 hours", () => {
    const q = parseHistoryQuery({ range: "24h", metric: "hum" }, now);
    expect(q).toMatchObject({ range: "24h", metric: "hum", from: "2026-11-21", to: "2026-11-22" });
    expect(q.end - q.start).toBe(24 * 60 * 60 * 1000);
  });

  it("clamps custom ranges", () => {
    expect(parseHistoryQuery({ range: "custom", from: "2026-11-01", to: "2026-11-05" }, now)).toMatchObject({
      from: "2026-11-01",
      to: "2026-11-05",
    });
    // future end, bad start
    expect(parseHistoryQuery({ range: "custom", from: "nope", to: "2027-01-01" }, now)).toMatchObject({
      from: "2026-11-16",
      to: "2026-11-22",
    });
    // longer than 31 days
    expect(parseHistoryQuery({ range: "custom", from: "2026-01-01", to: "2026-11-22" }, now).from).toBe("2026-10-23");
    // invalid calendar date
    expect(parseHistoryQuery({ range: "custom", from: "2026-02-30", to: "2026-03-02" }, now).from).toBe("2026-02-24");
  });

  it("builds links that keep the other choice", () => {
    const q = parseHistoryQuery({ range: "custom", from: "2026-11-01", to: "2026-11-05" }, now);
    expect(historyHref(q, { metric: "wind" })).toBe("/history?range=custom&metric=wind&from=2026-11-01&to=2026-11-05");
    expect(historyHref(q, { range: "7d" })).toBe("/history");
  });
});

describe("dates", () => {
  it("lists days and flock days", () => {
    expect(dateList("2026-11-30", "2026-12-02")).toEqual(["2026-11-30", "2026-12-01", "2026-12-02"]);
    expect(flockDay("2026-11-21", "2026-11-09")).toBe(12);
    expect(flockDay("2026-11-01", "2026-11-09")).toBeNull();
    expect(flockDay("2026-11-21", null)).toBeNull();
    expect(shortDate("2026-11-21")).toBe("Nov 21");
  });
});
