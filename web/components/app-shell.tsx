"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  GridIcon,
  LeafIcon,
  LogoutIcon,
  MenuIcon,
  RefreshIcon,
  ShieldIcon,
} from "@/components/icons";
import { signOut } from "@/app/login/actions";

type Props = {
  title: string;
  subtitle?: string;
  role?: string;
  online?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

function Nav({
  pathname,
  role,
  onSignOut,
  onNavigate,
}: {
  pathname: string;
  role?: string;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const links = [
    { href: "/dashboard", label: "Dashboard", icon: GridIcon },
    ...(role === "admin" ? [{ href: "/admin", label: "Admin", icon: ShieldIcon }] : []),
  ];
  return (
    <div className="flex h-full w-full flex-col bg-[#080c1e]">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-400/15 text-emerald-300">
          <LeafIcon className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">BroilerSync</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
        >
          <LogoutIcon className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  role,
  online,
  refreshing,
  onRefresh,
  actions,
  children,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-full min-h-dvh w-full flex-1 bg-[#060918] text-zinc-100">
      <aside className="hidden h-full w-56 shrink-0 border-r border-white/10 lg:block">
        <Nav pathname={pathname} role={role} onSignOut={() => void signOut()} />
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-64 border-r border-white/10">
            <Nav
              pathname={pathname}
              role={role}
              onSignOut={() => void signOut()}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="rounded-md p-2 text-zinc-300 hover:bg-white/5"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold">BroilerSync</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {actions}
            {online !== undefined ? (
              <span
                className={`inline-flex items-center gap-2 text-xs font-medium ${
                  online ? "text-emerald-400" : "text-red-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-red-400"}`}
                />
                {online ? "Online" : "Offline"}
              </span>
            ) : null}
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh"
                className="rounded-md p-2 text-zinc-300 hover:bg-white/5 disabled:opacity-50"
              >
                <RefreshIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            ) : null}
            <span className="text-sm text-zinc-400">
              {role ? role[0].toUpperCase() + role.slice(1) : "Owner"}
            </span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
            ) : null}
          </header>
          <div className="flex w-full flex-col gap-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
