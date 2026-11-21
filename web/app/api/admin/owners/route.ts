import { requireAdmin } from "@/lib/admin-auth";
import {
  AdminValidationError,
  validateOwnerInput,
} from "@/lib/admin-validation";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  full_name: string;
  role: string;
  disabled_at: string | null;
  created_at: string;
};

type UserRow = {
  id: string;
  email: string | null;
};

type FarmRow = {
  id: string;
  owner_id: string;
  name: string;
};

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const db = supabaseAdmin();
  const [profilesRes, usersRes, farmsRes] = await Promise.all([
    db.from("profiles").select("id, full_name, role, disabled_at, created_at"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from("farms").select("id, owner_id, name"),
  ]);

  if (profilesRes.error) {
    console.error("admin profiles failed", profilesRes.error.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }
  if (usersRes.error) {
    console.error("admin users failed", usersRes.error.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }
  if (farmsRes.error) {
    console.error("admin farms failed", farmsRes.error.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const users = (usersRes.data?.users ?? []) as UserRow[];
  const farms = (farmsRes.data ?? []) as FarmRow[];
  const emailById = new Map(users.map((user) => [user.id, user.email ?? ""]));
  const farmCountByOwner = new Map<string, number>();

  for (const farm of farms) {
    farmCountByOwner.set(
      farm.owner_id,
      (farmCountByOwner.get(farm.owner_id) ?? 0) + 1,
    );
  }

  return Response.json({
    owners: profiles.map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      email: emailById.get(profile.id) ?? null,
      role: profile.role,
      disabled_at: profile.disabled_at,
      created_at: profile.created_at,
      farm_count: farmCountByOwner.get(profile.id) ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  let input;
  try {
    input = validateOwnerInput(body);
  } catch (error) {
    if (error instanceof AdminValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const db = supabaseAdmin();
  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (error) {
    return Response.json(
      { error: error.message ?? "could not create owner" },
      { status: 400 },
    );
  }

  const { error: profileError } = await db.from("profiles").upsert({
    id: data.user.id,
    full_name: input.fullName,
    role: "owner",
  });

  if (profileError) {
    console.error("owner profile upsert failed", profileError.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  return Response.json(
    {
      id: data.user.id,
      email: input.email,
      full_name: input.fullName,
      role: "owner",
    },
    { status: 201 },
  );
}
