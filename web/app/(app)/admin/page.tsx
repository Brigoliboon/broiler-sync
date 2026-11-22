import { redirect } from "next/navigation";
import { PageBody } from "@/components/app/app-frame";
import { ErrorNote } from "@/components/app/ui";
import { ownerRows } from "@/lib/admin-view";
import { listAdminFarms, listAdminOwners, type AdminFarm, type AdminOwner } from "@/lib/db/admin";
import { getAppContext } from "@/lib/db/app-context";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
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
  );
}
