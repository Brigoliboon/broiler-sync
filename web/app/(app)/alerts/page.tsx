import Link from "next/link";
import {
  BatteryLow,
  Bell,
  Droplet,
  Thermometer,
  TriangleAlert,
  Wind,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { DesktopTop, PageBody, PhoneBar } from "@/components/app/app-frame";
import { Card, EmptyNote, ErrorNote, IconBox, Tag, cx } from "@/components/app/ui";
import { feedItem, type FeedItem } from "@/lib/alert-feed";
import { DEFAULT_LIMITS } from "@/lib/climate";
import { listAlerts } from "@/lib/db/alerts";
import { getAppContext } from "@/lib/db/app-context";
import { buildIncidents, type Incident } from "@/lib/incidents";
import { vapidPublicKey } from "@/lib/push/config";
import { PushToggle } from "./push-toggle";

const EARLIER_LIMIT = 5;
const RESOLVED_LIMIT = 50;

const ICONS: Record<FeedItem["metric"], LucideIcon> = {
  temp: Thermometer,
  hum: Droplet,
  wind: Wind,
  offline: WifiOff,
  battery: BatteryLow,
  other: TriangleAlert,
};

function AlertCard({ item }: { item: FeedItem }) {
  const Icon = ICONS[item.metric];
  const tone = !item.open ? "resolved" : item.severity;
  return (
    <Card className="flex items-start gap-3 p-3">
      <IconBox className={tone === "critical" ? "bg-danger-soft" : tone === "warning" ? "bg-warning-soft" : "bg-[#F1F5F9]"}>
        <Icon
          size={18}
          className={tone === "critical" ? "text-danger" : tone === "warning" ? "text-warning" : "text-subtle"}
          aria-hidden
        />
      </IconBox>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <b className="text-base">{item.title}</b>
          {tone === "critical" ? (
            <Tag tone="bad">Critical</Tag>
          ) : tone === "warning" ? (
            <Tag tone="warn">Warning</Tag>
          ) : (
            <Tag tone="off">Resolved</Tag>
          )}
        </div>
        <p className="text-sm text-muted">{item.detail}</p>
        <p className="mt-1 text-xs text-muted">
          {item.when} · {item.scope}
        </p>
      </div>
      {item.open ? (
        <span className="mt-2 size-2 flex-none rounded-full bg-primary">
          <span className="sr-only">Active</span>
        </span>
      ) : null}
    </Card>
  );
}

function Tabs({ tab, activeCount }: { tab: "active" | "resolved"; activeCount: number }) {
  const items = [
    { key: "active", label: `Active · ${activeCount}`, href: "/alerts" },
    { key: "resolved", label: "Resolved", href: "/alerts?tab=resolved" },
  ] as const;
  return (
    <nav aria-label="Alert status" className="flex rounded-md bg-border p-1">
      {items.map((item) => {
        const selected = item.key === tab;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={selected ? "page" : undefined}
            className={cx(
              "interactive flex h-11 flex-1 items-center justify-center rounded-sm text-sm font-semibold",
              selected ? "bg-surface text-text shadow-sm" : "text-subtle hover:text-text",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default async function AlertsPage({ searchParams }: PageProps<"/alerts">) {
  const [ctx, params] = await Promise.all([getAppContext(), searchParams]);
  const tab = params.tab === "resolved" ? "resolved" : "active";
  const device = ctx.current?.device ?? null;

  let incidents: Incident[] = [];
  let error: string | null = null;
  if (device) {
    try {
      incidents = buildIncidents(await listAlerts({ deviceId: device.device_id, limit: 500 }));
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Failed to load alerts";
    }
  }

  const s = ctx.settings;
  const describeCtx = {
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
  };
  const items = incidents.map((incident) => feedItem(incident, ctx.now, describeCtx));
  const active = items.filter((item) => item.open);
  const resolved = items.filter((item) => !item.open);

  let list;
  if (!ctx.current) list = <EmptyNote>No farms assigned to this account yet.</EmptyNote>;
  else if (!device) list = <EmptyNote>This farm has no ESP32 yet. Ask your admin to add one.</EmptyNote>;
  else if (error) list = <ErrorNote>{error}</ErrorNote>;
  else if (tab === "active")
    list = (
      <>
        {active.length ? (
          active.map((item) => <AlertCard key={item.key} item={item} />)
        ) : (
          <EmptyNote>No active alerts. Both compartments are in range.</EmptyNote>
        )}
        {resolved.length ? (
          <>
            <p className="mt-1 text-xs text-muted">Earlier</p>
            {resolved.slice(0, EARLIER_LIMIT).map((item) => (
              <AlertCard key={item.key} item={item} />
            ))}
          </>
        ) : null}
      </>
    );
  else
    list = resolved.length ? (
      resolved.slice(0, RESOLVED_LIMIT).map((item) => <AlertCard key={item.key} item={item} />)
    ) : (
      <EmptyNote>No resolved alerts yet.</EmptyNote>
    );

  return (
    <>
      <PhoneBar ctx={ctx} />
      <DesktopTop icon={Bell} title="Alerts" />
      <PageBody className="lg:items-center">
        <div className="flex w-full flex-col gap-3 lg:max-w-[720px]">
          {ctx.isAdmin ? null : <PushToggle publicKey={vapidPublicKey()} />}
          {device ? <Tabs tab={tab} activeCount={active.length} /> : null}
          {list}
        </div>
      </PageBody>
    </>
  );
}
