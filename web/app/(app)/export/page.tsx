import { Download, FileSpreadsheet } from "lucide-react";
import { DesktopTop, PageBody, PhoneBar } from "@/components/app/app-frame";
import { EmptyNote, ErrorNote } from "@/components/app/ui";
import { MAX_EXPORT_DAYS, parseExportQuery, type ExportCompartment } from "@/lib/csv";
import { getAppContext } from "@/lib/db/app-context";
import { countReadings } from "@/lib/db/export";
import { addDays, daysBetween, isIsoDate, manilaDate } from "@/lib/history";
import { ExportForm } from "./export-form";

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function estimateText(count: number, compartments: number, startMs: number, endMs: number): string {
  if (count === 0) return "No readings in these dates";
  const rows = (count * compartments).toLocaleString("en-US");
  const minutes = count > 1 ? Math.max(1, Math.round((endMs - startMs) / 60_000 / count)) : null;
  return minutes ? `About ${rows} rows · one reading every ${minutes} min` : `About ${rows} rows`;
}

export default async function ExportPage({ searchParams }: PageProps<"/export">) {
  const [ctx, params] = await Promise.all([getAppContext(), searchParams]);
  const today = manilaDate(ctx.now);
  const flockStart = ctx.settings?.flock_start ?? null;

  // Default range: flock start (if within the export limit) or the last 7 days, to today.
  let from = one(params.from);
  let to = one(params.to);
  if (!isIsoDate(to) || to > today) to = today;
  if (!isIsoDate(from) || from > to) {
    const start = flockStart?.slice(0, 10);
    from = start && isIsoDate(start) && start <= to && daysBetween(start, to) < MAX_EXPORT_DAYS ? start : addDays(to, -6);
  }
  const c = one(params.compartment);
  const compartment: ExportCompartment = c === "experimental" || c === "control" ? c : "both";

  const farm = ctx.current?.farm ?? null;
  const device = ctx.current?.device ?? null;
  let estimate = "";
  let error: string | null = null;
  if (farm && device) {
    const query = parseExportQuery({ farm_id: farm.id, from, to, compartment }, today);
    if ("error" in query) {
      estimate = query.error;
    } else {
      try {
        const count = await countReadings(device.device_id, query.start, query.end);
        estimate = estimateText(count, compartment === "both" ? 2 : 1, Date.parse(query.start), Math.min(Date.parse(query.end), ctx.now));
      } catch (caught) {
        error = caught instanceof Error ? caught.message : "Failed to count readings";
      }
    }
  }

  return (
    <>
      <PhoneBar ctx={ctx} />
      <DesktopTop icon={<Download size={24} className="text-primary" aria-hidden />} title="Export" />
      <PageBody className="lg:items-center">
        <div className="flex w-full flex-col gap-3 lg:max-w-[720px]">
          <div className="flex items-center gap-3">
            <span className="flex size-11 flex-none items-center justify-center rounded-sm bg-success-soft">
              <FileSpreadsheet size={22} className="text-success" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg leading-[1.3] font-bold">Export readings</h2>
              <p className="text-sm text-muted">Download a CSV for your report</p>
            </div>
          </div>
          {!farm ? (
            <EmptyNote>No farms assigned to this account yet.</EmptyNote>
          ) : !device ? (
            <EmptyNote>This farm has no ESP32 yet. Ask your admin to add one.</EmptyNote>
          ) : (
            <>
              {error ? <ErrorNote>{error}</ErrorNote> : null}
              <ExportForm
                key={farm.id}
                farmId={farm.id}
                from={from}
                to={to}
                compartment={compartment}
                today={today}
                maxDays={MAX_EXPORT_DAYS}
                flockStart={flockStart}
                estimate={estimate}
              />
            </>
          )}
        </div>
      </PageBody>
    </>
  );
}
