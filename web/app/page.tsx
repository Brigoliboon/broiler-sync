import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight">BroilerSync</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Live broiler-house climate monitoring, control, alerts and history.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Admin sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
