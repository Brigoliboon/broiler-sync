"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell, FarmAvatar } from "@/components/app-shell";
import { BatteryIcon, BellIcon, CalendarIcon, ClockIcon, DropletIcon, FanIcon, GearIcon, HourglassIcon, LampIcon, ThermometerIcon, WindIcon } from "@/components/icons";
import { Card, EmptyState, Stat, StatusPill } from "@/components/ui";
import { formatNumber, formatTime, isDeviceOnline } from "@/lib/dashboard-utils";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ProfileRow = { role: string };

type FarmRow = { id: string; name: string };

type DeviceRow = {
  device_id: string;
  farm_id: string;
  last_seen_at: string | null;
  disabled_at: string | null;
};

type ReadingRow = {
  device_id: string;
  ts: string | null;
  uptime_s: number;
  age: number | null;
  setpoint: number | null;
  e_temp: number | null;
  e_hum: number | null;
  e_wind: number | null;
  e_temp_status: string | null;
  e_wind_status: string | null;
  c_temp: number | null;
  c_hum: number | null;
  c_wind: number | null;
  c_temp_status: string | null;
  c_wind_status: string | null;
  batt_v: number | null;
  fan: boolean;
  lamp: boolean;
  mode: string;
  alert_level: string;
  alert_codes: string[] | null;
  reason: string | null;
};

type DashboardItem = {
  farm: FarmRow;
  device: DeviceRow | null;
  reading: ReadingRow | null;
};

