"use client";

import { useEffect, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

type Props = {
  role: string;
  online: boolean;
  children: ReactNode;
};

export function DashboardShell({ role, online, children }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Live status for both compartments"
      role={role}
      online={online}
      refreshing={pending}
      onRefresh={refresh}
    >
      {children}
    </AppShell>
  );
}
