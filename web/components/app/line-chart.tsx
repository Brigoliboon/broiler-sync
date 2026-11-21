import { polylines, valueDomain, type Point, type Scale } from "@/lib/chart";

export type ChartSeries = {
  points: Point[];
  color: string;
  width: number;
  dash?: string;
};

export type BandPoint = { t: number; min: number; max: number };

/**
 * Plain SVG line chart from the Figma frames: a soft blue target band, a solid
 * blue experimental line and a dashed orange control line. Stretches to the
 * card width; strokes keep their width.
 */
export function LineChart({
  series,
  band,
  x0,
  x1,
  height,
  label,
  className,
}: {
  series: ChartSeries[];
  band?: BandPoint[];
  x0: number;
  x1: number;
  height: number;
  label: string;
  className?: string;
}) {
  const width = 1000;
  const bandRange =
    band && band.length > 0
      ? { min: Math.min(...band.map((b) => b.min)), max: Math.max(...band.map((b) => b.max)) }
      : null;
  const domain = valueDomain(
    series.map((s) => s.points),
    bandRange,
  ) ?? { min: 0, max: 1 };
  const scale: Scale = { x0, x1, y0: domain.min, y1: domain.max, width, height };
  const y = (v: number) => height - ((v - domain.min) / (domain.max - domain.min || 1)) * height;
  const x = (t: number) => ((t - x0) / (x1 - x0 || 1)) * width;

  let bandPath: string | null = null;
  if (band && band.length > 0) {
    const sorted = [...band].sort((a, b) => a.t - b.t);
    const pts = sorted.length === 1 ? [{ ...sorted[0], t: x0 }, { ...sorted[0], t: x1 }] : sorted;
    const top = pts.map((b) => `${x(b.t).toFixed(1)} ${y(b.max).toFixed(1)}`);
    const bottom = [...pts].reverse().map((b) => `${x(b.t).toFixed(1)} ${y(b.min).toFixed(1)}`);
    bandPath = `M${top.join(" L")} L${bottom.join(" L")}Z`;
  }

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height }}
    >
      {bandPath ? <path d={bandPath} fill="#EFF6FF" /> : null}
      {series.map((s, i) =>
        polylines(s.points, scale).map((points, j) => (
          <polyline
            key={`${i}-${j}`}
            points={points}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeDasharray={s.dash}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )),
      )}
    </svg>
  );
}

/** Legend swatches used above the desktop charts. */
export function ChartLegend({ bandLabel }: { bandLabel?: string }) {
  return (
    <span className="flex flex-wrap items-center gap-4 text-xs text-muted">
      <span className="flex items-center gap-2">
        <i className="inline-block h-[3px] w-4 bg-primary" aria-hidden />
        Experimental
      </span>
      <span className="flex items-center gap-2">
        <i className="inline-block w-4 border-t-2 border-dashed border-temp" aria-hidden />
        Control
      </span>
      {bandLabel ? (
        <span className="flex items-center gap-2">
          <i className="inline-block h-2.5 w-4 border border-[#BFDBFE] bg-primary-soft" aria-hidden />
          {bandLabel}
        </span>
      ) : null}
    </span>
  );
}
