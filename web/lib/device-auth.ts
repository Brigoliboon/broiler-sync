import { deviceKeyMatches } from "./device-key";
import { supabaseAdmin } from "./supabase/admin";

export type DeviceAuth = {
  deviceId: string;
};

function unauthorized(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

export async function authenticateDevice(
  request: Request,
  pathDeviceId?: string,
): Promise<DeviceAuth | Response> {
  const headerDeviceId = request.headers.get("x-device-id")?.trim();
  const deviceKey = request.headers.get("x-device-key");

  if (!headerDeviceId || !deviceKey) return unauthorized();
  if (pathDeviceId !== undefined && pathDeviceId !== headerDeviceId) {
    return unauthorized();
  }

  const { data, error } = await supabaseAdmin()
    .from("devices")
    .select("device_id, key_hash, disabled_at")
    .eq("device_id", headerDeviceId)
    .maybeSingle();

  if (error) {
    console.error("device auth lookup failed", error.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  if (
    !data ||
    data.disabled_at !== null ||
    !deviceKeyMatches(deviceKey, data.key_hash)
  ) {
    return unauthorized();
  }

  return { deviceId: data.device_id };
}

export async function touchDevice(deviceId: string): Promise<void> {
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const { error: touchError } = await db
    .from("devices")
    .update({ last_seen_at: now })
    .eq("device_id", deviceId);

  if (touchError) {
    throw new Error(`could not update last_seen_at: ${touchError.message}`);
  }

  const { data: latest, error: latestError } = await db
    .from("alerts")
    .select("event")
    .eq("device_id", deviceId)
    .eq("code", "DEVICE_OFFLINE")
    .order("ts", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new Error(`could not read offline alert: ${latestError.message}`);
  }

  if (latest?.event !== "start") return;

  const { error: clearError } = await db.from("alerts").insert({
    device_id: deviceId,
    ts: now,
    uptime_s: null,
    event: "clear",
    code: "DEVICE_OFFLINE",
    severity: "warning",
    message: "Device back online",
    value: null,
    age: null,
    source: "server",
  });

  if (clearError && clearError.code !== "23505") {
    throw new Error(`could not clear offline alert: ${clearError.message}`);
  }
}
