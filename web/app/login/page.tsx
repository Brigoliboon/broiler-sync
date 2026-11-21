import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid h-full min-h-dvh w-full flex-1 bg-[#060918] text-zinc-100 lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-white/10 px-10 py-10 lg:flex">
        <p className="text-sm font-semibold tracking-tight">BroilerSync</p>
        <div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Climate monitoring for both broiler compartments.
          </h1>
          <p className="mt-4 text-base text-zinc-400">
            Live readings, relay states, alerts and history in one place.
          </p>
        </div>
        <p className="text-xs text-zinc-500">ESP32 + Supabase + Next.js</p>
      </section>

      <section className="flex w-full items-center justify-center px-4 py-10 sm:px-8">
        {children}
      </section>
    </main>
  );
}

async function LoginBody() {
  const userId = await getAuthUserId();
  if (userId) redirect("/dashboard");
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <LoginLayout>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
        <LoginBody />
      </Suspense>
    </LoginLayout>
  );
}
