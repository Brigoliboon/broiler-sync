import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { deviceKeyMatches, hashDeviceKey } from "./device-key";

const originalPepper = process.env.DEVICE_KEY_PEPPER;

afterEach(() => {
  if (originalPepper === undefined) {
    delete process.env.DEVICE_KEY_PEPPER;
  } else {
    process.env.DEVICE_KEY_PEPPER = originalPepper;
  }
});

describe("device keys", () => {
  it("hashes with the optional server pepper", () => {
    process.env.DEVICE_KEY_PEPPER = "pepper";
    const expected = createHash("sha256")
      .update("peppersecret")
      .digest("hex");

    expect(hashDeviceKey("secret")).toBe(expected);
    expect(deviceKeyMatches("secret", expected)).toBe(true);
    expect(deviceKeyMatches("wrong", expected)).toBe(false);
  });

  it("hashes without a pepper when unset", () => {
    delete process.env.DEVICE_KEY_PEPPER;
    const expected = createHash("sha256").update("secret").digest("hex");

    expect(hashDeviceKey("secret")).toBe(expected);
    expect(deviceKeyMatches("secret", expected)).toBe(true);
  });

  it("rejects malformed stored hashes", () => {
    expect(deviceKeyMatches("secret", "not-hex")).toBe(false);
  });
});
