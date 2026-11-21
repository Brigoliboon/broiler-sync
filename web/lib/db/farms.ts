import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { userDb } from "./client";
import { throwIfError } from "./errors";

export const FARM_COLUMNS = ["id", "owner_id", "name", "created_at"] as const;

export type Farm = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
};

const SELECT = FARM_COLUMNS.join(", ");

export async function listFarms(client?: SupabaseClient): Promise<Farm[]> {
  const db = await userDb(client);
  const result = await db.from("farms").select(SELECT).order("name");
  return (throwIfError(result, "could not list farms") ?? []) as Farm[];
}

export async function getFarm(
  id: string,
  client?: SupabaseClient,
): Promise<Farm | null> {
  const db = await userDb(client);
  const result = await db.from("farms").select(SELECT).eq("id", id).maybeSingle();
  return throwIfError(result, "could not load farm") as Farm | null;
}
