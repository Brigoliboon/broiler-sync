import { requireAdmin } from "@/lib/admin-auth";
import { AdminActionError, rotateDeviceKey } from "@/lib/db/admin";

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/devices/[deviceId]/rotate">,
) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const { deviceId } = await context.params;

  try {
    return Response.json(await rotateDeviceKey(deviceId));
  } catch (error) {
    if (error instanceof AdminActionError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
