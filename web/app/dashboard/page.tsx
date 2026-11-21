"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber, formatTime, isDeviceOnline } from "@/lib/dashboard-utils";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ProfileRow = { role: string };

type FarmRow = {
  id: string;
  name: string;
};

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

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
    </div>
  );
}

function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${
        ok
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {label}
    </span>
  );
}

function CompartmentCard({
  title,
  temp,
  humidity,
  wind,
  tempStatus,
  windStatus,
}: {
  title: string;
  temp: number | null;
  humidity: number | null;
  wind: number | null;
  tempStatus: string | null;
  windStatus: string | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <StatusPill label={tempStatus ?? "unknown"} ok={tempStatus === "ok"} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Temp" value={formatNumber(temp, 1, "°C")} />
        <Metric label="Humidity" value={formatNumber(humidity, 1, "%")} />
        <Metric
          label="Wind"
          value={formatNumber(wind, 2, " m/s")}
          detail={windStatus ?? undefined}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [supabase] = useState<ReturnType<typeof supabaseBrowser> | null>(() => {
    try {
      return supabaseBrowser();
    } catch {
      return null;
    }
  });
  const [configError] = useState<string | null>(() => {
    try {
      supabaseBrowser();
      return null;
    } catch (caught) {
      return caught instanceof Error
        ? caught.message
        : "Browser Supabase configuration is missing";
    }
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
        const [profileRes, farmsRes, devicesRes, readingsRes] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("role")
              .eq("id", uid)
              .maybeSingle(),
            supabase.from("farms").select("id, name").order("name"),
            supabase
              .from("devices")
              .select("device_id, farm_id, last_seen_at, disabled_at"),
            supabase.from("latest_readings").select("*"),
          ]);

        const queryError =
          profileRes.error ??
          farmsRes.error ??
          devicesRes.error ??
          readingsRes.error;
        if (queryError) throw new Error(queryError.message);

        const profile = profileRes.data as ProfileRow | null;
        const farms = (farmsRes.data ?? []) as FarmRow[];
        const devices = (devicesRes.data ?? []) as DeviceRow[];
        const readings = (readingsRes.data ?? []) as ReadingRow[];
        const deviceByFarm = new Map(
          devices.map((device) => [device.farm_id, device]),
        );
        const readingByDevice = new Map(
          readings.map((reading) => [reading.device_id, reading]),
        );

        setRole(profile?.role ?? "owner");
        setItems(
          farms.map((farm) => {
            const device = deviceByFarm.get(farm.id) ?? null;
            return {
              farm,
              device,
              reading: device
                ? (readingByDevice.get(device.device_id) ?? null)
                : null,
            };
          }),
        );
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Failed to load dashboard",
        );
      } finally {
        setLoading(false);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.session) {
          router.replace("/login");
          return;
        }
        setToken(data.session.access_token);
        setUserId(data.session.user.id);
        void loadData(data.session.access_token, data.session.user.id);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not check sign-in session",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadData, router, supabase]);

  useEffect(() => {
    if (!token || !userId) return;
    const interval = setInterval(() => {
      void loadData(token, userId);
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData, token, userId]);

  async function logout() {
    try {
      if (!supabase) throw new Error(configError ?? "Supabase is not configured");
      await supabase.auth.signOut();
    } catch {
      setError("Sign-out failed");
      return;
    }
    router.push("/login");
  }

  const shownError = error ?? configError;

  if (!token) {
    return (
      <main className="flex flex-1 items-center justify-center">Loading...</main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">BroilerSync dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Live status for both compartments
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadData(token, userId ?? "")}
            disabled={loading}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          {role === "admin" ? (
            <Link
              href="/admin"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
            >
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Sign out
          </button>
        </div>
      </header>

      {shownError ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950">
          {shownError}
        </p>
      ) : null}

      {items.length === 0 && !loading ? (
        <p className="rounded-2xl border border-zinc-200 p-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
          No farms assigned to this account yet.
        </p>
      ) : null}

      {items.map(({ farm, device, reading }) => {
        const online = isDeviceOnline(device?.last_seen_at ?? null);
        const alertCodes = reading?.alert_codes ?? [];
        return (
          <section
            key={farm.id}
            className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{farm.name}</h2>
                <p className="text-xs text-zinc-500">
                  {device ? device.device_id : "No device"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill label={online ? "Online" : "Offline"} ok={online} />
                <StatusPill
                  label={device?.disabled_at ? "Disabled" : "Active"}
                  ok={!device?.disabled_at}
                />
              </div>
            </div>

            <p className="mb-4 text-xs text-zinc-500">
              Last seen: {formatTime(device?.last_seen_at)}
            </p>

            {!reading ? (
              <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-900">
                No readings yet for this device.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <CompartmentCard
                    title="Experimental"
                    temp={reading.e_temp}
                    humidity={reading.e_hum}
                    wind={reading.e_wind}
                    tempStatus={reading.e_temp_status}
                    windStatus={reading.e_wind_status}
                  />
                  <CompartmentCard
                    title="Control"
                    temp={reading.c_temp}
                    humidity={reading.c_hum}
                    wind={reading.c_wind}
                    tempStatus={reading.c_temp_status}
                    windStatus={reading.c_wind_status}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric label="Fan" value={reading.fan ? "ON" : "OFF"} />
                  <Metric label="Lamp" value={reading.lamp ? "ON" : "OFF"} />
                  <Metric label="Mode" value={reading.mode} />
                  <Metric
                    label="Battery"
                    value={formatNumber(reading.batt_v, 2, " V")}
                  />
                  <Metric
                    label="Setpoint"
                    value={formatNumber(reading.setpoint, 1, "°C")}
                  />
                  <Metric label="Age" value={formatNumber(reading.age, 0, " d")} />
                  <Metric
                    label="Alert"
                    value={reading.alert_level.toUpperCase()}
                    detail={alertCodes.join(", ") || undefined}
                  />
                  <Metric
                    label="Reading"
                    value={formatTime(reading.ts)}
                    detail={reading.reason ?? undefined}
                  />
                </div>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
