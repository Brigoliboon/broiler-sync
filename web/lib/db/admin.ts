import "server-only";

import { generateDeviceKey } from "@/lib/admin-key";
import type { FarmInput, OwnerInput } from "@/lib/admin-validation";
import { hashDeviceKey } from "@/lib/device-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

export class AdminActionError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminActionError";
    this.status = status;
  }
}

export type AdminOwner = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  disabled_at: string | null;
  created_at: string;
  farm_count: number;
};

export type AdminFarm = {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string | null;
  created_at: string;
  device: {
    device_id: string;
    disabled_at: string | null;
    last_seen_at: string | null;
  } | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  role: string;
  disabled_at: string | null;
  created_at?: string;
};

type FarmRow = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
};

type DeviceRow = {
  device_id: string;
  farm_id: string;
  disabled_at: string | null;
  last_seen_at: string | null;
};

function dbFailed(context: string, message: string): never {
  console.error(context, message);
  throw new AdminActionError("database error", 500);
}

export async function listAdminOwners(): Promise<AdminOwner[]> {
  const db = supabaseAdmin();
  const [profilesRes, usersRes, farmsRes] = await Promise.all([
    db.from("profiles").select("id, full_name, role, disabled_at, created_at"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from("farms").select("id, owner_id, name"),
  ]);

  if (profilesRes.error) dbFailed("admin profiles failed", profilesRes.error.message);
  if (usersRes.error) dbFailed("admin users failed", usersRes.error.message);
  if (farmsRes.error) dbFailed("admin farms failed", farmsRes.error.message);

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const users = (usersRes.data?.users ?? []) as { id: string; email?: string | null }[];
  const farms = (farmsRes.data ?? []) as FarmRow[];
  const emailById = new Map(users.map((user) => [user.id, user.email ?? ""]));
  const farmCountByOwner = new Map<string, number>();
  for (const farm of farms) {
    farmCountByOwner.set(farm.owner_id, (farmCountByOwner.get(farm.owner_id) ?? 0) + 1);
  }

  return profiles.map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    email: emailById.get(profile.id) ?? null,
    role: profile.role,
    disabled_at: profile.disabled_at,
    created_at: profile.created_at ?? "",
    farm_count: farmCountByOwner.get(profile.id) ?? 0,
  }));
}

export async function listAdminFarms(): Promise<{
  owners: AdminOwner[];
  farms: AdminFarm[];
}> {
  const db = supabaseAdmin();
  const [ownersRes, farmsRes, devicesRes] = await Promise.all([
    db.from("profiles").select("id, full_name, role, disabled_at"),
    db.from("farms").select("id, owner_id, name, created_at"),
    db.from("devices").select("device_id, farm_id, disabled_at, last_seen_at"),
  ]);

  if (ownersRes.error) dbFailed("admin owners failed", ownersRes.error.message);
  if (farmsRes.error) dbFailed("admin farms failed", farmsRes.error.message);
  if (devicesRes.error) dbFailed("admin devices failed", devicesRes.error.message);

  const owners = (ownersRes.data ?? []) as ProfileRow[];
  const farms = (farmsRes.data ?? []) as FarmRow[];
  const devices = (devicesRes.data ?? []) as DeviceRow[];
  const ownerName = new Map(owners.map((owner) => [owner.id, owner.full_name]));
  const deviceByFarm = new Map<string, DeviceRow>();
  for (const device of devices) deviceByFarm.set(device.farm_id, device);

  return {
    owners: owners.map((owner) => ({
      id: owner.id,
      full_name: owner.full_name,
      email: null,
      role: owner.role,
      disabled_at: owner.disabled_at,
      created_at: "",
      farm_count: 0,
    })),
    farms: farms.map((farm) => ({
      id: farm.id,
      name: farm.name,
      owner_id: farm.owner_id,
      owner_name: ownerName.get(farm.owner_id) ?? null,
      created_at: farm.created_at,
      device: deviceByFarm.get(farm.id) ?? null,
    })),
  };
}

