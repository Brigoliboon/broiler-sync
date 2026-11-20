import { createHash, timingSafeEqual } from "node:crypto";

export function hashDeviceKey(key: string): string {
  const pepper = process.env.DEVICE_KEY_PEPPER ?? "";
  return createHash("sha256").update(`${pepper}${key}`).digest("hex");
}

export function deviceKeyMatches(key: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashDeviceKey(key), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
