"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing } from "lucide-react";
import { subscribePush, unsubscribePush } from "./actions";

type Status = "checking" | "unsupported" | "unconfigured" | "denied" | "off" | "on";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function supported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

const TEXT: Record<Status, { title: string; body: string }> = {
  checking: { title: "Push alerts", body: "Checking this browser…" },
  unsupported: { title: "Push alerts aren't available here", body: "On iPhone, add BroilerSync to the Home Screen first" },
  unconfigured: { title: "Push alerts aren't set up yet", body: "Ask your admin to finish the push setup" },
  denied: { title: "Notifications are blocked", body: "Allow notifications for this site in the browser settings" },
  off: { title: "Push alerts are off", body: "Turn on to get alerts even when the site is closed" },
  on: { title: "Push alerts are on", body: "This phone gets alerts even when the site is closed" },
};

/** Push opt-in card from frame 05: soft blue card with a switch. */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check(): Promise<Status> {
      if (!publicKey) return "unconfigured";
      if (!supported()) return "unsupported";
      if (Notification.permission === "denied") return "denied";
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      return sub ? "on" : "off";
    }
    check()
      .catch(() => "unsupported" as const)
      .then((next) => {
        if (!cancelled) setStatus(next);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function toggle() {
    if (!publicKey || busy) return;
    setBusy(true);
    setError(null);
    try {
      const reg = await registration();
      if (status === "on") {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await unsubscribePush(sub.endpoint);
          await sub.unsubscribe();
        }
        setStatus("off");
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
        const json = sub.toJSON();
        const result = await subscribePush({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          userAgent: navigator.userAgent,
        });
        if (!result.ok) {
          await sub.unsubscribe();
          setError(result.error ?? "Couldn't turn on alerts");
          setStatus("off");
          return;
        }
        setStatus("on");
      }
    } catch {
      setError("Couldn't change push alerts in this browser");
    } finally {
      setBusy(false);
    }
  }

  const on = status === "on";
  const canToggle = status === "on" || status === "off";
  const text = TEXT[status];
  const Icon = on || status === "off" || status === "checking" ? BellRing : BellOff;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-[#BFDBFE] bg-primary-soft p-3">
      <div className="flex items-center gap-3">
        <Icon size={22} className="flex-none text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <b id="push-title" className="block text-sm">
            {text.title}
          </b>
          <span className="block text-xs text-muted">{text.body}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="push-title"
          disabled={!canToggle || busy}
          onClick={toggle}
          className="interactive flex h-11 w-14 flex-none items-center justify-center rounded-full"
        >
          <span className={"relative h-6 w-11 rounded-full transition-colors " + (on ? "bg-primary" : "bg-[#94A3B8]")}>
            <span
              className={
                "absolute top-0.5 size-5 rounded-full bg-white transition-[left] duration-150 " + (on ? "left-[22px]" : "left-0.5")
              }
            />
          </span>
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
