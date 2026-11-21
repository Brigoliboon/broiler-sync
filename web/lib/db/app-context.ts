import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDeviceOnline } from "@/lib/dashboard-utils";
import { openIncidents, type Incident } from "@/lib/incidents";
import { createUserClient } from "@/lib/supabase/server";
import { listAlerts } from "./alerts";
import { getDeviceSettings, type DeviceSettings } from "./device-settings";
import { listDevices, type PublicDevice } from "./devices";
import { listFarms, type Farm } from "./farms";
import { getProfile, type Profile } from "./profiles";

/** Cookie holding the farm picked in the farm switcher. Validated against RLS-visible farms. */
export const FARM_COOKIE = "bs_farm";

/** How many recent alert events are scanned to find open incidents. */
const ALERT_SCAN_LIMIT = 500;

export type FarmEntry = {
  farm: Farm;
  device: PublicDevice | null;
  online: boolean;
};

export type AppContext = {
  userId: string;
  profile: Profile;
  email: string | null;
  isAdmin: boolean;
  farms: FarmEntry[];
  current: FarmEntry | null;
  settings: DeviceSettings | null;
  openAlerts: Incident[];
  /** Request time, so render code stays pure. */
  now: number;
};

async function currentUser(): Promise<{ id: string; email: string | null } | null> {
  try {
    const supabase = await createUserClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return null;
    const { sub, email } = data.claims as { sub?: unknown; email?: unknown };
    if (typeof sub !== "string" || !sub) return null;
    return { id: sub, email: typeof email === "string" ? email : null };
  } catch {
    return null;
  }
}

/**
 * Everything the app shell needs for one request: the signed-in profile, the
 * farms RLS lets them see, the selected farm and its open alerts. Redirects to
 * the login page when signed out or disabled. Cached per request.
 */
export const getAppContext = cache(async (): Promise<AppContext> => {
  const user = await currentUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  if (!profile || profile.disabled_at) redirect("/login");

  const [farms, devices, cookieStore] = await Promise.all([listFarms(), listDevices(), cookies()]);
  const deviceByFarm = new Map(devices.map((device) => [device.farm_id, device]));
  const entries: FarmEntry[] = farms.map((farm) => {
    const device = deviceByFarm.get(farm.id) ?? null;
    return { farm, device, online: isDeviceOnline(device?.last_seen_at ?? null) };
  });

  const selectedId = cookieStore.get(FARM_COOKIE)?.value;
  const current = entries.find((entry) => entry.farm.id === selectedId) ?? entries[0] ?? null;
  const deviceId = current?.device?.device_id;

  const [settings, alerts] = deviceId
    ? await Promise.all([
        getDeviceSettings(deviceId),
        listAlerts({ deviceId, limit: ALERT_SCAN_LIMIT }),
      ])
    : [null, []];

  return {
    userId: user.id,
    profile,
    email: user.email,
    isAdmin: profile.role === "admin",
    farms: entries,
    current,
    settings,
    openAlerts: openIncidents(alerts),
    now: Date.now(),
  };
});
