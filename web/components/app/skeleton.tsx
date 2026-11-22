import type { ReactNode } from "react";
import { Card, cx } from "./ui";
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
