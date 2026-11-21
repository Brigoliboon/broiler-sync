import { supabaseAdmin } from "./supabase-admin";

type ProfileRow = {
  id: string;
  role: string;
  disabled_at: string | null;
};

export type AdminAuth = {
  adminId: string;
};

function forbidden(): Response {
  return Response.json({ error: "forbidden" }, { status: 403 });
}

function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export async function requireAdmin(
  request: Request,
): Promise<AdminAuth | Response> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(authorization);
  if (!match) return unauthorized();

  const { data: userData, error: userError } = await supabaseAdmin()
    .auth.getUser(match[1]);

  if (userError || !userData.user) return unauthorized();

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, role, disabled_at")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) {
    console.error("admin auth lookup failed", error.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  const profile = data as ProfileRow | null;
  if (!profile || profile.role !== "admin" || profile.disabled_at !== null) {
    return forbidden();
  }

  return { adminId: profile.id };
}
