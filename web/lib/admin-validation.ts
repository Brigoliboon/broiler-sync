export class AdminValidationError extends Error {}

type JsonObject = Record<string, unknown>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEVICE_ID = /^[a-z0-9][a-z0-9-]{1,62}$/;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") throw new AdminValidationError(`${field} is required`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new AdminValidationError(`${field} must be ${min}-${max} characters`);
  }
  return trimmed;
}

function uuidField(value: unknown, field: string): string {
  const trimmed = stringField(value, field, 36, 36);
  if (!UUID.test(trimmed)) throw new AdminValidationError(`${field} must be a UUID`);
  return trimmed;
}

export type OwnerInput = {
  email: string;
  fullName: string;
  password: string;
};

export type FarmInput = {
  ownerId: string;
  farmName: string;
  deviceId: string;
};

export function validateOwnerInput(body: unknown): OwnerInput {
  if (!isObject(body)) throw new AdminValidationError("body must be an object");

  const email = stringField(body.email, "email", 5, 254).toLowerCase();
  if (!EMAIL.test(email)) throw new AdminValidationError("email is not valid");

  const fullName = stringField(body.full_name, "full_name", 1, 100);
  const password = stringField(body.password, "password", 8, 128);

  return { email, fullName, password };
}

export function validateFarmInput(body: unknown): FarmInput {
  if (!isObject(body)) throw new AdminValidationError("body must be an object");

  const ownerId = uuidField(body.owner_id, "owner_id");
  const farmName = stringField(body.farm_name, "farm_name", 1, 100);
  const deviceId = stringField(body.device_id, "device_id", 2, 63).toLowerCase();
  if (!DEVICE_ID.test(deviceId)) {
    throw new AdminValidationError(
      "device_id must be lowercase letters, digits or hyphens",
    );
  }

  return { ownerId, farmName, deviceId };
}

export function validateDisabledInput(body: unknown): boolean {
  if (!isObject(body) || typeof body.disabled !== "boolean") {
    throw new AdminValidationError("disabled must be a boolean");
  }
  return body.disabled;
}
