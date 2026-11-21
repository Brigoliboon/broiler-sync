import "server-only";

import { sendNotification } from "web-push";
import { describeAlert } from "@/lib/climate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildPayload, isGoneStatus, shouldPush, type PushableEvent } from "./payload";

type VapidConfig = { publicKey: string; privateKey: string; subject: string };

function vapidConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

/**
 * Sends a web push to the farm owner's subscriptions for each new `start`
 * event (FR-23). Runs after the device response; never throws.
 */
export async function notifyAlertStarts(deviceId: string, events: readonly PushableEvent[]): Promise<void> {
  try {
    const now = Date.now();
    const pushable = events.filter((event) => shouldPush(event, now));
    if (pushable.length === 0) return;

    const vapid = vapidConfig();
    if (!vapid) {
      console.warn("web push skipped: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY or VAPID_SUBJECT is not set");
      return;
    }

    const db = supabaseAdmin();
    const { data: device, error: deviceError } = await db
      .from("devices")
      .select("device_id, farms(name, owner_id)")
      .eq("device_id", deviceId)
      .maybeSingle();
    if (deviceError) throw new Error(deviceError.message);
    const farm = (Array.isArray(device?.farms) ? device?.farms[0] : device?.farms) as
      | { name: string; owner_id: string }
      | null
      | undefined;
    if (!farm) return;

    const { data: subscriptions, error: subError } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("owner_id", farm.owner_id);
    if (subError) throw new Error(subError.message);
    if (!subscriptions?.length) return;

    const { data: settings } = await db
      .from("device_settings")
      .select("hum_low, hum_high, hum_brood_low, hum_brood_days, wind_alert_ms, wind_alert_until_days, batt_warn_v, batt_crit_v")
      .eq("device_id", deviceId)
      .maybeSingle();

    const options = {
      vapidDetails: vapid,
      TTL: 60 * 60,
      urgency: "high" as const,
    };

    for (const event of pushable) {
      const text = describeAlert(event.code, {
        value: event.value ?? null,
        age: event.age ?? null,
        limits: settings
          ? {
              hum_low: Number(settings.hum_low),
              hum_high: Number(settings.hum_high),
              hum_brood_low: Number(settings.hum_brood_low),
              hum_brood_days: Number(settings.hum_brood_days),
              wind_alert_ms: (settings.wind_alert_ms as number[]).map(Number),
              wind_alert_until_days: (settings.wind_alert_until_days as number[]).map(Number),
            }
          : undefined,
        battWarnV: settings ? Number(settings.batt_warn_v) : undefined,
        battCritV: settings ? Number(settings.batt_crit_v) : undefined,
      });
      const payload = JSON.stringify(buildPayload(event, deviceId, farm.name, text));

      await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            await sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              options,
            );
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode;
            if (isGoneStatus(status)) {
              await db.from("push_subscriptions").delete().eq("id", sub.id);
            } else {
              console.error("web push failed", status ?? error);
            }
          }
        }),
      );
    }
  } catch (error) {
    console.error("web push notify failed", error);
  }
}
