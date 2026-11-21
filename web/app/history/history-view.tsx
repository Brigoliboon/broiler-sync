import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Box,
  Calendar,
  Download,
  Droplet,
  FlaskConical,
  Table,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Card, cx } from "@/components/app/ui";
import { ChartLegend, LineChart, type BandPoint } from "@/components/app/line-chart";
import { bucketAverage, type Point } from "@/lib/chart";
import { DEFAULT_LIMITS, TARGET_BAND_C, formatHour, humidityLimits, type ClimateLimits } from "@/lib/climate";
import type { DailyStat } from "@/lib/db/daily-stats";
import type { DeviceSettings } from "@/lib/db/device-settings";
import type { SeriesRow } from "@/lib/db/series";
import {
  dateList,
  flockDay,
  historyHref,
  manilaDate,
  shortDate,
  weekday,
  type HistoryMetric,
  type HistoryQuery,
  type HistoryRange,
} from "@/lib/history";

const METRICS: { key: HistoryMetric; phone: string; desktop: string; icon: LucideIcon }[] = [
  { key: "temp", phone: "Temp", desktop: "Temperature", icon: Thermometer },
  { key: "hum", phone: "Humidity", desktop: "Humidity", icon: Droplet },
  { key: "wind", phone: "Air speed", desktop: "Air speed", icon: Wind },
];

const RANGES: { key: HistoryRange; label: string }[] = [
  { key: "24h", label: "24 h" },
  { key: "7d", label: "7 days" },
  { key: "custom", label: "Custom" },
];

const BUCKETS = 240;

function limitsFrom(settings: DeviceSettings | null): ClimateLimits {
  if (!settings) return DEFAULT_LIMITS;
  return {
    hum_low: Number(settings.hum_low),
    hum_high: Number(settings.hum_high),
    hum_brood_low: Number(settings.hum_brood_low),
    hum_brood_days: Number(settings.hum_brood_days),
    wind_alert_ms: settings.wind_alert_ms.map(Number),
    wind_alert_until_days: settings.wind_alert_until_days.map(Number),
  };
}

function seriesFor(rows: SeriesRow[], metric: HistoryMetric, compartment: "e" | "c"): Point[] {
  const key = `${compartment}_${metric}` as keyof SeriesRow;
  return rows.map((row) => ({ t: new Date(row.ts).getTime(), v: row[key] as number | null }));
}

function compact(points: Point[]): Point[] {
  return points.filter((p) => typeof p.v === "number");
}

/* --------------------------------------------------------------- toolbar */

