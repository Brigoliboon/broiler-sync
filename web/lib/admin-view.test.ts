import { describe, expect, it } from "vitest";
import type { AdminFarm, AdminOwner } from "@/lib/db/admin";
import { ownerRows, plural } from "./admin-view";

const owner = (id: string, full_name: string, extra: Partial<AdminOwner> = {}): AdminOwner => ({
  id,
  full_name,
  email: `${id}@example.com`,
  role: "owner",
  disabled_at: null,
  created_at: "2026-01-01T00:00:00Z",
  farm_count: 0,
  ...extra,
});

const farm = (id: string, owner_id: string, device: boolean): AdminFarm => ({
  id,
  name: id,
  owner_id,
  owner_name: null,
  created_at: "2026-01-01T00:00:00Z",
  device: device ? { device_id: `bs-${id}`, disabled_at: null, last_seen_at: null } : null,
});

describe("ownerRows", () => {
  it("leaves out admins and counts ESP32s per owner", () => {
    const rows = ownerRows(
      [owner("a", "Juan Dela Cruz", { farm_count: 2 }), owner("x", "Site Admin", { role: "admin" })],
      [farm("f1", "a", true), farm("f2", "a", false), farm("f3", "x", true)],
    );
    expect(rows).toEqual([
      {
        id: "a",
        name: "Juan Dela Cruz",
        email: "a@example.com",
        initials: "JD",
        disabled: false,
        farmCount: 2,
        deviceCount: 1,
      },
    ]);
  });

  it("puts disabled owners last, then sorts by name", () => {
    const rows = ownerRows(
      [
        owner("p", "Pedro Reyes", { disabled_at: "2026-02-01T00:00:00Z" }),
        owner("m", "Maria Santos"),
        owner("j", "Juan Dela Cruz"),
      ],
      [],
    );
    expect(rows.map((row) => [row.id, row.disabled])).toEqual([
      ["j", false],
      ["m", false],
      ["p", true],
    ]);
  });
});

describe("plural", () => {
  it("adds an s except for one", () => {
    expect(plural(1, "farm")).toBe("1 farm");
    expect(plural(3, "farm")).toBe("3 farms");
    expect(plural(0, "farm")).toBe("0 farms");
  });
});