function CompartmentCard({
  title,
  icon,
  temp,
  humidity,
  wind,
  tempStatus,
  windStatus,
}: {
  title: string;
  icon: ReactNode;
  temp: number | null;
  humidity: number | null;
  wind: number | null;
  tempStatus: string | null;
  windStatus: string | null;
}) {
  return (
    <Card
      title={title}
      actions={
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-violet-300">
            {icon}
          </span>
          <StatusPill
            label={tempStatus ?? "unknown"}
            tone={tempStatus === "ok" ? "good" : "neutral"}
            dot
          />
        </div>
      }
    >
      <div className="grid w-full gap-2 sm:grid-cols-3">
        <Stat label="Temp" value={formatNumber(temp, 1, "°C")} icon={<ThermometerIcon className="h-5 w-5" />} />
        <Stat label="Humidity" value={formatNumber(humidity, 1, "%")} icon={<DropletIcon className="h-5 w-5" />} />
        <Stat label="Wind" value={formatNumber(wind, 2, " m/s")} detail={windStatus ?? undefined} icon={<WindIcon className="h-5 w-5" />} />
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [supabase] = useState<ReturnType<typeof supabaseBrowser> | null>(() => {
    try { return supabaseBrowser(); } catch { return null; }
  });
  const [configError] = useState<string | null>(() => {
    try { supabaseBrowser(); return null; }
    catch (caught) { return caught instanceof Error ? caught.message : "Browser Supabase configuration is missing"; }
  });
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState("owner");
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (jwt: string, uid: string) => {
      if (!supabase) return;
      setLoading(true);
      setError(null);
      try {
        const [profileRes, farmsRes, devicesRes, readingsRes] = await Promise.all([
          supabase.from("profiles").select("role").eq("id", uid).maybeSingle(),
          supabase.from("farms").select("id, name").order("name"),
          supabase.from("devices").select("device_id, farm_id, last_seen_at, disabled_at"),
          supabase.from("latest_readings").select("*"),
        ]);
        const queryError = profileRes.error ?? farmsRes.error ?? devicesRes.error ?? readingsRes.error;
        if (queryError) throw new Error(queryError.message);

        const profile = profileRes.data as ProfileRow | null;
        const farms = (farmsRes.data ?? []) as FarmRow[];
        const devices = (devicesRes.data ?? []) as DeviceRow[];
        const readings = (readingsRes.data ?? []) as ReadingRow[];
        const deviceByFarm = new Map(devices.map((device) => [device.farm_id, device]));
        const readingByDevice = new Map(readings.map((reading) => [reading.device_id, reading]));

        setRole(profile?.role ?? "owner");
        setItems(farms.map((farm) => {
          const device = deviceByFarm.get(farm.id) ?? null;
          return {
            farm,
            device,
            reading: device ? (readingByDevice.get(device.device_id) ?? null) : null,
          };
        }));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) { router.replace("/login"); return; }
      setToken(data.session.access_token);
      setUserId(data.session.user.id);
      void loadData(data.session.access_token, data.session.user.id);
    }).catch((caught) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not check sign-in session");
    });
    return () => { cancelled = true; };
  }, [loadData, router, supabase]);

  useEffect(() => {
    if (!token || !userId) return;
    const interval = setInterval(() => { void loadData(token, userId); }, 30000);
    return () => clearInterval(interval);
  }, [loadData, token, userId]);

  const shownError = error ?? configError;
  const online = items.some((item) => isDeviceOnline(item.device?.last_seen_at ?? null));

  if (!token) {
    return <main className="flex min-h-full w-full items-center justify-center bg-[#060918] text-white">Loading...</main>;
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Live status for both compartments"
      role={role}
      online={online}
      refreshing={loading}
      onRefresh={() => void loadData(token, userId ?? "")}
    >
      {shownError ? (
        <p className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{shownError}</p>
      ) : null}

      {items.length === 0 && !loading ? <EmptyState>No farms assigned to this account yet.</EmptyState> : null}

      {items.map(({ farm, device, reading }) => {
        const deviceOnline = isDeviceOnline(device?.last_seen_at ?? null);
        return (
          <section
            key={farm.id}
            className="w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-5"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <FarmAvatar className="h-10 w-10 shrink-0 rounded-xl" />
                <div>
                  <h2 className="text-lg font-semibold">{farm.name}</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {device ? device.device_id : "No device"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill
                  label={deviceOnline ? "Online" : "Offline"}
                  tone={deviceOnline ? "good" : "bad"}
                  dot
                />
                <StatusPill
                  label={device?.disabled_at ? "Disabled" : "Active"}
                  tone={device?.disabled_at ? "bad" : "neutral"}
                />
              </div>
            </div>
            <p className="mb-4 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <ClockIcon className="h-4 w-4" />
              Last seen: {formatTime(device?.last_seen_at)}
            </p>

            {!reading ? (
              <EmptyState>No readings yet for this device.</EmptyState>
            ) : (
              <div className="w-full space-y-4">
                <div className="grid w-full gap-4 lg:grid-cols-2">
                  <CompartmentCard
                    title="Experimental"
                    icon={<GearIcon className="h-4 w-4" />}
                    temp={reading.e_temp}
                    humidity={reading.e_hum}
                    wind={reading.e_wind}
                    tempStatus={reading.e_temp_status}
                    windStatus={reading.e_wind_status}
                  />
                  <CompartmentCard
                    title="Control"
                    icon={<GearIcon className="h-4 w-4" />}
                    temp={reading.c_temp}
                    humidity={reading.c_hum}
                    wind={reading.c_wind}
                    tempStatus={reading.c_temp_status}
                    windStatus={reading.c_wind_status}
                  />
                </div>
                <Card
                  title="Additional Info"
                  actions={
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Latest snapshot
                    </span>
                  }
                >
                  <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                    <Stat label="Fan" value={reading.fan ? "ON" : "OFF"} icon={<FanIcon className="h-5 w-5" />} />
                    <Stat label="Lamp" value={reading.lamp ? "ON" : "OFF"} icon={<LampIcon className="h-5 w-5" />} />
                    <Stat label="Mode" value={reading.mode} icon={<GearIcon className="h-5 w-5" />} />
                    <Stat label="Battery" value={formatNumber(reading.batt_v, 2, " V")} icon={<BatteryIcon className="h-5 w-5" />} />
                    <Stat label="Setpoint" value={formatNumber(reading.setpoint, 1, "°C")} icon={<ThermometerIcon className="h-5 w-5" />} />
                    <Stat label="Age" value={formatNumber(reading.age, 0, " d")} icon={<HourglassIcon className="h-5 w-5" />} />
                    <Stat label="Alert" value={reading.alert_level.toUpperCase()} detail={reading.alert_codes?.join(", ") || undefined} icon={<BellIcon className="h-5 w-5" />} />
                    <Stat label="Reading" value={formatTime(reading.ts)} detail={reading.reason ?? undefined} icon={<CalendarIcon className="h-5 w-5" />} />
                  </div>
                </Card>
              </div>
            )}
          </section>
        );
      })}
    </AppShell>
  );
}

