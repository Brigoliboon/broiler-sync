import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { ShellSkeleton } from "@/components/app/skeleton";
import { getAppContext } from "@/lib/db/app-context";

async function AppLayoutBody({ children }: { children: ReactNode }) {
  const ctx = await getAppContext();
  return <AppShell ctx={ctx}>{children}</AppShell>;
}

/**
 * Shared authenticated shell. The sidebar and bottom nav stay mounted while
 * each screen's loading.tsx skeletons the title and page body. The layout
 * itself is wrapped in Suspense so cookie/auth access can be prerendered.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton>{children}</ShellSkeleton>}>
      <AppLayoutBody>{children}</AppLayoutBody>
    </Suspense>
  );
}
