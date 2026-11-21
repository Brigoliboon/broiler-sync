import Link from "next/link";
import type { ReactNode } from "react";
import {
  BatteryLow,
  BatteryMedium,
  Bird,
  Bot,
  Box,
  Check,
  ChevronRight,
  Droplet,
  Fan,
  FlaskConical,
  Lightbulb,
  LightbulbOff,
  Target,
  Thermometer,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wind,
} from "lucide-react";
import { Card, Chip, IconBox, OnlineChip, Tag, cx } from "@/components/app/ui";
import { ChartLegend, LineChart } from "@/components/app/line-chart";
import { minMax, type Point } from "@/lib/chart";
import {
  COMPARTMENTS,
  TARGET_BAND_C,
  codeCompartment,
  codeMetric,
  compartmentAlerts,
  describeAlert,
  formatAgo,
  formatClock,
  formatHour,
  sortBySeverity,
  type ClimateLimits,
  type CompartmentSlug,
} from "@/lib/climate";
import type { Incident } from "@/lib/incidents";
import type { Reading } from "@/lib/db/readings";
import { CompartmentTabs } from "./compartment-tabs";

export type DashboardModel = {
  online: boolean;
  lastSeenAt: string | null;
  reading: Reading | null;
  history: Reading[];
  openAlerts: Incident[];
  limits: ClimateLimits;
  battWarnV?: number;
  battCritV?: number;
  now: number;
};

type CompartmentValues = { temp: number | null; hum: number | null; wind: number | null };

function values(reading: Reading | null, slug: CompartmentSlug): CompartmentValues {
  if (!reading) return { temp: null, hum: null, wind: null };
  return slug === "experimental"
    ? { temp: reading.e_temp, hum: reading.e_hum, wind: reading.e_wind }
    : { temp: reading.c_temp, hum: reading.c_hum, wind: reading.c_wind };
}

function num(value: number | null, digits: number): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "—";
}

/** Active codes: open incidents plus the latest snapshot's codes. */
function activeCodes(model: DashboardModel): string[] {
  const codes = new Set<string>(model.openAlerts.map((incident) => incident.code));
  for (const code of model.reading?.alert_codes ?? []) codes.add(code);
  return sortBySeverity([...codes]);
}

function valueForCode(code: string, reading: Reading | null): number | null {
  if (!reading) return null;
  if (code.startsWith("BATT_")) return reading.batt_v;
  const slug = codeCompartment(code);
  const metric = codeMetric(code);
  if (!slug || !metric) return null;
  return values(reading, slug)[metric];
}

function bandFor(reading: Reading | null): { min: number; max: number } | null {
  if (typeof reading?.setpoint !== "number") return null;
  return { min: reading.setpoint - TARGET_BAND_C, max: reading.setpoint + TARGET_BAND_C };
}

