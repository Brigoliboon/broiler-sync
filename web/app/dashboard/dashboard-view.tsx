import { EmptyState, Metric, Notice, StatusPill } from "@/components/ui";
import type { DashboardItem } from "@/lib/db/dashboard";
import { formatNumber, formatTime, isDeviceOnline } from "@/lib/dashboard-utils";

function Compartment({
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
    <div className="min-w-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        <StatusPill
          label={tempStatus ?? "unknown"}
          tone={tempStatus === "ok" ? "good" : "warn"}
          dot
        />
      </div>
      <dl className="grid grid-cols-3 gap-4">
        <Metric label="Temp" value={formatNumber(temp, 1, "°C")} />
        <Metric label="Humidity" value={formatNumber(humidity, 1, "%")} />
        <Metric
          label="Wind"
          value={formatNumber(wind, 2, " m/s")}
          detail={windStatus ?? undefined}
        />
      </dl>
    </div>
  );
}

export function DashboardView({
  items,
  error,
}: {
  items: DashboardItem[];
  error?: string | null;
}) {
  return (
    <>
      {error ? <Notice tone="bad">{error}</Notice> : null}

      {items.length === 0 && !error ? (
        <EmptyState>No farms assigned to this account yet.</EmptyState>
      ) : null}

      {items.map(({ farm, device, reading }) => {
        const deviceOnline = isDeviceOnline(device?.last_seen_at ?? null);
        const alertLevel = reading?.alert_level ?? "ok";
        const alertCodes = reading?.alert_codes?.filter(Boolean) ?? [];

        return (
          <section key={farm.id} className="w-full border-t border-white/10 pt-8 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">{farm.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {device ? device.device_id : "No device"}
                  <span className="text-zinc-600"> · </span>
                  Last seen {formatTime(device?.last_seen_at)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusPill
                  label={deviceOnline ? "Online" : "Offline"}
                  tone={deviceOnline ? "good" : "bad"}
                  dot
                />
                {device?.disabled_at ? (
                  <StatusPill label="Disabled" tone="bad" />
                ) : null}
              </div>
            </div>

            {!reading ? (
              <EmptyState>No readings yet for this device.</EmptyState>
            ) : (
              <div className="mt-6 space-y-6">
                {alertLevel !== "ok" ? (
                  <Notice tone={alertLevel === "critical" ? "bad" : "warn"}>
                    Alert: {alertLevel}
                    {alertCodes.length ? ` — ${alertCodes.join(", ")}` : ""}
                  </Notice>
                ) : null}

                <div className="grid w-full gap-8 md:grid-cols-2 md:divide-x md:divide-white/10">
                  <Compartment
                    title="Experimental"
                    temp={reading.e_temp}
                    humidity={reading.e_hum}
                    wind={reading.e_wind}
                    tempStatus={reading.e_temp_status}
                    windStatus={reading.e_wind_status}
                  />
                  <div className="md:pl-8">
                    <Compartment
                      title="Control"
                      temp={reading.c_temp}
                      humidity={reading.c_hum}
                      wind={reading.c_wind}
                      tempStatus={reading.c_temp_status}
                      windStatus={reading.c_wind_status}
                    />
                  </div>
                </div>

                <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-5 border-t border-white/10 pt-6 sm:grid-cols-4">
                  <Metric label="Fan" value={reading.fan ? "On" : "Off"} />
                  <Metric label="Lamp" value={reading.lamp ? "On" : "Off"} />
                  <Metric label="Mode" value={reading.mode} />
                  <Metric
                    label="Battery"
                    value={formatNumber(reading.batt_v, 2, " V")}
                  />
                  <Metric
                    label="Setpoint"
                    value={formatNumber(reading.setpoint, 1, "°C")}
                  />
                  <Metric
                    label="Age"
                    value={formatNumber(reading.age, 0, " d")}
                  />
                  <Metric
                    label="Alert"
                    value={alertLevel}
                    detail={alertCodes.join(", ") || undefined}
                  />
                  <Metric
                    label="Reading"
                    value={formatTime(reading.ts)}
                    detail={reading.reason ?? undefined}
                  />
                </dl>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
