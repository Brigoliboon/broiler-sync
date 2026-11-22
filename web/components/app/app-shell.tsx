"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChartLine, ChevronLeft, Download, LayoutDashboard, Settings, Users } from "lucide-react";
import type { AppContext } from "@/lib/db/app-context";
import { AppFrame, DesktopTop, PhoneBar, type NavKey } from "./app-frame";
import { Chip } from "./ui";

function navFromPath(pathname: string): NavKey {
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/alerts")) return "alerts";
  if (pathname.startsWith("/export")) return "export";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/admin")) return "admin";
  return "dashboard";
}

const TITLES: Record<NavKey, { title: string; icon: ReactNode }> = {
  dashboard: { title: "Dashboard", icon: <LayoutDashboard size={24} className="text-primary" aria-hidden /> },
  history: { title: "History", icon: <ChartLine size={24} className="text-primary" aria-hidden /> },
  alerts: { title: "Alerts", icon: <Bell size={24} className="text-primary" aria-hidden /> },
  export: { title: "Export", icon: <Download size={24} className="text-primary" aria-hidden /> },
  settings: { title: "Farm settings", icon: <Settings size={24} className="text-primary" aria-hidden /> },
  admin: { title: "Owners", icon: <Users size={24} className="text-primary" aria-hidden /> },
};

type Extras = { phone: ReactNode; desktop: ReactNode };

const ShellExtrasContext = createContext<{ setExtras: (extras: Extras) => void } | null>(null);

/** Lets a page inject toolbar extras (dashboard status chips) without remounting the shell. */
export function ShellExtras({ phone, desktop }: { phone?: ReactNode; desktop?: ReactNode }) {
  const slot = useContext(ShellExtrasContext);
  useLayoutEffect(() => {
    if (!slot) return;
    slot.setExtras({ phone: phone ?? null, desktop: desktop ?? null });
    return () => slot.setExtras({ phone: null, desktop: null });
  }, [slot, phone, desktop]);
  return null;
}

/** Client shell so the active nav item follows the pathname without remounting the layout. */
export function AppShell({ ctx, children }: { ctx: AppContext; children: ReactNode }) {
  const pathname = usePathname();
  const active = navFromPath(pathname);
  const { title, icon } = TITLES[active];
  const [extras, setExtras] = useState<Extras>({ phone: null, desktop: null });
  const slot = useMemo(() => ({ setExtras }), []);

  let phoneHeader: ReactNode;
  if (active === "settings") {
    phoneHeader = (
      <header className="flex items-center gap-2 border-b border-border bg-surface p-4 lg:hidden">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="interactive -ml-3 flex size-11 items-center justify-center rounded-sm hover:bg-[#F1F5F9]"
        >
          <ChevronLeft size={24} aria-hidden />
        </Link>
        <h1 className="text-xl leading-[1.3] font-bold">Farm settings</h1>
      </header>
    );
  } else if (active === "admin") {
    phoneHeader = (
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
    );
  } else {
    phoneHeader = <PhoneBar ctx={ctx}>{extras.phone}</PhoneBar>;
  }

  return (
    <ShellExtrasContext.Provider value={slot}>
      <AppFrame ctx={ctx} active={active} phoneNav={active !== "settings"}>
        {phoneHeader}
        <DesktopTop icon={icon} title={title}>
          {active === "admin" ? <Chip tone="neutral">Admin</Chip> : null}
          {extras.desktop}
        </DesktopTop>
        {children}
      </AppFrame>
    </ShellExtrasContext.Provider>
  );
}
