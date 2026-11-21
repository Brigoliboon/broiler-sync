import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthUserId } from "@/lib/supabase/server";
import { listDevices, type PublicDevice } from "./devices";
import { listFarms, type Farm } from "./farms";
import { getProfile } from "./profiles";
import { listLatestReadings, type Reading } from "./readings";

export type DashboardItem = {
  farm: Farm;
  device: PublicDevice | null;
  reading: Reading | null;
};

export type DashboardData = {
  role: string;
  items: DashboardItem[];
};

export async function getDashboardData(
  client?: SupabaseClient,
): Promise<DashboardData> {
  const userId = await getAuthUserId();
  const [profile, farms, devices, readings] = await Promise.all([
    userId ? getProfile(userId, client) : Promise.resolve(null),
    listFarms(client),
    listDevices(client),
    listLatestReadings(client),
  ]);
  const deviceByFarm = new Map(devices.map((device) => [device.farm_id, device]));
  const readingByDevice = new Map(
    readings.map((reading) => [reading.device_id, reading]),
  );

  return {
    role: profile?.role ?? "owner",
    items: farms.map((farm) => {
      const device = deviceByFarm.get(farm.id) ?? null;
      return {
        farm,
        device,
        reading: device ? (readingByDevice.get(device.device_id) ?? null) : null,
      };
    }),
  };
}
