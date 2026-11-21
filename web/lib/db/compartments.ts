import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { userDb } from "./client";
import { throwIfError } from "./errors";

export const COMPARTMENT_COLUMNS = ["id", "farm_id", "slug", "name"] as const;

export type Compartment = {
  id: string;
  farm_id: string;
  slug: string;
  name: string | null;
};

const SELECT = COMPARTMENT_COLUMNS.join(", ");

export async function listCompartments(
  farmId?: string,
  client?: SupabaseClient,
): Promise<Compartment[]> {
  const db = await userDb(client);
  let query = db.from("compartments").select(SELECT).order("slug");
  if (farmId) query = query.eq("farm_id", farmId);
  const result = await query;
  return (throwIfError(result, "could not list compartments") ??
    []) as Compartment[];
}
