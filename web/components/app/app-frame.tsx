"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  Bird,
  ChartLine,
  ChevronDown,
  Download,
  House,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/login/actions";
import { selectFarm } from "@/app/farms/actions";
import type { AppContext } from "@/lib/db/app-context";
import { initials } from "@/lib/climate";
import { cx } from "./ui";

export type NavKey = "dashboard" | "history" | "alerts" | "export" | "settings" | "admin";

type NavItem = { key: NavKey; href: string; label: string; icon: LucideIcon };

const MAIN_NAV: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "history", href: "/history", label: "History", icon: ChartLine },
  { key: "alerts", href: "/alerts", label: "Alerts", icon: Bell },
  { key: "export", href: "/export", label: "Export", icon: Download },
];
const SETTINGS_NAV: NavItem = { key: "settings", href: "/settings", label: "Farm settings", icon: Settings };
const ADMIN_NAV: NavItem = { key: "admin", href: "/admin", label: "Owners", icon: Users };

function Brand() {
  return (
    <Link href="/dashboard" className="interactive flex items-center gap-2 rounded-sm text-lg font-bold">
      <span className="flex size-8 items-center justify-center rounded-sm bg-primary-soft">
        <Bird size={20} className="text-primary" aria-hidden />
      </span>
      BroilerSync
    </Link>
  );
}

function FarmSummary({ ctx }: { ctx: AppContext }) {
  const current = ctx.current;
  return (
    <>
      <span className="flex size-8 flex-none items-center justify-center rounded-sm bg-primary-soft">
        <House size={18} className="text-primary" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <b className="block truncate text-sm">{current?.farm.name ?? "No farm"}</b>
        {current ? (
          <span className={cx("flex items-center gap-1 text-xs", current.online ? "text-success" : "text-danger")}>
            {current.online ? <Wifi size={12} aria-hidden /> : <WifiOff size={12} aria-hidden />}
            {current.online ? "Online" : "Offline"}
            {current.device ? ` · ${current.device.device_id}` : ""}
          </span>
        ) : null}
      </span>
    </>
  );
}

/** Desktop farm switcher. A dropdown only when the user has more than one farm. */
function SidebarFarmSwitcher({ ctx, active }: { ctx: AppContext; active: NavKey }) {
  if (ctx.farms.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
        <FarmSummary ctx={ctx} />
      </div>
    );
  }
  const next = active === "admin" ? "/dashboard" : `/${active}`;
  return (
    <details className="group relative">
      <summary className="interactive flex cursor-pointer list-none items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-[#F1F5F9] [&::-webkit-details-marker]:hidden">
        <FarmSummary ctx={ctx} />
        <ChevronDown size={18} className="flex-none text-muted transition-transform group-open:rotate-180" aria-hidden />
        <span className="sr-only">Switch farm</span>
      </summary>
      <div className="absolute inset-x-0 top-full z-30 mt-1 flex flex-col gap-1 rounded-md border border-border bg-surface p-1 shadow-md">
        {ctx.farms.map((entry) => {
          const selected = entry.farm.id === ctx.current?.farm.id;
          return (
            <form key={entry.farm.id} action={selectFarm}>
              <input type="hidden" name="farmId" value={entry.farm.id} />
              <input type="hidden" name="next" value={next} />
              <button
                type="submit"
                aria-current={selected ? "true" : undefined}
                className={cx(
                  "interactive flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-left text-sm",
                  selected ? "bg-primary-soft font-bold text-primary" : "text-subtle hover:bg-[#F1F5F9] hover:text-text",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{entry.farm.name}</span>
                <span className={cx("size-2 flex-none rounded-full", entry.online ? "bg-success" : "bg-danger-accent")} aria-hidden />
                <span className="sr-only">{entry.online ? "Online" : "Offline"}</span>
              </button>
            </form>
          );
        })}
      </div>
    </details>
  );
}

function SideLink({ item, active, count }: { item: NavItem; active: boolean; count?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "interactive flex h-11 items-center gap-3 rounded-sm px-3 text-base",
        active ? "bg-primary-soft font-bold text-primary" : "font-medium text-subtle hover:bg-[#F1F5F9] hover:text-text",
      )}
    >
      <Icon size={20} aria-hidden />
      {item.label}
      {count ? (
        <span className="ml-auto rounded-full bg-danger-accent px-2 text-xs leading-5 font-bold text-white">{count}</span>
      ) : null}
    </Link>
  );
}

function SignOutButton({ size = 20 }: { size?: number }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        aria-label="Sign out"
        className="interactive flex size-11 items-center justify-center rounded-sm text-subtle hover:bg-[#F1F5F9] hover:text-text"
      >
        <LogOut size={size} aria-hidden />
      </button>
    </form>
  );
}

