import { describe, expect, it } from "vitest";
import { DEVICE_PUBLIC_COLUMNS } from "./devices";
import { DbError, throwIfError } from "./errors";
import { PROFILE_COLUMNS } from "./profiles";
import { READING_COLUMNS } from "./readings";

describe("throwIfError", () => {
  it("returns data when the query succeeded", () => {
    expect(throwIfError({ data: [1], error: null }, "failed")).toEqual([1]);
  });

  it("throws a DbError with the query message", () => {
    expect(() =>
      throwIfError(
        { data: null, error: { message: "permission denied", code: "42501" } },
        "could not list farms",
      ),
    ).toThrowError(DbError);

    try {
      throwIfError(
        { data: null, error: { message: "permission denied", code: "42501" } },
        "could not list farms",
      );
    } catch (error) {
      expect(error).toBeInstanceOf(DbError);
      expect((error as DbError).message).toBe(
        "could not list farms: permission denied",
      );
      expect((error as DbError).code).toBe("42501");
    }
  });
});

describe("column lists", () => {
  it("never selects devices.key_hash", () => {
    expect(DEVICE_PUBLIC_COLUMNS).not.toContain("key_hash");
    expect(DEVICE_PUBLIC_COLUMNS).toContain("device_id");
    expect(DEVICE_PUBLIC_COLUMNS).toContain("farm_id");
  });

  it("selects explicit profile and reading columns", () => {
    expect(PROFILE_COLUMNS).toContain("role");
    expect(PROFILE_COLUMNS).toContain("disabled_at");
    expect(READING_COLUMNS).toContain("e_temp");
    expect(READING_COLUMNS).toContain("c_temp");
    expect(READING_COLUMNS).not.toContain("*");
  });
});
