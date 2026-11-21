import { requireAdmin } from "@/lib/admin-auth";
import {
  AdminValidationError,
  validateDisabledInput,
} from "@/lib/admin-validation";
import { AdminActionError, setOwnerDisabled } from "@/lib/db/admin";

function asResponse(error: unknown): Response {
  if (error instanceof AdminActionError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof AdminValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  throw error;
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/owners/[id]">,
) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  try {
    const disabled = validateDisabledInput(body);
    return Response.json(await setOwnerDisabled(id, disabled, admin.adminId));
  } catch (error) {
    return asResponse(error);
  }
}
