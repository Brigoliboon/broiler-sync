import { requireAdmin } from "@/lib/admin-auth";
import { generateDeviceKey } from "@/lib/admin-key";
import { hashDeviceKey } from "@/lib/device-key";
import { supabaseAdmin } from "@/lib/supabase/admin";

type DeviceRow = {
  device_id: string;
};

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/devices/[deviceId]/rotate">,
) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const { deviceId } = await context.params;
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("devices")
    .select("device_id")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    console.error("rotate lookup failed", error.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  const device = data as DeviceRow | null;
  if (!device) {
    return Response.json({ error: "device not found" }, { status: 404 });
  }

  const deviceKey = generateDeviceKey();
  const { error: updateError } = await db
    .from("devices")
    .update({ key_hash: hashDeviceKey(deviceKey) })
    .eq("device_id", deviceId);

  if (updateError) {
    console.error("rotate update failed", updateError.message);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  return Response.json({ device_id: deviceId, device_key: deviceKey });
}
