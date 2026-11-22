import { PageBody } from "@/components/app/app-frame";
import { ShellExtras } from "@/components/app/app-shell";
import { EmptyNote, ErrorNote } from "@/components/app/ui";
import { DEFAULT_LIMITS } from "@/lib/climate";
import { getAppContext } from "@/lib/db/app-context";
import { DbError } from "@/lib/db/errors";
import { getLatestReading, listReadings, type Reading } from "@/lib/db/readings";
import { AutoRefresh } from "./auto-refresh";
import { DesktopDashboard, PhoneDashboard, StatusChips, UpdatedAgo, type DashboardModel } from "./dashboard-view";

export default async function DashboardPage() {
  const ctx = await getAppContext();
  const now = ctx.now;
  const device = ctx.current?.device ?? null;

  let reading: Reading | null = null;
  let history: Reading[] = [];
  let error: string | null = null;
  if (device) {
    try {
      [reading, history] = await Promise.all([
        getLatestReading(device.device_id),
        listReadings({ deviceId: device.device_id, from: new Date(now - 24 * 60 * 60 * 1000).toISOString() }),
      ]);
    } catch (caught) {
      error = caught instanceof DbError || caught instanceof Error ? caught.message : "Failed to load dashboard";
    }
  }

  const s = ctx.settings;
  const model: DashboardModel = {
    online: ctx.current?.online ?? false,
    lastSeenAt: device?.last_seen_at ?? null,
    reading,
    history,
    openAlerts: ctx.openAlerts,
    limits: s
      ? {
          hum_low: Number(s.hum_low),
          hum_high: Number(s.hum_high),
          hum_brood_low: Number(s.hum_brood_low),
          hum_brood_days: Number(s.hum_brood_days),
          wind_alert_ms: s.wind_alert_ms.map(Number),
          wind_alert_until_days: s.wind_alert_until_days.map(Number),
        }
      : DEFAULT_LIMITS,
    battWarnV: s ? Number(s.batt_warn_v) : undefined,
    battCritV: s ? Number(s.batt_crit_v) : undefined,
    now,
  };

  let content;
  if (!ctx.current) content = <EmptyNote>No farms assigned to this account yet.</EmptyNote>;
  else if (!device) content = <EmptyNote>This farm has no ESP32 yet. Ask your admin to add one.</EmptyNote>;
  else if (error) content = <ErrorNote>{error}</ErrorNote>;
  else if (!reading) content = <EmptyNote>No readings yet for this device.</EmptyNote>;
  else
    content = (
      <>
        <PhoneDashboard model={model} />
        <DesktopDashboard model={model} />
      </>
    );

  return (
    <>
      <AutoRefresh />
      {device ? (
        <ShellExtras
          phone={<StatusChips model={model} />}
          desktop={
            <>
              <StatusChips model={model} desktop />
              <UpdatedAgo model={model} />
            </>
          }
        />
      ) : null}
      <PageBody>{content}</PageBody>
    </>
  );
}
