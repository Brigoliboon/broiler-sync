import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isDeviceOnline } from "@/lib/dashboard-utils";
import { getDashboardData } from "@/lib/db/dashboard";
import { DbError } from "@/lib/db/errors";
import { getProfile } from "@/lib/db/profiles";
import { getAuthUserId } from "@/lib/supabase/server";
import { DashboardShell } from "./dashboard-shell";
import { DashboardView } from "./dashboard-view";

function Fallback() {
  return (
    <main className="flex min-h-full w-full items-center justify-center bg-[#060918] text-white">
      Loading...
    </main>
  );
}

async function DashboardBody() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");
  const profile = await getProfile(userId);
  if (profile?.disabled_at) redirect("/login");

  let error: string | null = null;
  let role = "owner";
  let items: Awaited<ReturnType<typeof getDashboardData>>["items"] = [];

  try {
    const data = await getDashboardData();
    role = data.role;
    items = data.items;
  } catch (caught) {
    error =
      caught instanceof DbError
        ? caught.message
        : caught instanceof Error
          ? caught.message
          : "Failed to load dashboard";
  }

  const online = items.some((item) =>
    isDeviceOnline(item.device?.last_seen_at ?? null),
  );

  return (
    <DashboardShell role={role} online={online}>
      <DashboardView items={items} error={error} />
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <DashboardBody />
    </Suspense>
  );
}