function Sidebar({ ctx, active }: { ctx: AppContext; active: NavKey }) {
  const alertCount = ctx.openAlerts.length;
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col gap-4 border-r border-border bg-surface px-4 py-5 lg:flex">
      <Brand />
      <SidebarFarmSwitcher ctx={ctx} active={active} />
      <nav aria-label="Main" className="flex flex-col gap-1">
        {MAIN_NAV.map((item) => (
          <SideLink key={item.key} item={item} active={active === item.key} count={item.key === "alerts" ? alertCount : undefined} />
        ))}
        <SideLink item={SETTINGS_NAV} active={active === "settings"} />
        {ctx.isAdmin ? (
          <>
            <span className="px-3 pt-2 text-xs font-semibold tracking-[.04em] text-muted uppercase">Admin</span>
            <SideLink item={ADMIN_NAV} active={active === "admin"} />
          </>
        ) : null}
      </nav>
      <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
          {initials(ctx.profile.full_name)}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-sm">{ctx.profile.full_name}</b>
          <span className="text-xs text-muted">{ctx.isAdmin ? "Admin" : "Owner"}</span>
        </span>
        <SignOutButton />
      </div>
    </aside>
  );
}

function BottomNav({ ctx, active }: { ctx: AppContext; active: NavKey }) {
  const items = ctx.isAdmin ? [...MAIN_NAV, ADMIN_NAV] : MAIN_NAV;
  const alertCount = ctx.openAlerts.length;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex h-[calc(72px+env(safe-area-inset-bottom))] items-start justify-around border-t border-border bg-surface pt-3 pb-[env(safe-area-inset-bottom)] text-xs text-muted lg:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const current = active === item.key;
        const count = item.key === "alerts" ? alertCount : 0;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cx(
              "interactive flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-sm",
              current ? "font-bold text-primary" : "hover:text-text",
            )}
          >
            <span className="relative flex">
              <Icon size={24} aria-hidden />
              {count ? (
                <span className="absolute -top-1 -right-2 rounded-sm bg-danger-accent px-1 text-[10px] leading-4 font-bold text-white">
                  {count}
                  <span className="sr-only"> open alerts</span>
                </span>
              ) : null}
            </span>
            {item.key === "admin" ? "Owners" : item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * App shell from the Figma frames: a 248px sidebar from 1024px up, a phone
 * bottom nav below that. Pages render their own headers inside.
 */
export function AppFrame({
  ctx,
  active,
  phoneNav = true,
  children,
}: {
  ctx: AppContext;
  active: NavKey;
  /** Sub-pages with a back button (Farm settings) hide the phone bottom nav, as in the frames. */
  phoneNav?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-1 bg-bg text-text">
      <Sidebar ctx={ctx} active={active} />
      <div className={cx("flex min-w-0 flex-1 flex-col lg:pb-0", phoneNav && "pb-[calc(72px+env(safe-area-inset-bottom))]")}>
        {children}
      </div>
      {phoneNav ? <BottomNav ctx={ctx} active={active} /> : null}
    </div>
  );
}

/** Phone top bar: farm name (opens the farm list when there is more than one) and settings. */
export function PhoneBar({ ctx, children }: { ctx: AppContext; children?: ReactNode }) {
  const name = ctx.current?.farm.name ?? "BroilerSync";
  const many = ctx.farms.length > 1;
  return (
    <header className="border-b border-border bg-surface p-4 lg:hidden">
      <div className="flex items-center justify-between">
        {many ? (
          <Link href="/farms" className="interactive flex items-center gap-2 rounded-sm text-xl leading-[1.3] font-bold">
            {name}
            <ChevronDown size={20} aria-hidden />
            <span className="sr-only">Switch farm</span>
          </Link>
        ) : (
          <h1 className="text-xl leading-[1.3] font-bold">{name}</h1>
        )}
        <Link
          href="/settings"
          aria-label="Farm settings"
          className="interactive flex size-11 items-center justify-center rounded-sm text-subtle hover:bg-[#F1F5F9] hover:text-text"
        >
          <Settings size={22} aria-hidden />
        </Link>
      </div>
      {children ? <div className="mt-2 flex flex-wrap gap-2">{children}</div> : null}
    </header>
  );
}

/** Desktop top bar: page title with icon, optional right-hand content.
 *  `icon` must be a rendered node — Lucide components cannot be passed
 *  as props from Server Components into this Client Component. */
export function DesktopTop({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <header className="hidden h-[72px] flex-none items-center justify-between border-b border-border bg-surface px-8 lg:flex">
      <h1 className="flex items-center gap-2 text-2xl leading-[1.3] font-bold">
        {icon}
        {title}
      </h1>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}

/** Page body padding: 16px on phones, 24px/32px with the sidebar. */
export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return <main className={cx("flex flex-1 flex-col gap-3 p-4 lg:gap-4 lg:px-8 lg:py-6", className)}>{children}</main>;
}

export { SignOutButton };
