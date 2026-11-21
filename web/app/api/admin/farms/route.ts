import { requireAdmin } from "@/lib/admin-auth";
import { generateDeviceKey } from "@/lib/admin-key";
import {
  AdminValidationError,
  validateFarmInput,
} from "@/lib/admin-validation";
import { hashDeviceKey } from "@/lib/device-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  full_name: string;
  role: string;
  disabled_at: string | null;
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

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const db = supabaseAdmin();
  const [ownersRes, farmsRes, devicesRes] = await Promise.all([
    db.from("profiles").select("id, full_name, role, disabled_at"),
    db.from("farms").select("id, owner_id, name, created_at"),
    db.from("devices").select("device_id, farm_id, disabled_at, last_seen_at"),
  ]);

  if (ownersRes.error) {
    console.error("admin owners failed", ownersRes.error.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }
  if (farmsRes.error) {
    console.error("admin farms failed", farmsRes.error.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }
  if (devicesRes.error) {
    console.error("admin devices failed", devicesRes.error.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  const owners = (ownersRes.data ?? []) as ProfileRow[];
  const farms = (farmsRes.data ?? []) as FarmRow[];
  const devices = (devicesRes.data ?? []) as DeviceRow[];
  const ownerName = new Map(owners.map((owner) => [owner.id, owner.full_name]));
  const deviceByFarm = new Map<string, DeviceRow>();

  for (const device of devices) {
    deviceByFarm.set(device.farm_id, device);
  }

  return Response.json({
    owners,
    farms: farms.map((farm) => ({
      id: farm.id,
      name: farm.name,
      owner_id: farm.owner_id,
      owner_name: ownerName.get(farm.owner_id) ?? null,
      created_at: farm.created_at,
      device: deviceByFarm.get(farm.id) ?? null,
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
    input = validateFarmInput(body);
  } catch (error) {
    if (error instanceof AdminValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const db = supabaseAdmin();
  const { data: owner, error: ownerError } = await db
    .from("profiles")
    .select("id, role, disabled_at")
    .eq("id", input.ownerId)
    .maybeSingle();

  if (ownerError) {
    console.error("farm owner lookup failed", ownerError.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  const ownerRow = owner as ProfileRow | null;
  if (
    !ownerRow ||
    ownerRow.disabled_at !== null ||
    !["owner", "admin"].includes(ownerRow.role)
  ) {
    return Response.json({ error: "owner is not valid" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await db
    .from("devices")
    .select("device_id")
    .eq("device_id", input.deviceId)
    .maybeSingle();

  if (existingError) {
    console.error("device lookup failed", existingError.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }
  if (existing) {
    return Response.json({ error: "device_id already exists" }, { status: 409 });
  }

  const { data: farm, error: farmError } = await db
    .from("farms")
    .insert({ owner_id: input.ownerId, name: input.farmName })
    .select("id, name")
    .single();

  if (farmError) {
    console.error("farm create failed", farmError.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  const deviceKey = generateDeviceKey();
  const { error: deviceError } = await db.from("devices").insert({
    farm_id: farm.id,
    device_id: input.deviceId,
    key_hash: hashDeviceKey(deviceKey),
  });

  if (deviceError) {
    await db.from("farms").delete().eq("id", farm.id);
    console.error("device create failed", deviceError.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  return Response.json(
    {
      farm: { id: farm.id, name: farm.name },
      device_id: input.deviceId,
      device_key: deviceKey,
    },
    { status: 201 },
  );
}
