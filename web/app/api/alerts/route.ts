import { after } from "next/server";
import { authenticateDevice, touchDevice } from "@/lib/device-auth";
import {
  BatchValidationError,
  validateAlertBatch,
} from "@/lib/device-validation";
import { notifyAlertStarts } from "@/lib/push/notify";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await authenticateDevice(request);
  if (auth instanceof Response) return auth;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  let batch;
  try {
    batch = validateAlertBatch(payload, auth.deviceId);
  } catch (error) {
    if (error instanceof BatchValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  try {
    if (batch.valid.length > 0) {
      const { error } = await supabaseAdmin().rpc("ingest_alerts", {
        p_device_id: auth.deviceId,
        p_items: batch.valid,
      });
      if (error) throw new Error(error.message);
    }

    await touchDevice(auth.deviceId);
  } catch (error) {
    console.error("alerts ingest failed", error);
    return Response.json({ error: "database error" }, { status: 500 });
  }

  // FR-23: web push for new `start` events, after the device gets its 200.
  const valid = batch.valid;
  after(() => notifyAlertStarts(auth.deviceId, valid));

  return Response.json({
    accepted: batch.valid.length,
    skipped: batch.skipped,
  });
}
