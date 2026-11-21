"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState<ReturnType<typeof supabaseBrowser> | null>(() => {
    try {
      return supabaseBrowser();
    } catch {
      return null;
    }
  });
  const [configError] = useState<string | null>(() => {
    try {
      supabaseBrowser();
      return null;
    } catch (caught) {
      return caught instanceof Error
        ? caught.message
        : "Browser Supabase configuration is missing";
    }
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) router.replace("/dashboard");
      })
      .catch(() => setError("Could not check sign-in session"));
  }, [router, supabase]);

  const shownError = error ?? configError;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!supabase) throw new Error(configError ?? "Supabase is not configured");
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

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
        <form
          onSubmit={onSubmit}
          className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8"
        >
          <p className="text-lg font-semibold tracking-tight lg:hidden">
            BroilerSync
          </p>
          <h2 className="mb-6 mt-4 text-2xl font-semibold tracking-tight lg:mt-0">
            Sign in
          </h2>
          <label className="mb-4 block text-sm font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="mb-4 block text-sm font-medium">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          {shownError ? (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">
              {shownError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
