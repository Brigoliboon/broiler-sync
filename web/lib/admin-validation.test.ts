import { describe, expect, it } from "vitest";
import {
  AdminValidationError,
  validateDisabledInput,
  validateFarmInput,
  validateOwnerInput,
} from "./admin-validation";
import { generateDeviceKey } from "./admin-key";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";

describe("validateOwnerInput", () => {
  it("accepts a valid owner", () => {
    expect(
      validateOwnerInput({
        email: "Owner@Example.com",
        full_name: "Farm Owner",
        password: "password123",
      }),
    ).toEqual({
      email: "owner@example.com",
      fullName: "Farm Owner",
      password: "password123",
    });
  });

  it("rejects bad email and weak password", () => {
    expect(() =>
      validateOwnerInput({
        email: "bad",
        full_name: "Farm Owner",
        password: "password123",
      }),
    ).toThrow(AdminValidationError);

    expect(() =>
      validateOwnerInput({
        email: "owner@example.com",
        full_name: "Farm Owner",
        password: "short",
      }),
    ).toThrow(AdminValidationError);
  });
});

describe("validateFarmInput", () => {
  it("accepts a valid farm and device id", () => {
    expect(
      validateFarmInput({
        owner_id: OWNER_ID,
        farm_name: "Test Farm",
        device_id: "FARM-01",
      }),
    ).toEqual({
      ownerId: OWNER_ID,
      farmName: "Test Farm",
      deviceId: "farm-01",
    });
  });

  it("rejects bad owner id and device id", () => {
    expect(() =>
      validateFarmInput({
        owner_id: "not-a-uuid",
        farm_name: "Test Farm",
        device_id: "farm-01",
      }),
    ).toThrow(AdminValidationError);

    expect(() =>
      validateFarmInput({
        owner_id: OWNER_ID,
        farm_name: "Test Farm",
        device_id: "bad_device",
      }),
    ).toThrow(AdminValidationError);
  });
});

describe("validateDisabledInput", () => {
  it("requires a boolean", () => {
    expect(validateDisabledInput({ disabled: true })).toBe(true);
    expect(() => validateDisabledInput({ disabled: "yes" })).toThrow(
      AdminValidationError,
    );
  });
});

describe("generateDeviceKey", () => {
  it("generates a long URL-safe key", () => {
    const key = generateDeviceKey();
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(key.length).toBeGreaterThanOrEqual(40);
  });
});
