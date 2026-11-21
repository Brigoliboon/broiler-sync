import { getAuthUserId } from "./supabase/server";
import { supabaseAdmin } from "./supabase/admin";

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

async function userIdFromCookies(): Promise<string | null> {
  try {
    return await getAuthUserId();
  } catch {
    return null;
  }
}

async function userIdFromBearer(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(authorization);
  if (!match) return null;

  const { data: userData, error: userError } = await supabaseAdmin().auth.getUser(
    match[1],
  );
  if (userError || !userData.user) return null;
  return userData.user.id;
}

export async function requireAdmin(
  request: Request,
): Promise<AdminAuth | Response> {
  const userId = (await userIdFromCookies()) ?? (await userIdFromBearer(request));
  if (!userId) return unauthorized();

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, role, disabled_at")
    .eq("id", userId)
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


export class AdminAuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

/** Cookie-session admin check for Server Actions. */
export async function requireAdminSession(): Promise<AdminAuth> {
  const userId = await userIdFromCookies();
  if (!userId) throw new AdminAuthError("unauthorized", 401);

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, role, disabled_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("admin auth lookup failed", error.message);
    throw new AdminAuthError("database error", 500);
  }

  const profile = data as ProfileRow | null;
  if (!profile || profile.role !== "admin" || profile.disabled_at !== null) {
    throw new AdminAuthError("forbidden", 403);
  }

  return { adminId: profile.id };
}
