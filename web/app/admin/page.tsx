import { Suspense } from "react";
import { redirect } from "next/navigation";
import { listAdminFarms, listAdminOwners } from "@/lib/db/admin";
import { getProfile } from "@/lib/db/profiles";
import { getAuthUserId } from "@/lib/supabase/server";
import { AdminClient } from "./admin-client";

function Fallback() {
  return (
    <main className="flex min-h-full w-full items-center justify-center bg-[#060918] text-white">
      Loading...
    </main>
  );
}

async function AdminBody() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");

  const profile = await getProfile(userId);
  if (!profile || profile.role !== "admin" || profile.disabled_at) {
    redirect("/dashboard");
  }

  const [owners, farmsData] = await Promise.all([
    listAdminOwners(),
    listAdminFarms(),
  ]);

  return <AdminClient owners={owners} farms={farmsData.farms} />;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <AdminBody />
    </Suspense>
  );
}