export async function createOwner(input: OwnerInput): Promise<{
  id: string;
  email: string;
  full_name: string;
  role: "owner";
}> {
  const db = supabaseAdmin();
  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (error) {
    throw new AdminActionError(error.message ?? "could not create owner", 400);
  }

  const { error: profileError } = await db.from("profiles").upsert({
    id: data.user.id,
    full_name: input.fullName,
    role: "owner",
  });

  if (profileError) dbFailed("owner profile upsert failed", profileError.message);

  return {
    id: data.user.id,
    email: input.email,
    full_name: input.fullName,
    role: "owner",
  };
}

export async function setOwnerDisabled(
  id: string,
  disabled: boolean,
  adminId: string,
): Promise<{ id: string; disabled: boolean }> {
  if (id === adminId) {
    throw new AdminActionError("admin cannot disable itself", 400);
  }

  const db = supabaseAdmin();
  const { data: profile, error: lookupError } = await db
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) dbFailed("owner lookup failed", lookupError.message);

  const row = profile as { id: string; role: string } | null;
  if (!row || row.role !== "owner") {
    throw new AdminActionError("owner not found", 404);
  }

  const disabledAt = disabled ? new Date().toISOString() : null;
  const { error: updateError } = await db
    .from("profiles")
    .update({ disabled_at: disabledAt })
    .eq("id", id);

  if (updateError) dbFailed("owner update failed", updateError.message);

  const { error: authError } = await db.auth.admin.updateUserById(id, {
    ban_duration: disabled ? "876000h" : "none",
  });

  if (authError) dbFailed("auth ban failed", authError.message);

  return { id, disabled };
}

export async function createFarmWithDevice(input: FarmInput): Promise<{
  farm: { id: string; name: string };
  device_id: string;
  device_key: string;
}> {
  const db = supabaseAdmin();
  const { data: owner, error: ownerError } = await db
    .from("profiles")
    .select("id, role, disabled_at")
    .eq("id", input.ownerId)
    .maybeSingle();

  if (ownerError) dbFailed("farm owner lookup failed", ownerError.message);

  const ownerRow = owner as ProfileRow | null;
  if (
    !ownerRow ||
    ownerRow.disabled_at !== null ||
    !["owner", "admin"].includes(ownerRow.role)
  ) {
    throw new AdminActionError("owner is not valid", 400);
  }

  const { data: existing, error: existingError } = await db
    .from("devices")
    .select("device_id")
    .eq("device_id", input.deviceId)
    .maybeSingle();

  if (existingError) dbFailed("device lookup failed", existingError.message);
  if (existing) throw new AdminActionError("device_id already exists", 409);

  const { data: farm, error: farmError } = await db
    .from("farms")
    .insert({ owner_id: input.ownerId, name: input.farmName })
    .select("id, name")
    .single();

  if (farmError) dbFailed("farm create failed", farmError.message);

  const deviceKey = generateDeviceKey();
  const { error: deviceError } = await db.from("devices").insert({
    farm_id: farm.id,
    device_id: input.deviceId,
    key_hash: hashDeviceKey(deviceKey),
  });

  if (deviceError) {
    await db.from("farms").delete().eq("id", farm.id);
    dbFailed("device create failed", deviceError.message);
  }

  return {
    farm: { id: farm.id, name: farm.name },
    device_id: input.deviceId,
    device_key: deviceKey,
  };
}

export async function rotateDeviceKey(
  deviceId: string,
): Promise<{ device_id: string; device_key: string }> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("devices")
    .select("device_id")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) dbFailed("rotate lookup failed", error.message);
  if (!data) throw new AdminActionError("device not found", 404);

  const deviceKey = generateDeviceKey();
  const { error: updateError } = await db
    .from("devices")
    .update({ key_hash: hashDeviceKey(deviceKey) })
    .eq("device_id", deviceId);

  if (updateError) dbFailed("rotate update failed", updateError.message);

  return { device_id: deviceId, device_key: deviceKey };
}
