import type { ReactNode } from "react";

export const inputClass =
  "mt-1 w-full rounded-md border border-white/10 bg-[#0c1020] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-white/25";

export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/5 disabled:opacity-50";

export function Section({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="w-full">
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-medium tabular-nums text-zinc-100">
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 truncate text-xs text-zinc-500">{detail}</p>
      ) : null}
    </div>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
  dot = false,
}: {
  label: string;
  tone?: "neutral" | "good" | "bad" | "warn";
  dot?: boolean;
}) {
  const tones = {
    neutral: "text-zinc-400",
    good: "text-emerald-400",
    bad: "text-red-400",
    warn: "text-amber-400",
  };
  const dots = {
    neutral: "bg-zinc-500",
    good: "bg-emerald-400",
    bad: "bg-red-400",
    warn: "bg-amber-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${tones[tone]}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} /> : null}
      {label}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-8 text-sm text-zinc-500">{children}</p>;
}

export function Notice({
  tone,
  children,
}: {
  tone: "bad" | "good" | "warn";
  children: ReactNode;
}) {
  const tones = {
    bad: "border-red-500/30 bg-red-500/10 text-red-300",
    good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  };
  return (
    <div className={`w-full rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}