function fmtC(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/* ---------------------------------------------------------------- header */

export function StatusChips({ model, desktop }: { model: DashboardModel; desktop?: boolean }) {
  const { reading } = model;
  const battLow = activeCodes(model).some((code) => code.startsWith("BATT_"));
  return (
    <>
      <OnlineChip online={model.online} lastSeenAt={model.lastSeenAt} now={model.now} />
      {typeof reading?.batt_v === "number" ? (
        <Chip tone={battLow ? "red" : "blue"}>
          {battLow ? <BatteryLow size={16} aria-hidden /> : <BatteryMedium size={16} aria-hidden />}
          {reading.batt_v.toFixed(1)} V
        </Chip>
      ) : null}
      {typeof reading?.age === "number" ? (
        <Chip>
          <Bird size={14} aria-hidden />
          Day {reading.age}
        </Chip>
      ) : null}
      {typeof reading?.setpoint === "number" ? (
        <Chip>
          <Target size={14} aria-hidden />
          {desktop ? "Target " : ""}
          {fmtC(reading.setpoint)}°C
        </Chip>
      ) : null}
    </>
  );
}

export function UpdatedAgo({ model }: { model: DashboardModel }) {
  const ago = formatAgo(model.reading?.ts ?? model.reading?.received_at, model.now);
  return ago ? <span className="ml-2 self-center text-xs text-muted">Updated {ago}</span> : null;
}

/* ---------------------------------------------------------------- banner */

export function AlertBanner({ model, desktop }: { model: DashboardModel; desktop?: boolean }) {
  const [code] = activeCodes(model);
  if (!code) return null;
  const incident = model.openAlerts.find((item) => item.code === code);
  const desc = describeAlert(code, {
    value: valueForCode(code, model.reading) ?? incident?.start.value ?? null,
    age: model.reading?.age ?? incident?.start.age ?? null,
    setpoint: model.reading?.setpoint ?? null,
    limits: model.limits,
    battWarnV: model.battWarnV,
    battCritV: model.battCritV,
  });
  const since = incident ? formatClock(incident.start.ts ?? incident.start.received_at) : null;

  let text: ReactNode;
  if (desc.metric && desc.valueText && desc.relation && desc.limitText) {
    text = desktop ? (
      <>
        <b>{desc.scope ? `${desc.scope} compartment:` : "Farm:"}</b> {desc.metric} {desc.valueText}, {desc.relation} the{" "}
        {desc.limitText} limit{since ? ` · since ${since}` : ""}
      </>
    ) : (
      <>
        <b>{desc.scope ?? "Farm"}:</b> {desc.metric} {desc.valueText}, {desc.relation} {desc.limitText}
      </>
    );
  } else {
    text = (
      <>
        <b>{desc.title}:</b> {desc.detail}
        {desktop && since ? ` · since ${since}` : ""}
      </>
    );
  }

  if (desktop) {
    return (
      <div role="alert" className="flex items-center gap-2 rounded-sm border-l-4 border-danger-accent bg-danger-soft p-3 text-base text-danger">
        <TriangleAlert size={20} className="flex-none text-danger-accent" aria-hidden />
        <span className="flex-1">{text}</span>
        <Link href="/alerts" className="interactive flex items-center gap-1 rounded-sm font-bold hover:underline">
          View alert <ChevronRight size={18} aria-hidden />
        </Link>
      </div>
    );
  }
  return (
    <Link
      href="/alerts"
      role="alert"
      className="interactive flex items-center gap-2 rounded-sm border-l-4 border-danger-accent bg-danger-soft p-3 text-sm text-danger hover:bg-[#FEE2E2]"
    >
      <TriangleAlert size={20} className="flex-none text-danger-accent" aria-hidden />
      <span className="flex-1">{text}</span>
      <ChevronRight size={18} className="flex-none" aria-hidden />
    </Link>
  );
}

/* ---------------------------------------------------------- compartment */

function MetricTile({
  icon,
  tint,
  label,
  value,
  unit,
  alert,
  desktop,
}: {
  icon: ReactNode;
  tint: string;
  label: ReactNode;
  value: string;
  unit: string;
  alert: boolean;
  desktop?: boolean;
}) {
  return (
    <div className={cx("min-w-0 rounded-md border p-3", alert ? "border-danger-accent" : "border-border")}>
      <IconBox className={tint}>{icon}</IconBox>
      <span className="mt-2 block text-sm text-muted">{label}</span>
      <b className={cx("mt-1 block leading-[1.3] tabular-nums", desktop ? "text-2xl" : "text-xl", alert && "text-danger")}>
        {value}
        <span className="text-xs font-medium text-muted"> {unit}</span>
      </b>
    </div>
  );
}

function StateRow({ icon, tint, label, tag }: { icon: ReactNode; tint: string; label: string; tag: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between border-b border-[#F1F5F9] text-base last:border-b-0">
      <span className="flex items-center gap-3">
        <IconBox className={tint}>{icon}</IconBox>
        {label}
      </span>
      {tag}
    </div>
  );
}

function CompartmentBody({ model, slug, desktop }: { model: DashboardModel; slug: CompartmentSlug; desktop?: boolean }) {
  const v = values(model.reading, slug);
  const flags = compartmentAlerts(activeCodes(model), slug);
  const r = model.reading;
  return (
    <>
      <div className={cx("grid grid-cols-3", desktop ? "gap-3" : "gap-2")}>
        <MetricTile
          icon={<Thermometer size={18} className="text-temp" aria-hidden />}
          tint="bg-temp-soft"
          label={desktop ? "Temperature" : "Temp"}
          value={num(v.temp, 1)}
          unit="°C"
          alert={flags.temp}
          desktop={desktop}
        />
        <MetricTile
          icon={<Droplet size={18} className="text-hum" aria-hidden />}
          tint="bg-hum-soft"
          label="Humidity"
          value={num(v.hum, 0)}
          unit="%"
          alert={flags.hum}
          desktop={desktop}
        />
        <MetricTile
          icon={<Wind size={18} className="text-air" aria-hidden />}
          tint="bg-air-soft"
          label={desktop ? "Air speed" : "Air"}
          value={num(v.wind, 2)}
          unit="m/s"
          alert={flags.wind}
          desktop={desktop}
        />
      </div>
      <div className={desktop ? "mt-2" : "mt-1"}>
        <StateRow
          icon={<Fan size={18} className="text-success" aria-hidden />}
          tint="bg-success-soft"
          label="Fan"
          tag={r ? <Tag tone={r.fan ? "on" : "off"}>{r.fan ? "ON" : "OFF"}</Tag> : <Tag tone="off">—</Tag>}
        />
        <StateRow
          icon={
            r?.lamp ? (
              <Lightbulb size={18} className="text-warning" aria-hidden />
            ) : (
              <LightbulbOff size={18} className="text-muted" aria-hidden />
            )
          }
          tint={r?.lamp ? "bg-[#FEF3C7]" : "bg-[#F1F5F9]"}
          label="Lamp"
          tag={r ? <Tag tone={r.lamp ? "warn" : "off"}>{r.lamp ? "ON" : "OFF"}</Tag> : <Tag tone="off">—</Tag>}
        />
        <StateRow
          icon={<Bot size={18} className="text-mode" aria-hidden />}
          tint="bg-mode-soft"
          label="Mode"
          tag={<Tag tone="off">{r ? (r.mode === "MANUAL" ? "Manual" : "Auto") : "—"}</Tag>}
        />
      </div>
    </>
  );
}

function DesktopCompartmentCard({ model, slug, name }: { model: DashboardModel; slug: CompartmentSlug; name: string }) {
  const flags = compartmentAlerts(activeCodes(model), slug);
  const Icon = slug === "experimental" ? FlaskConical : Box;
  return (
    <Card className={flags.count ? "border-2 border-danger-accent p-[15px]" : undefined}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon size={20} className="text-subtle" aria-hidden />
          {name}
        </h2>
        {flags.count ? (
          <Tag tone="bad">
            <TriangleAlert size={14} aria-hidden />
            {flags.count} {flags.count === 1 ? "alert" : "alerts"}
          </Tag>
        ) : (
          <Tag tone="on">
            <Check size={14} aria-hidden />
            In range
          </Tag>
        )}
      </div>
      <CompartmentBody model={model} slug={slug} desktop />
    </Card>
  );
}

/* ---------------------------------------------------------------- charts */

function tempPoints(history: Reading[], slug: CompartmentSlug): Point[] {
  return history
    .filter((r) => r.ts)
    .map((r) => ({ t: new Date(r.ts as string).getTime(), v: slug === "experimental" ? r.e_temp : r.c_temp }));
}

function PhoneTempChart({ model, slug }: { model: DashboardModel; slug: CompartmentSlug }) {
  const points = tempPoints(model.history, slug);
  const range = minMax(points);
  const band = bandFor(model.reading);
  const x1 = model.now;
  const x0 = x1 - 24 * 60 * 60 * 1000;
  const ago = formatAgo(model.reading?.ts ?? model.reading?.received_at, model.now);
  const caption = [
    band && typeof model.reading?.age === "number"
      ? `Shaded band is the day-${model.reading.age} target, ${fmtC(band.min)}–${fmtC(band.max)}°C`
      : null,
    ago ? `updated ${ago}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Card className="px-4 py-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Thermometer size={18} className="text-temp" aria-hidden />
          Temperature, 24 h
        </h2>
        {range ? (
          <span className="flex items-center gap-2 text-xs text-muted">
            <span className="flex items-center gap-0.5">
              <TrendingDown size={14} className="text-primary" aria-label="Low" />
              {range.min.toFixed(1)}
            </span>
            <span className="flex items-center gap-0.5">
              <TrendingUp size={14} className="text-temp" aria-label="High" />
              {range.max.toFixed(1)}
            </span>
          </span>
        ) : null}
      </div>
      {points.length ? (
        <LineChart
          className="my-2"
          height={64}
          x0={x0}
          x1={x1}
          band={band ? [{ t: x0, ...band }] : undefined}
          series={[{ points, color: "#1D4ED8", width: 2.5 }]}
          label={`Temperature over the last 24 hours${range ? `, low ${range.min.toFixed(1)}, high ${range.max.toFixed(1)} °C` : ""}`}
        />
      ) : (
        <p className="my-4 text-sm text-muted">No readings in the last 24 hours.</p>
      )}
      {caption ? <p className="text-xs text-muted">{caption}</p> : null}
    </Card>
  );
}

function DesktopTempChart({ model }: { model: DashboardModel }) {
  const band = bandFor(model.reading);
  const x1 = model.now;
  const x0 = x1 - 24 * 60 * 60 * 1000;
  const exp = tempPoints(model.history, "experimental");
  const ctl = tempPoints(model.history, "control");
  const ticks = Array.from({ length: 7 }, (_, i) => x0 + (i * (x1 - x0)) / 6);
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Thermometer size={20} className="text-temp" aria-hidden />
          Temperature, last 24 h
        </h2>
        <span className="flex items-center gap-4 text-xs">
          <ChartLegend bandLabel={band ? `Target ${fmtC(band.min)}–${fmtC(band.max)}°C` : undefined} />
          <Link href="/history" className="interactive flex items-center gap-1 rounded-sm font-bold text-primary hover:underline">
            Open history <ChevronRight size={16} aria-hidden />
          </Link>
        </span>
      </div>
      {exp.length || ctl.length ? (
        <LineChart
          className="mt-2"
          height={128}
          x0={x0}
          x1={x1}
          band={band ? [{ t: x0, ...band }] : undefined}
          series={[
            { points: exp, color: "#1D4ED8", width: 2.5 },
            { points: ctl, color: "#C2410C", width: 2, dash: "6 4" },
          ]}
          label="Experimental and control temperature over the last 24 hours"
        />
      ) : (
        <p className="my-8 text-sm text-muted">No readings in the last 24 hours.</p>
      )}
      <div className="flex justify-between text-xs text-muted">
        {ticks.map((t, i) => (
          <span key={t}>{i === ticks.length - 1 ? "Now" : formatHour(t)}</span>
        ))}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- views */

export function PhoneDashboard({ model }: { model: DashboardModel }) {
  const codes = activeCodes(model);
  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <AlertBanner model={model} />
      <CompartmentTabs
        tabs={COMPARTMENTS.map(({ slug, name }) => ({
          slug,
          name,
          alert: compartmentAlerts(codes, slug).count > 0,
          panel: (
            <>
              <Card className="p-3">
                <CompartmentBody model={model} slug={slug} />
              </Card>
              <PhoneTempChart model={model} slug={slug} />
            </>
          ),
        }))}
      />
    </div>
  );
}

export function DesktopDashboard({ model }: { model: DashboardModel }) {
  return (
    <div className="hidden flex-col gap-4 lg:flex">
      <AlertBanner model={model} desktop />
      <div className="grid grid-cols-2 gap-4">
        {COMPARTMENTS.map(({ slug, name }) => (
          <DesktopCompartmentCard key={slug} model={model} slug={slug} name={name} />
        ))}
      </div>
      <DesktopTempChart model={model} />
    </div>
  );
}
