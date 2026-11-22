"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Box, Calendar, Download, FlaskConical, Info } from "lucide-react";

type Compartment = "both" | "experimental" | "control";

const FIELD =
  "flex h-12 items-center gap-2 rounded-sm border border-border-strong bg-surface px-3 text-base text-text focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-primary";

function dayNumber(date: string, flockStart: string | null): number | null {
  if (!flockStart || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${flockStart.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
  return days >= 0 ? days : null;
}

export function ExportForm({
  farmId,
  from: initialFrom,
  to: initialTo,
  compartment: initialCompartment,
  today,
  maxDays,
  flockStart,
  estimate,
}: {
  farmId: string;
  from: string;
  to: string;
  compartment: Compartment;
  today: string;
  maxDays: number;
  flockStart: string | null;
  estimate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [compartment, setCompartment] = useState<Compartment>(initialCompartment);

  const span = from && to ? Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1 : 0;
  const error = !from || !to
    ? "Pick a From and To date"
    : from > to
      ? "From must be on or before To"
      : span > maxDays
        ? `Export up to ${maxDays} days at a time`
        : null;

  function update(next: { from?: string; to?: string; compartment?: Compartment }) {
    const f = next.from ?? from;
    const t = next.to ?? to;
    const c = next.compartment ?? compartment;
    if (next.from !== undefined) setFrom(f);
    if (next.to !== undefined) setTo(t);
    if (next.compartment !== undefined) setCompartment(c);
    if (f && t && f <= t) {
      const params = new URLSearchParams({ from: f, to: t });
      if (c !== "both") params.set("compartment", c);
      startTransition(() => router.replace(`/export?${params}`, { scroll: false }));
    }
  }

  const options: { key: Compartment; label: string; icon?: typeof Box }[] = [
    { key: "both", label: "Both" },
    { key: "experimental", label: "Exp.", icon: FlaskConical },
    { key: "control", label: "Control", icon: Box },
  ];

  return (
    <form action="/api/export" method="get" className="flex flex-col gap-3">
      <input type="hidden" name="farm_id" value={farmId} />
      <input type="hidden" name="compartment" value={compartment} />
      <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
        {(
          [
            ["from", "From", from, (v: string) => update({ from: v })],
            ["to", "To", to, (v: string) => update({ to: v })],
          ] as const
        ).map(([name, label, value, onChange]) => {
          const day = dayNumber(value, flockStart);
          return (
            <label key={name} className="block">
              <span className="mb-1 block text-sm font-semibold">{label}</span>
              <span className={FIELD}>
                <Calendar size={20} className="flex-none text-muted" aria-hidden />
                <input
                  type="date"
                  name={name}
                  value={value}
                  max={today}
                  required
                  onChange={(event) => onChange(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
                {day !== null ? <span className="flex-none text-xs text-muted">Day {day}</span> : null}
              </span>
            </label>
          );
        })}
        <div>
          <span id="compartment-label" className="mb-1 block text-sm font-semibold">
            Compartment
          </span>
          <div role="radiogroup" aria-labelledby="compartment-label" className="flex rounded-md bg-border p-1">
            {options.map((option) => {
              const selected = option.key === compartment;
              const Icon = option.icon;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => update({ compartment: option.key })}
                  className={
                    "interactive flex h-11 flex-1 items-center justify-center gap-2 rounded-sm text-sm font-semibold " +
                    (selected ? "bg-surface text-text shadow-sm" : "text-subtle hover:text-text")
                  }
                >
                  {Icon ? <Icon size={16} aria-hidden /> : null}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
          <Info size={18} className="flex-none text-primary" aria-hidden />
          {error ?? (pending ? "Counting rows…" : estimate)}
        </p>
      </div>
      <button
        type="submit"
        disabled={Boolean(error)}
        className="interactive flex h-12 items-center justify-center gap-2 rounded-sm bg-primary text-base font-semibold text-white hover:bg-primary-hover"
      >
        <Download size={20} aria-hidden />
        Download CSV
      </button>
      <p className="text-xs text-muted">Columns: timestamp, compartment, temp °C, humidity %, air m/s, fan, lamp, mode</p>
    </form>
  );
}
