import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthUserId } from "@/lib/supabase/server";
import { userDb } from "./client";
import { throwIfError } from "./errors";

export const PROFILE_COLUMNS = [
  "id",
  "full_name",
  "role",
  "disabled_at",
  "created_at",
] as const;

export type Profile = {
  id: string;
  full_name: string;
  role: string;
  disabled_at: string | null;
  created_at: string;
};

const SELECT = PROFILE_COLUMNS.join(", ");

export async function listProfiles(client?: SupabaseClient): Promise<Profile[]> {
  const db = await userDb(client);
  const result = await db.from("profiles").select(SELECT).order("full_name");
  return (throwIfError(result, "could not list profiles") ?? []) as Profile[];
}

export async function getProfile(
  id: string,
  client?: SupabaseClient,
): Promise<Profile | null> {
  const db = await userDb(client);
  const result = await db.from("profiles").select(SELECT).eq("id", id).maybeSingle();
  return throwIfError(result, "could not load profile") as Profile | null;
}

export async function getCurrentProfile(
  client?: SupabaseClient,
): Promise<Profile | null> {
  const id = await getAuthUserId();
  if (!id) return null;
  return getProfile(id, client);
}
