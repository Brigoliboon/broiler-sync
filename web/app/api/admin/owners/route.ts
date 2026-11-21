import { requireAdmin } from "@/lib/admin-auth";
import {
  AdminValidationError,
  validateOwnerInput,
} from "@/lib/admin-validation";
import {
  AdminActionError,
  createOwner,
  listAdminOwners,
} from "@/lib/db/admin";

function asResponse(error: unknown): Response {
  if (error instanceof AdminActionError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof AdminValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  throw error;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (admin instanceof Response) return admin;

  try {
    return Response.json({ owners: await listAdminOwners() });
  } catch (error) {
    return asResponse(error);
  }
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

  try {
    const created = await createOwner(validateOwnerInput(body));
    return Response.json(created, { status: 201 });
  } catch (error) {
    return asResponse(error);
  }
}
