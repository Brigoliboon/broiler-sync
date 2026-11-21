import type { ComponentProps, ReactNode } from "react";
import { Info, TriangleAlert, Wifi, WifiOff } from "lucide-react";
import { formatSpan } from "@/lib/climate";

/** Utility for joining class names. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** `.card`: white surface, 1px border, 12px radius, 16px padding. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-md border border-border bg-surface p-4", className)} {...props} />;
}

type Tone = "blue" | "green" | "red" | "neutral";
const CHIP_TONES: Record<Tone, string> = {
  blue: "bg-primary-soft text-primary",
  green: "bg-success-soft text-success",
  red: "bg-danger-soft text-danger",
  neutral: "bg-[#F1F5F9] text-subtle",
};

/** `.chip`: 12px semibold pill with an optional icon. */
export function Chip({ tone = "blue", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs leading-[1.5] font-semibold", CHIP_TONES[tone], className)}>
      {children}
    </span>
  );
}

type TagTone = "on" | "off" | "bad" | "warn";
const TAG_TONES: Record<TagTone, string> = {
  on: "bg-success-soft text-success",
  off: "bg-[#F1F5F9] text-subtle",
  bad: "bg-danger-soft text-danger",
  warn: "bg-warning-soft text-warning",
};

/** `.tag`: 12px bold status label with a 4px radius. */
export function Tag({ tone, className, children }: { tone: TagTone; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-xs font-bold", TAG_TONES[tone], className)}>
      {children}
    </span>
  );
}

/** `.ib`: 32px tinted icon tile. */
export function IconBox({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cx("flex size-8 flex-none items-center justify-center rounded-sm", className)}>{children}</span>;
}

/** Online / offline chip for a device. */
export function OnlineChip({ online, lastSeenAt, now }: { online: boolean; lastSeenAt: string | null | undefined; now: number }) {
  if (online) {
    return (
      <Chip tone="green">
        <Wifi size={14} aria-hidden />
        Online
      </Chip>
    );
  }
  const seen = lastSeenAt ? new Date(lastSeenAt).getTime() : NaN;
  const span = Number.isNaN(seen) ? null : formatSpan((now - seen) / 60_000);
  return (
    <Chip tone="red">
      <WifiOff size={14} aria-hidden />
      {span ? `Offline ${span}` : "Offline"}
    </Chip>
  );
}

/** `.alert` style message (left red rule on soft red). */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-center gap-2 rounded-sm border-l-4 border-danger-accent bg-danger-soft p-3 text-sm text-danger">
      <TriangleAlert size={20} className="flex-none text-danger-accent" aria-hidden />
      <span className="flex-1">{children}</span>
    </div>
  );
}

/** Neutral info card used for empty states. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <Card className="flex items-start gap-3 bg-bg">
      <Info size={20} className="mt-0.5 flex-none text-primary" aria-hidden />
      <span className="text-sm text-muted">{children}</span>
    </Card>
  );
}
