"use server";

import { revalidatePath } from "next/cache";
import { AdminAuthError, requireAdminSession } from "@/lib/admin-auth";
import {
  AdminValidationError,
  validateFarmInput,
  validateOwnerInput,
} from "@/lib/admin-validation";
import {
  AdminActionError,
  createFarmWithDevice,
  createOwner,
  rotateDeviceKey,
  setOwnerDisabled,
} from "@/lib/db/admin";

export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function fail(error: unknown): { ok: false; error: string } {
  if (
    error instanceof AdminActionError ||
    error instanceof AdminValidationError ||
    error instanceof AdminAuthError
  ) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Something went wrong" };
}

export async function createOwnerAction(input: {
  email: string;
  full_name: string;
  password: string;
}): Promise<ActionResult> {
  try {
    await requireAdminSession();
    await createOwner(validateOwnerInput(input));
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setOwnerDisabledAction(input: {
  id: string;
  disabled: boolean;
}): Promise<ActionResult> {
  try {
    const admin = await requireAdminSession();
    if (typeof input.disabled !== "boolean" || !input.id) {
      return { ok: false, error: "disabled must be a boolean" };
    }
    await setOwnerDisabled(input.id, input.disabled, admin.adminId);
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function createFarmAction(input: {
  owner_id: string;
  farm_name: string;
  device_id: string;
}): Promise<ActionResult<{ device_id: string; device_key: string; farm_name: string }>> {
  try {
    await requireAdminSession();
    const result = await createFarmWithDevice(validateFarmInput(input));
    revalidatePath("/admin");
    return {
      ok: true,
      device_id: result.device_id,
      device_key: result.device_key,
      farm_name: result.farm.name,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function rotateDeviceKeyAction(input: {
  device_id: string;
  farm_name: string;
}): Promise<ActionResult<{ device_id: string; device_key: string; farm_name: string }>> {
  try {
    await requireAdminSession();
    if (!input.device_id) return { ok: false, error: "device not found" };
    const result = await rotateDeviceKey(input.device_id);
    revalidatePath("/admin");
    return {
      ok: true,
      device_id: result.device_id,
      device_key: result.device_key,
      farm_name: input.farm_name,
    };
  } catch (error) {
    return fail(error);
  }
}
