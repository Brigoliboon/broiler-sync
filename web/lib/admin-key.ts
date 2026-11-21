import { randomBytes } from "node:crypto";

export function generateDeviceKey(): string {
  return randomBytes(32).toString("base64url");
}
