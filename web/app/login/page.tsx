import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Bird, Info } from "lucide-react";
import { getAuthUserId } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

async function LoginBody() {
  const userId = await getAuthUserId();
  if (userId) redirect("/dashboard");
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <main className="flex min-h-full w-full flex-1 justify-center bg-bg text-text">
      <div className="flex w-full max-w-[390px] flex-col gap-6 px-6 pt-[72px] pb-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-16 items-center justify-center rounded-lg bg-primary-soft">
            <Bird size={36} className="text-primary" aria-hidden />
          </span>
          <h1 className="text-3xl leading-[1.2] font-bold">BroilerSync</h1>
          <p className="text-sm text-muted">Monitor your broiler house from anywhere</p>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-muted">Loading…</p>}>
          <LoginBody />
        </Suspense>
        <div className="flex items-start gap-3 rounded-md border border-border bg-bg p-4">
          <Info size={20} className="flex-none text-primary" aria-hidden />
          <span className="text-sm text-muted">Accounts are created by your admin. Ask them if you can&apos;t sign in.</span>
        </div>
      </div>
    </main>
  );
}
