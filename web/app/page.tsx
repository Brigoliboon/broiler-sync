import Link from "next/link";

export default function Home() {
  return (
    <main className="flex h-full min-h-dvh w-full flex-1 flex-col bg-[#060918] text-zinc-100">
      <header className="flex h-14 shrink-0 w-full items-center justify-between border-b border-white/10 px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold tracking-tight">BroilerSync</p>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="flex w-full flex-1 flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Broiler house climate control
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Monitor and control both compartments.
        </h1>
        <p className="mt-6 max-w-2xl text-base text-zinc-400 sm:text-lg">
          Live temperature, humidity and airflow, age-based fan and lamp control,
          alerts, history and export — from the ESP32 to the web.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900"
          >
            Open dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5"
          >
            Admin sign in
          </Link>
        </div>
      </section>

      <section className="grid w-full shrink-0 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-3">
        {[
          ["Live status", "Both compartments, relays, battery and online state."],
          ["Reliable logging", "SD buffer with cloud backfill through outages."],
          ["Local display", "1602 LCD shows readings and control status."],
        ].map(([title, description]) => (
          <div key={title} className="bg-[#060918] p-6 sm:p-8">
            <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
            <p className="mt-2 text-sm text-zinc-500">{description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
