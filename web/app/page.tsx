import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-full w-full flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex w-full items-center justify-between border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6 lg:px-8">
        <p className="text-lg font-semibold tracking-tight">BroilerSync</p>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="flex w-full flex-1 flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Broiler house climate control
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Monitor and control both compartments.
        </h1>
        <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
          Live temperature, humidity and airflow, age-based fan and lamp control,
          alerts, history and export — from the ESP32 to the web.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Open dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium dark:border-zinc-700"
          >
            Admin sign in
          </Link>
        </div>
      </section>

      <section className="grid w-full gap-px border-t border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-3">
        {[
          ["Live status", "Both compartments, relays, battery and online state."],
          ["Reliable logging", "SD buffer with cloud backfill through outages."],
          ["Local display", "1602 LCD shows readings and control status."],
        ].map(([title, description]) => (
          <div
            key={title}
            className="bg-white p-6 dark:bg-zinc-950 sm:p-8"
          >
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
