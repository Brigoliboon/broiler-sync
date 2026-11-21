import { describe, expect, it } from "vitest";
import { minMax, polylines, valueDomain } from "./chart";

const scale = { x0: 0, x1: 100, y0: 0, y1: 10, width: 100, height: 10 };

describe("chart geometry", () => {
  it("projects points into the viewBox", () => {
    expect(polylines([{ t: 0, v: 0 }, { t: 100, v: 10 }], scale, 1000)).toEqual(["0,10 100,0"]);
  });

  it("breaks lines on nulls and long gaps", () => {
    const runs = polylines(
      [
        { t: 0, v: 1 },
        { t: 10, v: 2 },
        { t: 20, v: null },
        { t: 30, v: 3 },
        { t: 40, v: 4 },
        { t: 90, v: 5 },
      ],
      scale,
      20,
    );
    expect(runs).toHaveLength(2);
  });

  it("pads the domain and includes the band", () => {
    expect(valueDomain([[{ t: 0, v: 25 }]], { min: 24, max: 26 })).toEqual({ min: 23.5, max: 26.5 });
    expect(valueDomain([[]])).toBeNull();
    expect(minMax([{ t: 0, v: 3 }, { t: 1, v: null }, { t: 2, v: 1 }])).toEqual({ min: 1, max: 3 });
  });
});
