import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, ChartLine, ChevronLeft, Download, LayoutDashboard, Settings, Users, type LucideIcon } from "lucide-react";
import { Card, Chip, cx } from "./ui";
import { PageBody } from "./app-frame";

/** Pulse placeholder. Honours prefers-reduced-motion via `motion-safe`. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block rounded-sm bg-border motion-safe:animate-pulse", className)} />;
}

function ScreenStatus({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" className="flex min-w-0 flex-1 flex-col">
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}

/** Phone farm bar chrome: settings stay, the name is a placeholder. */
export function PhoneBarSkeleton() {
  return (
    <header className="border-b border-border bg-surface p-4 lg:hidden">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Link
          href="/settings"
          aria-label="Farm settings"
          className="interactive flex size-11 items-center justify-center rounded-sm text-subtle hover:bg-[#F1F5F9] hover:text-text"
        >
          <Settings size={22} aria-hidden />
        </Link>
      </div>
    </header>
  );
}

/** Desktop toolbar chrome: the page icon stays, the title is a placeholder. */
export function DesktopTitleSkeleton({ icon: Icon, children }: { icon: LucideIcon; children?: ReactNode }) {
  return (
    <header className="hidden h-[72px] flex-none items-center justify-between border-b border-border bg-surface px-8 lg:flex">
      <div className="flex items-center gap-2">
        <Icon size={24} className="text-primary" aria-hidden />
        <Skeleton className="h-7 w-36" />
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}

function MetricTileSkeleton() {
  return (
    <div className="min-w-0 rounded-md border border-border p-3">
      <Skeleton className="size-8 rounded-sm" />
      <Skeleton className="mt-2 h-4 w-14" />
      <Skeleton className="mt-2 h-7 w-16" />
    </div>
  );
}

function StateRowSkeleton() {
  return (
    <div className="flex min-h-12 items-center justify-between border-b border-[#F1F5F9] last:border-b-0">
      <span className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-sm" />
        <Skeleton className="h-4 w-16" />
      </span>
      <Skeleton className="h-5 w-10 rounded-xs" />
    </div>
  );
}

function CompartmentCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16 rounded-xs" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MetricTileSkeleton />
        <MetricTileSkeleton />
        <MetricTileSkeleton />
      </div>
      <div className="mt-2">
        <StateRowSkeleton />
        <StateRowSkeleton />
        <StateRowSkeleton />
      </div>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <ScreenStatus>
      <PhoneBarSkeleton />
      <DesktopTitleSkeleton icon={LayoutDashboard}>
        <Skeleton className="h-7 w-20 rounded-sm" />
        <Skeleton className="h-7 w-16 rounded-sm" />
        <Skeleton className="h-7 w-16 rounded-sm" />
        <Skeleton className="h-4 w-24 self-center" />
      </DesktopTitleSkeleton>
      <PageBody>
        <div className="flex flex-col gap-3 lg:hidden">
          <div className="flex rounded-md bg-border p-1">
            <Skeleton className="h-11 flex-1" />
            <div className="w-1" />
            <Skeleton className="h-11 flex-1" />
          </div>
          <Card className="p-3">
            <div className="grid grid-cols-3 gap-2">
              <MetricTileSkeleton />
              <MetricTileSkeleton />
              <MetricTileSkeleton />
            </div>
            <div className="mt-1">
              <StateRowSkeleton />
              <StateRowSkeleton />
              <StateRowSkeleton />
            </div>
          </Card>
          <Card className="px-4 py-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="my-2 h-16 w-full rounded-sm" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        </div>
        <div className="hidden flex-col gap-4 lg:flex">
          <div className="grid grid-cols-2 gap-4">
            <CompartmentCardSkeleton />
            <CompartmentCardSkeleton />
          </div>
          <Card>
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="mt-2 h-32 w-full rounded-sm" />
            <div className="mt-2 flex justify-between">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
          </Card>
        </div>
      </PageBody>
    </ScreenStatus>
  );
}

