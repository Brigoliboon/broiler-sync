"use server";

import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null };

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  let supabase;
  try {
    supabase = await createUserClient();
  } catch {
    return { error: "Supabase is not configured" };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await createUserClient();
    await supabase.auth.signOut();
  } catch {
    // Still send the user to the login page if sign-out or config fails.
  }
  redirect("/login");
}