function RangeSeg({ query, className }: { query: HistoryQuery; className?: string }) {
  return (
    <nav aria-label="Time range" className={cx("flex rounded-md bg-border p-1", className)}>
      {RANGES.map((range) => {
        const selected = query.range === range.key;
        return (
          <Link
            key={range.key}
            href={historyHref(query, { range: range.key })}
            aria-current={selected ? "page" : undefined}
            className={cx(
              "interactive flex h-11 flex-1 items-center justify-center gap-2 rounded-sm text-sm font-semibold",
              selected ? "bg-surface text-text shadow-sm" : "text-subtle hover:text-text",
            )}
          >
            {range.key === "custom" ? <Calendar size={16} aria-hidden /> : null}
            {range.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MetricChips({ query, desktop }: { query: HistoryQuery; desktop?: boolean }) {
  return (
    <nav aria-label="Reading" className="flex flex-wrap gap-2">
      {METRICS.map((metric) => {
        const selected = query.metric === metric.key;
        const Icon = metric.icon;
        return (
          <Link
            key={metric.key}
            href={historyHref(query, { metric: metric.key })}
            aria-current={selected ? "page" : undefined}
            className={cx(
              "interactive relative flex items-center gap-1 rounded-sm leading-[1.5] font-semibold",
              desktop ? "px-3 py-2 text-sm" : "px-2 py-1 text-xs after:absolute after:inset-x-0 after:-inset-y-[9px] after:content-['']",
              selected ? "bg-primary-soft text-primary" : "bg-[#F1F5F9] text-subtle hover:text-text",
            )}
          >
            <Icon size={desktop ? 16 : 14} aria-hidden />
            {desktop ? metric.desktop : metric.phone}
          </Link>
        );
      })}
    </nav>
  );
}

function CustomRangeForm({ query }: { query: HistoryQuery }) {
  if (query.range !== "custom") return null;
  const input =
    "interactive h-12 rounded-sm border border-border-strong bg-surface px-3 text-base text-text";
  return (
    <form action="/history" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="range" value="custom" />
      {query.metric !== "temp" ? <input type="hidden" name="metric" value={query.metric} /> : null}
      <label className="flex flex-col">
        <span className="mb-1 text-sm font-semibold">From</span>
        <input type="date" name="from" defaultValue={query.from} max={query.to} className={input} />
      </label>
      <label className="flex flex-col">
        <span className="mb-1 text-sm font-semibold">To</span>
        <input type="date" name="to" defaultValue={query.to} className={input} />
      </label>
      <button
        type="submit"
        className="interactive h-12 rounded-sm border border-border-strong bg-surface px-4 text-base font-semibold hover:border-subtle hover:bg-[#F1F5F9]"
      >
        Apply
      </button>
    </form>
  );
}

/* ----------------------------------------------------------------- chart */

function rangeTitle(query: HistoryQuery): string {
  if (query.range === "24h") return "Last 24 h";
  return query.from === query.to ? shortDate(query.from) : `${shortDate(query.from)} – ${shortDate(query.to)}`;
}

function xLabels(query: HistoryQuery, desktop: boolean): string[] {
  if (query.range === "24h") {
    return Array.from({ length: 7 }, (_, i) => {
      const t = query.start + (i * (query.end - query.start)) / 6;
      return i === 6 ? "Now" : formatHour(t);
    });
  }
  const days = dateList(query.from, query.to);
  if (days.length <= 7) return days.map((d) => (desktop ? `${weekday(d)} ${Number(d.slice(8))}` : weekday(d)));
  const picks = [0, Math.round((days.length - 1) / 2), days.length - 1];
  return picks.map((i) => shortDate(days[i]));
}

function HistoryChart({
  query,
  rows,
  limits,
  desktop,
}: {
  query: HistoryQuery;
  rows: SeriesRow[];
  limits: ClimateLimits;
  desktop?: boolean;
}) {
  const x0 = query.start;
  const x1 = query.end;
  const bucketMs = (x1 - x0) / BUCKETS;
  const exp = compact(bucketAverage(seriesFor(rows, query.metric, "e"), x0, x1, BUCKETS));
  const ctl = compact(bucketAverage(seriesFor(rows, query.metric, "c"), x0, x1, BUCKETS));

  let band: BandPoint[] | undefined;
  if (query.metric === "temp") {
    band = compact(bucketAverage(rows.map((r) => ({ t: new Date(r.ts).getTime(), v: r.setpoint })), x0, x1, BUCKETS)).map(
      (p) => ({ t: p.t, min: (p.v as number) - TARGET_BAND_C, max: (p.v as number) + TARGET_BAND_C }),
    );
  } else if (query.metric === "hum") {
    band = compact(bucketAverage(rows.map((r) => ({ t: new Date(r.ts).getTime(), v: r.age })), x0, x1, BUCKETS)).map((p) => {
      const { low, high } = humidityLimits(Math.round(p.v as number), limits);
      return { t: p.t, min: low, max: high };
    });
  }
  if (band && band.length === 0) band = undefined;

  const metricName = METRICS.find((m) => m.key === query.metric)?.desktop ?? "";
  const labels = xLabels(query, Boolean(desktop));
  const hasData = exp.length > 0 || ctl.length > 0;

  return (
    <Card className={desktop ? undefined : "px-4 py-3"}>
      <div className="flex justify-between gap-4">
        <h2 className={cx("font-bold", desktop ? "text-lg" : "text-sm")}>
          {rangeTitle(query)}
          {desktop ? ` · ${metricName}` : ""}
        </h2>
        {desktop ? (
          <ChartLegend bandLabel={band ? "Target band" : undefined} />
        ) : (
          <span className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <i className="inline-block h-[3px] w-3.5 bg-primary" aria-hidden />
              Exp.
            </span>
            <span className="flex items-center gap-1">
              <i className="inline-block w-3.5 border-t-2 border-dashed border-temp" aria-hidden />
              Control
            </span>
          </span>
        )}
      </div>
      {hasData ? (
        <LineChart
          className="mt-2"
          height={desktop ? 150 : 120}
          x0={x0}
          x1={x1}
          band={band}
          maxGapMs={Math.max(15 * 60_000, bucketMs * 3)}
          series={[
            { points: exp, color: "#1D4ED8", width: 2.5 },
            { points: ctl, color: "#C2410C", width: 2, dash: desktop ? "6 4" : "5 4" },
          ]}
          label={`${metricName}, experimental and control, ${rangeTitle(query)}`}
        />
      ) : (
        <p className="my-8 text-sm text-muted">No readings in this range.</p>
      )}
      <div className="flex justify-between text-xs text-muted">
        {labels.map((label, i) => (
          <span key={`${label}-${i}`}>{label}</span>
        ))}
      </div>
    </Card>
  );
}

/* --------------------------------------------------------------- summary */

type StatKey = "temp" | "hum" | "wind";

function cell(value: number | null | undefined, metric: StatKey): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const n = Number(value);
  if (metric === "temp") return `${n.toFixed(1)}°`;
  if (metric === "hum") return `${n.toFixed(0)}%`;
  return n.toFixed(2);
}

function statCells(stat: DailyStat | undefined, metric: StatKey): string[] {
  if (!stat) return ["—", "—", "—"];
  return [
    cell(stat[`${metric}_min`], metric),
    cell(stat[`${metric}_avg`], metric),
    cell(stat[`${metric}_max`], metric),
  ];
}

function MinAvgMaxHeads({ size = 12 }: { size?: number }) {
  return (
    <>
      <th className="px-1 py-2 text-right text-xs font-semibold text-muted">
        <span className="inline-flex items-center gap-1">
          <TrendingDown size={size} className="text-primary" aria-hidden /> Min
        </span>
      </th>
      <th className="px-1 py-2 text-right text-xs font-semibold text-muted">
        <span className="inline-flex items-center gap-1">
          <ArrowRight size={size} className="text-muted" aria-hidden /> Avg
        </span>
      </th>
      <th className="px-1 py-2 text-right text-xs font-semibold text-muted">
        <span className="inline-flex items-center gap-1">
          <TrendingUp size={size} className="text-temp" aria-hidden /> Max
        </span>
      </th>
    </>
  );
}

function dayLabel(date: string, flockStart: string | null): string {
  const day = flockDay(date, flockStart);
  return day === null ? shortDate(date) : `${shortDate(date)} · D${day}`;
}

function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="px-4 py-3">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold lg:text-base">
        <Table size={18} className="text-subtle" aria-hidden />
        {title}
      </h2>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

const TD = "border-b border-[#F1F5F9] px-1 py-3 text-right tabular-nums";
const TD_FIRST = "border-b border-[#F1F5F9] px-1 py-3 text-left";

function PhoneSummary({ query, days, byKey, flockStart }: SummaryProps) {
  const metricName = query.metric === "temp" ? "" : ` (${METRICS.find((m) => m.key === query.metric)?.desktop})`;
  return (
    <SummaryCard title={`Daily summary · Experimental${metricName}`}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-1 py-2 text-left text-xs font-semibold text-muted">Day</th>
            <MinAvgMaxHeads />
          </tr>
        </thead>
        <tbody>
          {days.map((date) => (
            <tr key={date}>
              <td className={TD_FIRST}>{dayLabel(date, flockStart)}</td>
              {statCells(byKey.get(`experimental:${date}`), query.metric).map((value, i) => (
                <td key={i} className={TD}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </SummaryCard>
  );
}

type SummaryProps = {
  query: HistoryQuery;
  days: string[];
  byKey: Map<string, DailyStat>;
  flockStart: string | null;
};

function DesktopSummary({ query, days, byKey, flockStart }: SummaryProps) {
  const noun = query.metric === "temp" ? "temp" : query.metric === "hum" ? "humidity" : "air speed";
  const groups: { label: string; icon: ReactNode; slug: string; metric: StatKey }[] = [
    { label: `Experimental ${noun}`, icon: <FlaskConical size={12} className="text-subtle" aria-hidden />, slug: "experimental", metric: query.metric },
    { label: `Control ${noun}`, icon: <Box size={12} className="text-subtle" aria-hidden />, slug: "control", metric: query.metric },
  ];
  if (query.metric === "temp") {
    groups.push({ label: "Exp. humidity", icon: <Droplet size={12} className="text-hum" aria-hidden />, slug: "experimental", metric: "hum" });
  }
  return (
    <SummaryCard title="Daily summary">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border" />
            {groups.map((group) => (
              <th key={group.label} colSpan={3} className="border-b border-border px-1 py-2 text-center text-xs font-semibold text-muted">
                <span className="inline-flex items-center gap-1">
                  {group.icon} {group.label}
                </span>
              </th>
            ))}
          </tr>
          <tr className="border-b border-border">
            <th className="px-1 py-2 text-left text-xs font-semibold text-muted">Day</th>
            {groups.map((group) => (
              <MinAvgMaxHeads key={group.label} />
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((date) => (
            <tr key={date}>
              <td className={TD_FIRST}>{dayLabel(date, flockStart)}</td>
              {groups.flatMap((group) =>
                statCells(byKey.get(`${group.slug}:${date}`), group.metric).map((value, i) => (
                  <td key={`${group.label}-${i}`} className={TD}>
                    {value}
                  </td>
                )),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </SummaryCard>
  );
}

/* ------------------------------------------------------------------ view */

export function HistoryView({
  query,
  rows,
  stats,
  flockStart,
  limits,
  now,
}: {
  query: HistoryQuery;
  rows: SeriesRow[];
  stats: DailyStat[];
  flockStart: string | null;
  limits: DeviceSettings | null;
  now: number;
}) {
  const climate = limitsFrom(limits);
  const byKey = new Map(stats.map((stat) => [`${stat.compartment_slug}:${stat.day.slice(0, 10)}`, stat]));
  const today = manilaDate(now);
  const days = dateList(query.from, query.to)
    .filter((d) => d <= today)
    .reverse()
    .filter((d) => byKey.has(`experimental:${d}`) || byKey.has(`control:${d}`));
  const exportHref = `/export?from=${query.from}&to=${query.to}`;
  const summaryProps = { query, days, byKey, flockStart };

  return (
    <>
      {/* phone */}
      <div className="flex flex-col gap-3 lg:hidden">
        <RangeSeg query={query} />
        <CustomRangeForm query={query} />
        <MetricChips query={query} />
        <HistoryChart query={query} rows={rows} limits={climate} />
        {days.length ? <PhoneSummary {...summaryProps} /> : null}
      </div>
      {/* desktop */}
      <div className="hidden flex-col gap-4 lg:flex">
        <div className="flex items-center gap-4">
          <RangeSeg query={query} className="w-[360px]" />
          <MetricChips query={query} desktop />
          <Link
            href={exportHref}
            className="interactive ml-auto flex h-11 items-center gap-2 rounded-sm border border-border-strong bg-surface px-4 text-sm font-semibold hover:border-subtle hover:bg-[#F1F5F9]"
          >
            <Download size={18} aria-hidden />
            Export CSV
          </Link>
        </div>
        <CustomRangeForm query={query} />
        <HistoryChart query={query} rows={rows} limits={climate} desktop />
        {days.length ? <DesktopSummary {...summaryProps} /> : null}
      </div>
    </>
  );
}
