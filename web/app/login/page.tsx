import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-full w-full bg-zinc-50 dark:bg-zinc-950 lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-zinc-900 p-10 text-white dark:bg-black lg:flex">
        <div>
          <p className="text-xl font-semibold tracking-tight">BroilerSync</p>
          <h1 className="mt-24 text-4xl font-semibold leading-tight tracking-tight">
            Climate monitoring for both broiler compartments.
          </h1>
          <p className="mt-4 text-lg text-zinc-300">
            Live readings, relay states, alerts and history in one place.
          </p>
        </div>
        <p className="text-sm text-zinc-500">ESP32 + Supabase + Next.js</p>
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
