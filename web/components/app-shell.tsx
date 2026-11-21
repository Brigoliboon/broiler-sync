"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ChevronDownIcon,
  GearIcon,
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

function Banner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 160" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <rect width="600" height="160" fill="#171b4d" />
      <path d="M0 100c80-25 140-10 200 8 70 20 130 8 190-10 70-22 140-8 210 12v50H0Z" fill="#11163d" />
      <path d="M0 125c90-15 160 0 230 10 80 10 150-5 230-12 50-5 95 0 140 8v29H0Z" fill="#0a0e26" />
      <path d="M360 118h70v30h-70z" fill="#5b2340" />
      <path d="m352 120 43-28 43 28Z" fill="#83304f" />
      <path d="M390 130h18v18h-18z" fill="#2a1830" />
      <path d="M496 122h6v28h-6z" fill="#2a2d5e" />
      <circle cx="499" cy="90" r="4" fill="#8f96d9" />
      <path d="M499 90 472 68M499 90l27-22M499 90V55" stroke="#8f96d9" strokeWidth="3" strokeLinecap="round" />
      <path d="M80 155c4-14 6-24 5-34M104 155c3-12 5-20 4-30" stroke="#2f8d63" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function FarmAvatar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#102b55" />
      <path d="M0 42c14-8 24-6 34 0 12 7 20 4 30-2v24H0Z" fill="#1a7a4c" />
      <path d="M22 34h20v18H22z" fill="#b34259" />
      <path d="m18 35 14-12 14 12Z" fill="#df5b72" />
      <path d="M28 40h8v12h-8z" fill="#3a1f31" />
      <circle cx="48" cy="16" r="6" fill="#f5c76b" />
    </svg>
  );
}

function Nav({ pathname, role, onSignOut }: { pathname: string; role?: string; onSignOut: () => void }) {
  const links = [
    { href: "/dashboard", label: "Dashboard", icon: GridIcon },
    ...(role === "admin" ? [{ href: "/admin", label: "Admin", icon: ShieldIcon }] : []),
  ];
  return (
    <div className="flex h-full w-full flex-col bg-[#080c1e]">
      <Link href="/dashboard" className="flex items-center gap-3 px-6 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-[#071426]">
          <LeafIcon className="h-5 w-5" />
        </span>
        <span className="font-semibold">BroilerSync</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${active ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-white/5"}`}>
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-1 border-t border-white/10 p-3">
        <button type="button" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 hover:bg-white/5">
          <GearIcon className="h-5 w-5" /> Settings
        </button>
        <button type="button" onClick={onSignOut} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-400 hover:bg-white/5">
          <LogoutIcon className="h-5 w-5" /> Sign out
        </button>
      </div>
    </div>
  );
}

export function AppShell({ title, subtitle, role, online, refreshing, onRefresh, actions, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="dark flex min-h-full w-full bg-[#060918] text-white">
      <aside className="hidden w-56 shrink-0 border-r border-white/10 lg:block">
        <div className="fixed h-full w-56"><Nav pathname={pathname} role={role} onSignOut={() => void signOut()} /></div>
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64"><Nav pathname={pathname} role={role} onSignOut={() => void signOut()} /></div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-white/10 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button type="button" aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-lg p-2 text-zinc-300 hover:bg-white/5">
              <MenuIcon className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold">BroilerSync</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {actions ? <div className="mr-1">{actions}</div> : null}
            {online !== undefined ? (
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${online ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-red-400"}`} />
                {online ? "Online" : "Offline"}
              </span>
            ) : null}
            {onRefresh ? (
              <button type="button" onClick={onRefresh} disabled={refreshing} aria-label="Refresh" className="rounded-full border border-white/10 p-2 text-zinc-300 hover:bg-white/5 disabled:opacity-50">
                <RefreshIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            ) : null}
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-xs font-semibold">
                {(role ?? "O").slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-sm font-medium sm:inline">{role ? role[0].toUpperCase() + role.slice(1) : "Owner"}</span>
              <ChevronDownIcon className="hidden h-4 w-4 text-zinc-400 sm:block" />
            </div>
          </div>
        </header>
        <main className="flex w-full flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#151a4a]">
            <Banner className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c1030]/95 via-[#11163d]/75 to-transparent" />
            <div className="relative px-5 py-8 sm:px-8 sm:py-10">
              <div className="border-l-4 border-violet-500 pl-4">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
                {subtitle ? <p className="mt-2 text-sm text-zinc-300 sm:text-base">{subtitle}</p> : null}
              </div>
            </div>
          </section>
          {children}
        </main>
      </div>
    </div>
  );
}
