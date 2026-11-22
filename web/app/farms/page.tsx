import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ChevronRight, House, LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { FarmsListSkeleton } from "@/components/app/skeleton";
import { OnlineChip, cx } from "@/components/app/ui";
import { getAppContext } from "@/lib/db/app-context";
import { selectFarm } from "./actions";

async function FarmList() {
  const ctx = await getAppContext();
  // The switcher only exists for owners with more than one farm.
  if (ctx.farms.length <= 1) redirect("/dashboard");
  const now = ctx.now;

  return (
    <div className="flex flex-col gap-3 p-4">
      {ctx.farms.map((entry) => {
        const selected = entry.farm.id === ctx.current?.farm.id;
        return (
          <form key={entry.farm.id} action={selectFarm}>
            <input type="hidden" name="farmId" value={entry.farm.id} />
            <input type="hidden" name="next" value="/dashboard" />
            <button
              type="submit"
              aria-current={selected ? "true" : undefined}
              className={cx(
                "interactive flex w-full items-center gap-3 rounded-md bg-surface text-left hover:bg-[#F1F5F9]",
                selected ? "border-2 border-primary p-[15px]" : "border border-border p-4",
              )}
            >
              <span className="flex size-11 flex-none items-center justify-center rounded-sm bg-primary-soft">
                <House size={22} className="text-primary" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-base">{entry.farm.name}</b>
                <span className="block text-xs text-muted">
                  {entry.device ? `ESP32 · ${entry.device.device_id}` : "No ESP32 yet"}
                </span>
              </span>
              <OnlineChip online={entry.online} lastSeenAt={entry.device?.last_seen_at} now={now} />
              <ChevronRight size={20} className="flex-none text-muted" aria-hidden />
            </button>
          </form>
        );
      })}
      <form action={signOut} className="mt-2 flex justify-center">
        <button type="submit" className="interactive flex min-h-11 items-center gap-2 rounded-sm px-3 text-sm text-muted hover:text-text">
          <LogOut size={18} aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );
}

export default function FarmsPage() {
  return (
    <div className="flex min-h-dvh w-full flex-1 justify-center bg-bg text-text">
      <div className="w-full max-w-[720px]">
        <header className="border-b border-border bg-surface p-4">
          <h1 className="text-xl leading-[1.3] font-bold">Your farms</h1>
          <p className="text-sm text-muted">Pick a farm to open its dashboard</p>
        </header>
        <Suspense fallback={<FarmsListSkeleton />}>
          <FarmList />
        </Suspense>
      </div>
    </div>
  );
}
