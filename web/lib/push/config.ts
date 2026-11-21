import "server-only";

/** VAPID public key for the browser, or null when push isn't configured. */
export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}
