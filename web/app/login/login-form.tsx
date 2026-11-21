"use client";

import { useActionState } from "react";
import { inputClass, primaryButtonClass } from "@/components/ui";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <form action={action} className="w-full max-w-sm">
      <p className="text-sm font-semibold tracking-tight lg:hidden">
        BroilerSync
      </p>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight lg:mt-0">
        Sign in
      </h2>
      <label className="mt-8 block text-sm font-medium text-zinc-300">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className={inputClass}
        />
      </label>
      <label className="mt-4 block text-sm font-medium text-zinc-300">
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      {state.error ? (
        <p className="mt-4 text-sm text-red-400">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} mt-6 w-full`}
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
