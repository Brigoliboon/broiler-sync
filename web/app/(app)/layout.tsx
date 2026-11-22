import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { getAppContext } from "@/lib/db/app-context";

export const instant = false;

/**
 * Shared authenticated shell. The sidebar, bottom nav and toolbar stay
 * mounted with real content while each screen's loading.tsx skeletons
 * only the page body.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getAppContext();
  return <AppShell ctx={ctx}>{children}</AppShell>;
}
