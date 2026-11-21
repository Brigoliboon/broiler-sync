"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = { error: null };

const FIELD =
  "flex h-12 items-center gap-2 rounded-sm border border-border-strong bg-surface px-3 text-base text-text transition-shadow focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-primary";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initialState);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-6">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Email</span>
        <span className={FIELD}>
          <Mail size={20} className="flex-none text-muted" aria-hidden />
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
        </span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Password</span>
        <span className={FIELD}>
          <Lock size={20} className="flex-none text-muted" aria-hidden />
          <input
            type={show ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            required
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="interactive -mr-3 flex size-11 flex-none items-center justify-center rounded-sm text-muted hover:text-text"
          >
            {show ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
          </button>
        </span>
      </label>
      {state.error ? (
        <p role="alert" className="-mt-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="interactive flex h-12 items-center justify-center gap-2 rounded-sm bg-primary text-base font-semibold text-white hover:bg-primary-hover"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
