import { Suspense } from "react";
import { ChartLine } from "lucide-react";
import { AppFrame, DesktopTop, PageBody, PhoneBar } from "@/components/app/app-frame";
import { EmptyNote, ErrorNote } from "@/components/app/ui";
import { getAppContext } from "@/lib/db/app-context";
import { listDailyStats, type DailyStat } from "@/lib/db/daily-stats";
import { listReadingSeries, type SeriesRow } from "@/lib/db/series";
import { parseHistoryQuery } from "@/lib/history";
import { HistoryView } from "./history-view";

function Fallback() {
  return <div className="flex min-h-dvh flex-1 items-center justify-center bg-bg text-sm text-muted">Loading…</div>;
}

async function HistoryBody({ searchParams }: { searchParams: PageProps<"/history">["searchParams"] }) {
  const [ctx, params] = await Promise.all([getAppContext(), searchParams]);
  const query = parseHistoryQuery(params, ctx.now);
  const device = ctx.current?.device ?? null;

  let rows: SeriesRow[] = [];
  let stats: DailyStat[] = [];
  let error: string | null = null;
  if (device) {
    try {
      [rows, stats] = await Promise.all([
        listReadingSeries(device.device_id, new Date(query.start).toISOString(), new Date(query.end).toISOString()),
        listDailyStats({ deviceId: device.device_id, from: query.from, to: query.to }),
      ]);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Failed to load history";
    }
  }

  let content;
  if (!ctx.current) content = <EmptyNote>No farms assigned to this account yet.</EmptyNote>;
  else if (!device) content = <EmptyNote>This farm has no ESP32 yet. Ask your admin to add one.</EmptyNote>;
  else if (error) content = <ErrorNote>{error}</ErrorNote>;
  else
    content = (
      <HistoryView
        query={query}
        rows={rows}
        stats={stats}
        flockStart={ctx.settings?.flock_start ?? null}
        limits={ctx.settings}
        now={ctx.now}
      />
    );

  return (
    <AppFrame ctx={ctx} active="history">
      <PhoneBar ctx={ctx} />
      <DesktopTop icon={ChartLine} title="History" />
      <PageBody>{content}</PageBody>
    </AppFrame>
  );
}

export default function HistoryPage({ searchParams }: PageProps<"/history">) {
  return (
    <Suspense fallback={<Fallback />}>
      <HistoryBody searchParams={searchParams} />
    </Suspense>
  );
}
