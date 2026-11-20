import { authenticateDevice, touchDevice } from "@/lib/device-auth";
import { deviceConfigFromRow } from "@/lib/device-config";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: Request,
  context: RouteContext<"/api/devices/[deviceId]/config">,
) {
  const { deviceId } = await context.params;
  const auth = await authenticateDevice(request, deviceId);
  if (auth instanceof Response) return auth;

  try {
    await touchDevice(auth.deviceId);

    const { data, error } = await supabaseAdmin()
      .from("device_settings")
      .select("*")
      .eq("device_id", auth.deviceId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return Response.json(deviceConfigFromRow(data));
  } catch (error) {
    console.error("device config failed", error);
    return Response.json({ error: "database error" }, { status: 500 });
  }
}
