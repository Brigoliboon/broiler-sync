"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { AppContext } from "@/lib/db/app-context";
import { AppFrame, type NavKey } from "./app-frame";

function navFromPath(pathname: string): NavKey {
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/alerts")) return "alerts";
  if (pathname.startsWith("/export")) return "export";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/admin")) return "admin";
  return "dashboard";
}

/** Client shell so the active nav item follows the pathname without remounting the layout. */
export function AppShell({ ctx, children }: { ctx: AppContext; children: ReactNode }) {
  const pathname = usePathname();
  const active = navFromPath(pathname);
  return (
    <AppFrame ctx={ctx} active={active} phoneNav={active !== "settings"}>
      {children}
    </AppFrame>
  );
}
