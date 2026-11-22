import { type ReactNode } from "react";
import { Bird, Bot, Calendar, Hand, Info, Save, Target } from "lucide-react";
import { PageBody } from "@/components/app/app-frame";
import { Card, EmptyNote, ErrorNote, cx } from "@/components/app/ui";
import { DEFAULT_LIMITS, humidityLimits, setpointForAge, windLimit } from "@/lib/climate";
import { listAgeThresholds, type AgeThreshold } from "@/lib/db/age-thresholds";
import { getAppContext } from "@/lib/db/app-context";
import { getLatestReading, type Reading } from "@/lib/db/readings";
import { flockDay, manilaDate } from "@/lib/history";

const LONG_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Disabled stepper (`.step`). FR-24 editing is pending, so the controls are stubs. */
function Stepper({ label, value }: { label: string; value: string }) {
  const side =
    "flex size-12 flex-none items-center justify-center bg-bg text-xl font-semibold text-muted disabled:cursor-not-allowed";
  return (
    <div>
      <span className="text-sm text-muted">{label}</span>
      <div className="flex h-12 items-center overflow-hidden rounded-sm border border-border-strong opacity-70">
        <button type="button" disabled aria-label={`Lower ${label.toLowerCase()}`} className={side}>
          −
        </button>
        <b className="flex-1 text-center text-base tabular-nums">{value}</b>
        <button type="button" disabled aria-label={`Raise ${label.toLowerCase()}`} className={side}>
          +
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <span className="mb-1 flex items-center gap-2 text-sm font-semibold">{icon}{children}</span>;
}

export default async function SettingsPage() {
  const ctx = await getAppContext();
  const device = ctx.current?.device ?? null;
  const settings = ctx.settings;

  let reading: Reading | null = null;
  let thresholds: AgeThreshold[] = [];
  let error: string | null = null;
  if (device) {
    try {
      [reading, thresholds] = await Promise.all([getLatestReading(device.device_id), listAgeThresholds()]);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Failed to load settings";
    }
  }

  const today = manilaDate(ctx.now);
  const flockStart = settings?.flock_start ?? null;
  const age = settings?.age_override_days ?? flockDay(today, flockStart) ?? reading?.age ?? null;
  const limits = settings
    ? {
        hum_low: Number(settings.hum_low),
        hum_high: Number(settings.hum_high),
        hum_brood_low: Number(settings.hum_brood_low),
        hum_brood_days: Number(settings.hum_brood_days),
        wind_alert_ms: settings.wind_alert_ms.map(Number),
        wind_alert_until_days: settings.wind_alert_until_days.map(Number),
      }
    : DEFAULT_LIMITS;
  const target = setpointForAge(thresholds, age) ?? reading?.setpoint ?? null;
  const hum = humidityLimits(age, limits);
  const wind = windLimit(age, limits);
  const mode = settings?.mode === "manual" ? "manual" : "auto";

  let content: ReactNode;
  if (!ctx.current) content = <EmptyNote>No farms assigned to this account yet.</EmptyNote>;
  else if (!device || !settings) content = <EmptyNote>This farm has no ESP32 yet. Ask your admin to add one.</EmptyNote>;
  else if (error) content = <ErrorNote>{error}</ErrorNote>;
  else
    content = (
      <>
        <Card>
          <SectionLabel icon={<Bird size={18} className="text-primary" aria-hidden />}>Flock start date</SectionLabel>
          <div className="flex h-12 items-center gap-2 rounded-sm border border-border-strong bg-surface px-3 text-base opacity-70">
            <Calendar size={20} className="flex-none text-muted" aria-hidden />
            {flockStart ? LONG_DATE.format(new Date(`${flockStart.slice(0, 10)}T00:00:00Z`)) : "Not set"}
            {typeof age === "number" ? <span className="ml-auto text-xs text-muted">Today is day {age}</span> : null}
          </div>
        </Card>

        <Card>
          <SectionLabel icon={<Bot size={18} className="text-mode" aria-hidden />}>Mode</SectionLabel>
          <div role="radiogroup" aria-label="Mode" className="flex rounded-md bg-border p-1">
            {(
              [
                ["auto", "Auto", Bot],
                ["manual", "Manual", Hand],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                disabled
                className={cx(
                  "flex h-11 flex-1 items-center justify-center gap-2 rounded-sm text-sm font-semibold disabled:cursor-not-allowed",
                  mode === key ? "bg-surface text-text shadow-sm" : "text-subtle opacity-70",
                )}
              >
                <Icon size={16} aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Auto follows the age setpoints. Manual lets you switch the fan and lamp.</p>
        </Card>

        <Card className="flex flex-col gap-3">
          <SectionLabel icon={<Target size={18} className="text-temp" aria-hidden />}>
            {typeof age === "number" ? `Setpoints for day ${age}` : "Setpoints"}
          </SectionLabel>
          <Stepper label="Target temperature" value={typeof target === "number" ? `${target.toFixed(1)} °C` : "—"} />
          <Stepper label="Humidity range" value={`${hum.low} – ${hum.high} %`} />
          <Stepper label="Air speed limit" value={wind === null ? "No limit" : `${wind.toFixed(2)} m/s`} />
          <p className="flex items-center gap-2 text-xs text-muted">
            <Info size={16} className="flex-none text-primary" aria-hidden />
            Read-only for now. Editing from the website comes in a later update.
          </p>
        </Card>

        <button
          type="button"
          disabled
          className="interactive flex h-12 items-center justify-center gap-2 rounded-sm bg-primary text-base font-semibold text-white"
        >
          <Save size={20} aria-hidden />
          Save changes
        </button>
      </>
    );

  return (
    <PageBody className="lg:items-center">
      <div className="flex w-full flex-col gap-3 lg:max-w-[720px]">{content}</div>
    </PageBody>
  );
}
