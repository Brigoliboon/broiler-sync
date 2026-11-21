import { requireAdmin } from "@/lib/admin-auth";
import {
  AdminValidationError,
  validateDisabledInput,
} from "@/lib/admin-validation";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  role: string;
};

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/owners/[id]">,
) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const { id } = await context.params;
  if (id === admin.adminId) {
    return Response.json(
      { error: "admin cannot disable itself" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  let disabled: boolean;
  try {
    disabled = validateDisabledInput(body);
  } catch (error) {
    if (error instanceof AdminValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const db = supabaseAdmin();
  const { data: profile, error: lookupError } = await db
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    console.error("owner lookup failed", lookupError.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  const row = profile as ProfileRow | null;
  if (!row || row.role !== "owner") {
    return Response.json({ error: "owner not found" }, { status: 404 });
  }

  const disabledAt = disabled ? new Date().toISOString() : null;
  const { error: updateError } = await db
    .from("profiles")
    .update({ disabled_at: disabledAt })
    .eq("id", id);

  if (updateError) {
    console.error("owner update failed", updateError.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  const { error: authError } = await db.auth.admin.updateUserById(id, {
    ban_duration: disabled ? "876000h" : "none",
  });

  if (authError) {
    console.error("auth ban failed", authError.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  return Response.json({ id, disabled });
}
