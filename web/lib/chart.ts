/** Pure geometry for the small SVG line charts (no chart library). */

export type Point = { t: number; v: number | null };

export type Scale = { x0: number; x1: number; y0: number; y1: number; width: number; height: number };

/** Value range covering every point and the optional band, padded a little. */
export function valueDomain(
  series: readonly (readonly Point[])[],
  band?: { min: number; max: number } | null,
  pad = 0.5,
): { min: number; max: number } | null {
  const values: number[] = [];
  for (const points of series) {
    for (const point of points) if (typeof point.v === "number" && Number.isFinite(point.v)) values.push(point.v);
  }
  if (band) values.push(band.min, band.max);
  if (values.length === 0) return null;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 1e-9) {
    min -= 1;
    max += 1;
  }
  return { min: min - pad, max: max + pad };
}

export function project(scale: Scale, t: number, v: number): [number, number] {
  const x = ((t - scale.x0) / (scale.x1 - scale.x0 || 1)) * scale.width;
  const y = scale.height - ((v - scale.y0) / (scale.y1 - scale.y0 || 1)) * scale.height;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

/**
 * SVG `points` strings, one per unbroken run. A null value or a gap longer
 * than `maxGapMs` (missed syncs) starts a new run instead of drawing across it.
 */
export function polylines(points: readonly Point[], scale: Scale, maxGapMs = 15 * 60_000): string[] {
  const runs: string[] = [];
  let current: string[] = [];
  let lastT: number | null = null;
  const sorted = [...points].sort((a, b) => a.t - b.t);
  for (const point of sorted) {
    const valid = typeof point.v === "number" && Number.isFinite(point.v);
    const gap = lastT !== null && point.t - lastT > maxGapMs;
    if (!valid || gap) {
      if (current.length > 1) runs.push(current.join(" "));
      current = [];
    }
    if (valid) {
      const [x, y] = project(scale, point.t, point.v as number);
      current.push(`${x},${y}`);
      lastT = point.t;
    }
  }
  if (current.length > 1) runs.push(current.join(" "));
  return runs;
}

export function minMax(points: readonly Point[]): { min: number; max: number } | null {
  const values = points.map((p) => p.v).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Averages points into `buckets` equal time slots between x0 and x1 so a long
 * range stays a few hundred SVG points. Empty slots become null (a gap).
 */
export function bucketAverage(points: readonly Point[], x0: number, x1: number, buckets: number): Point[] {
  if (buckets <= 0 || x1 <= x0) return [];
  const width = (x1 - x0) / buckets;
  const sums = new Array<number>(buckets).fill(0);
  const counts = new Array<number>(buckets).fill(0);
  for (const point of points) {
    if (typeof point.v !== "number" || !Number.isFinite(point.v)) continue;
    if (point.t < x0 || point.t > x1) continue;
    const index = Math.min(buckets - 1, Math.floor((point.t - x0) / width));
    sums[index] += point.v;
    counts[index] += 1;
  }
  return sums.map((sum, i) => ({ t: x0 + (i + 0.5) * width, v: counts[i] ? sum / counts[i] : null }));
}
