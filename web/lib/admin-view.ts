import type { AdminFarm, AdminOwner } from "@/lib/db/admin";
import { initials } from "@/lib/climate";

/** One owner row on the Admin · Owners screen (frame 08). */
export type OwnerRow = {
  id: string;
  name: string;
  email: string | null;
  initials: string;
  disabled: boolean;
  farmCount: number;
  deviceCount: number;
};

/**
 * Owner accounts (admins left out) with their farm and ESP32 counts, active
 * owners first, then by name.
 */
export function ownerRows(owners: AdminOwner[], farms: AdminFarm[]): OwnerRow[] {
  const devices = new Map<string, number>();
  for (const farm of farms) {
    if (farm.device) devices.set(farm.owner_id, (devices.get(farm.owner_id) ?? 0) + 1);
  }
  return owners
    .filter((owner) => owner.role === "owner")
    .map((owner) => ({
      id: owner.id,
      name: owner.full_name,
      email: owner.email,
      initials: initials(owner.full_name),
      disabled: owner.disabled_at !== null,
      farmCount: owner.farm_count,
      deviceCount: devices.get(owner.id) ?? 0,
    }))
    .sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.name.localeCompare(b.name));
}

/** "1 farm" / "3 farms". */
export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