export function HistorySkeleton() {
  return (
    <ScreenStatus>
      <PhoneBarSkeleton />
      <DesktopTitleSkeleton icon={ChartLine} />
      <PageBody>
        <div className="flex flex-col gap-3 lg:hidden">
          <div className="flex rounded-md bg-border p-1">
            <Skeleton className="h-11 flex-1" />
            <div className="w-1" />
            <Skeleton className="h-11 flex-1" />
            <div className="w-1" />
            <Skeleton className="h-11 flex-1" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-16 rounded-sm" />
            <Skeleton className="h-7 w-20 rounded-sm" />
            <Skeleton className="h-7 w-20 rounded-sm" />
          </div>
          <Card className="px-4 py-3">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="mt-2 h-[120px] w-full rounded-sm" />
            <div className="mt-2 flex justify-between">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
          </Card>
          <Card className="px-4 py-3">
            <Skeleton className="mb-3 h-4 w-48" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-[#F1F5F9] py-3 last:border-b-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </Card>
        </div>
        <div className="hidden flex-col gap-4 lg:flex">
          <div className="flex items-center gap-4">
            <div className="flex w-[360px] rounded-md bg-border p-1">
              <Skeleton className="h-11 flex-1" />
              <div className="w-1" />
              <Skeleton className="h-11 flex-1" />
              <div className="w-1" />
              <Skeleton className="h-11 flex-1" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-28 rounded-sm" />
              <Skeleton className="h-9 w-24 rounded-sm" />
              <Skeleton className="h-9 w-24 rounded-sm" />
            </div>
            <Skeleton className="ml-auto h-11 w-32 rounded-sm" />
          </div>
          <Card>
            <div className="flex justify-between gap-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="mt-2 h-[150px] w-full rounded-sm" />
            <div className="mt-2 flex justify-between">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
          </Card>
          <Card className="px-4 py-3">
            <Skeleton className="mb-3 h-5 w-32" />
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-[#F1F5F9] py-3 last:border-b-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="ml-auto h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </Card>
        </div>
      </PageBody>
    </ScreenStatus>
  );
}

function AlertCardSkeleton() {
  return (
    <Card className="flex items-start gap-3 p-3">
      <Skeleton className="size-8 rounded-sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16 rounded-xs" />
        </div>
        <Skeleton className="mt-2 h-4 w-full max-w-sm" />
        <Skeleton className="mt-2 h-3 w-32" />
      </div>
    </Card>
  );
}

export function AlertsSkeleton() {
  return (
    <ScreenStatus>
      <PhoneBarSkeleton />
      <DesktopTitleSkeleton icon={Bell} />
      <PageBody className="lg:items-center">
        <div className="flex w-full flex-col gap-3 lg:max-w-[720px]">
          <Card className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-2 h-4 w-52" />
            </div>
            <Skeleton className="h-7 w-12 rounded-full" />
          </Card>
          <div className="flex rounded-md bg-border p-1">
            <Skeleton className="h-11 flex-1" />
            <div className="w-1" />
            <Skeleton className="h-11 flex-1" />
          </div>
          <AlertCardSkeleton />
          <AlertCardSkeleton />
          <AlertCardSkeleton />
        </div>
      </PageBody>
    </ScreenStatus>
  );
}

export function ExportSkeleton() {
  return (
    <ScreenStatus>
      <PhoneBarSkeleton />
      <DesktopTitleSkeleton icon={Download} />
      <PageBody className="lg:items-center">
        <div className="flex w-full flex-col gap-3 lg:max-w-[720px]">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-sm" />
            <div>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-48" />
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
            <div>
              <Skeleton className="mb-1 h-4 w-12" />
              <Skeleton className="h-12 w-full rounded-sm" />
            </div>
            <div>
              <Skeleton className="mb-1 h-4 w-8" />
              <Skeleton className="h-12 w-full rounded-sm" />
            </div>
            <div>
              <Skeleton className="mb-1 h-4 w-24" />
              <div className="flex rounded-md bg-border p-1">
                <Skeleton className="h-11 flex-1" />
                <div className="w-1" />
                <Skeleton className="h-11 flex-1" />
                <div className="w-1" />
                <Skeleton className="h-11 flex-1" />
              </div>
            </div>
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-12 w-full rounded-sm" />
          <Skeleton className="h-3 w-72" />
        </div>
      </PageBody>
    </ScreenStatus>
  );
}

export function SettingsSkeleton() {
  return (
    <ScreenStatus>
      <header className="flex items-center gap-2 border-b border-border bg-surface p-4 lg:hidden">
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="interactive -ml-3 flex size-11 items-center justify-center rounded-sm hover:bg-[#F1F5F9]"
        >
          <ChevronLeft size={24} aria-hidden />
        </Link>
        <Skeleton className="h-6 w-36" />
      </header>
      <DesktopTitleSkeleton icon={Settings} />
      <PageBody className="lg:items-center">
        <div className="flex w-full flex-col gap-3 lg:max-w-[720px]">
          <Card>
            <Skeleton className="mb-2 h-4 w-32" />
            <Skeleton className="h-12 w-full rounded-sm" />
          </Card>
          <Card>
            <Skeleton className="mb-2 h-4 w-16" />
            <div className="flex rounded-md bg-border p-1">
              <Skeleton className="h-11 flex-1" />
              <div className="w-1" />
              <Skeleton className="h-11 flex-1" />
            </div>
            <Skeleton className="mt-2 h-3 w-64" />
          </Card>
          <Card className="flex flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <div>
              <Skeleton className="mb-1 h-4 w-36" />
              <Skeleton className="h-12 w-full rounded-sm" />
            </div>
            <div>
              <Skeleton className="mb-1 h-4 w-28" />
              <Skeleton className="h-12 w-full rounded-sm" />
            </div>
            <div>
              <Skeleton className="mb-1 h-4 w-28" />
              <Skeleton className="h-12 w-full rounded-sm" />
            </div>
          </Card>
          <Skeleton className="h-12 w-full rounded-sm" />
        </div>
      </PageBody>
    </ScreenStatus>
  );
}

function OwnerCardSkeleton() {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-3 w-44" />
        </div>
        <Skeleton className="h-5 w-14 rounded-xs" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="ml-auto h-3 w-14" />
      </div>
    </Card>
  );
}

export function AdminSkeleton() {
  return (
    <ScreenStatus>
      <header className="border-b border-border bg-surface p-4 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={22} className="text-primary" aria-hidden />
            <Skeleton className="h-6 w-24" />
          </div>
          <Chip tone="neutral">Admin</Chip>
        </div>
        <Skeleton className="mt-2 h-4 w-56" />
      </header>
      <DesktopTitleSkeleton icon={Users}>
        <Chip tone="neutral">Admin</Chip>
      </DesktopTitleSkeleton>
      <PageBody className="lg:items-center">
        <div className="flex w-full flex-col gap-3 lg:max-w-[960px] lg:gap-4">
          <Skeleton className="hidden h-4 w-64 lg:block" />
          <Skeleton className="h-12 w-full rounded-sm lg:w-40" />
          <div className="flex flex-col gap-3 lg:hidden">
            <OwnerCardSkeleton />
            <OwnerCardSkeleton />
            <OwnerCardSkeleton />
          </div>
          <Card className="hidden lg:block">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-[#F1F5F9] px-1 py-3 last:border-b-0">
                <Skeleton className="size-10 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="mt-1 h-3 w-44" />
                </div>
                <Skeleton className="h-5 w-14 rounded-xs" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </Card>
          <Skeleton className="h-3 w-64" />
          <div className="mt-3 flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-11 w-28 rounded-sm" />
          </div>
          <OwnerCardSkeleton />
          <OwnerCardSkeleton />
        </div>
      </PageBody>
    </ScreenStatus>
  );
}

/** First-load placeholder for the shared app shell (sidebar + bottom nav). */
export function ShellSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full flex-1 bg-bg text-text">
      <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col gap-4 border-r border-border bg-surface px-4 py-5 lg:flex">
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-sm" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
          <Skeleton className="size-8 rounded-sm" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        </div>
        <nav aria-hidden className="flex flex-col gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex h-11 items-center gap-3 rounded-sm px-3">
              <Skeleton className="size-5 rounded-sm" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
          <Skeleton className="size-9 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1 h-3 w-14" />
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
      <nav
        aria-hidden
        className="fixed inset-x-0 bottom-0 z-20 flex h-[calc(72px+env(safe-area-inset-bottom))] items-start justify-around border-t border-border bg-surface pt-3 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex min-h-12 min-w-16 flex-col items-center justify-center gap-1">
            <Skeleton className="size-6 rounded-sm" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </nav>
    </div>
  );
}

export function FarmsListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3 p-4">
      <span className="sr-only">Loading farms</span>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex w-full items-center gap-3 rounded-md border border-border bg-surface p-4">
          <Skeleton className="size-11 rounded-sm" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-1 h-3 w-28" />
          </div>
          <Skeleton className="h-7 w-20 rounded-sm" />
        </div>
      ))}
    </div>
  );
}
