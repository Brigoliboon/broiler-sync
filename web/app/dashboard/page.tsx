import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/db/profiles";
import { getAuthUserId } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

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

  return (
    <DashboardClient
      userId={userId}
      role={profile?.role ?? "owner"}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <DashboardBody />
    </Suspense>
  );
}
