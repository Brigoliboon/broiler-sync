import { describe, expect, it } from "vitest";
import { authorizeCron } from "./cron-auth";

function request(authorization?: string) {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return new Request("https://example.test/api/cron/device-offline", { headers });
}

describe("authorizeCron", () => {
  it("rejects when CRON_SECRET is unset or the bearer is wrong", () => {
    expect(authorizeCron(request("Bearer secret"), undefined)).toBe(false);
    expect(authorizeCron(request("Bearer secret"), "")).toBe(false);
    expect(authorizeCron(request(), "secret")).toBe(false);
    expect(authorizeCron(request("Bearer other"), "secret")).toBe(false);
    expect(authorizeCron(request("secret"), "secret")).toBe(false);
  });

  it("accepts a matching bearer token", () => {
    expect(authorizeCron(request("Bearer secret"), "secret")).toBe(true);
  });
});
