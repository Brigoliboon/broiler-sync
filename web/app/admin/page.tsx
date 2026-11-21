import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { AppFrame, DesktopTop, PageBody } from "@/components/app/app-frame";
import { Chip, ErrorNote } from "@/components/app/ui";
import { ownerRows } from "@/lib/admin-view";
import { listAdminFarms, listAdminOwners, type AdminFarm, type AdminOwner } from "@/lib/db/admin";
import { getAppContext } from "@/lib/db/app-context";
import { AdminClient } from "./admin-client";

async function AdminBody() {
  const ctx = await getAppContext();
  if (!ctx.isAdmin) redirect("/dashboard");

  let owners: AdminOwner[] = [];
  let farms: AdminFarm[] = [];
  let error: string | null = null;
  try {
    [owners, { farms }] = await Promise.all([listAdminOwners(), listAdminFarms()]);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Failed to load owners";
  }

  const ownerOptions = owners
    .filter((owner) => owner.role === "owner" && owner.disabled_at === null)
    .map((owner) => ({ id: owner.id, label: owner.email ? `${owner.full_name} (${owner.email})` : owner.full_name }));

  return (
    <AppFrame ctx={ctx} active="admin">
      <header className="border-b border-border bg-surface p-4 lg:hidden">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl leading-[1.3] font-bold">
            <Users size={22} className="text-primary" aria-hidden />
            Owners
          </h1>
          <Chip tone="neutral">Admin</Chip>
        </div>
        <p className="text-sm text-muted">Create and manage farm owner accounts</p>
      </header>
      <DesktopTop icon={Users} title="Owners">
        <Chip tone="neutral">Admin</Chip>
      </DesktopTop>
      <PageBody className="lg:items-center">
        <div className="flex w-full flex-col gap-3 lg:max-w-[960px] lg:gap-4">
          <p className="hidden text-sm text-muted lg:block">Create and manage farm owner accounts</p>
          {error ? (
            <ErrorNote>{error}</ErrorNote>
          ) : (
            <AdminClient owners={ownerRows(owners, farms)} ownerOptions={ownerOptions} farms={farms} />
          )}
        </div>
      </PageBody>
    </AppFrame>
  );
}

function Fallback() {
  return <div className="flex min-h-dvh flex-1 items-center justify-center bg-bg text-sm text-muted">Loading…</div>;
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <AdminBody />
    </Suspense>
  );
}
