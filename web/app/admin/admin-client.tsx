"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  EmptyState,
  Notice,
  Section,
  StatusPill,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { formatTime } from "@/lib/dashboard-utils";
import {
  createFarmAction,
  createOwnerAction,
  rotateDeviceKeyAction,
  setOwnerDisabledAction,
} from "./actions";
import type { AdminFarm, AdminOwner } from "@/lib/db/admin";

type Owner = AdminOwner;
type Farm = AdminFarm;

export function AdminClient({
  owners,
  farms,
}: {
  owners: AdminOwner[];
  farms: AdminFarm[];
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [deviceKeyOwner, setDeviceKeyOwner] = useState<string | null>(null);

  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  const [farmOwnerId, setFarmOwnerId] = useState(
    () => owners.find((owner) => owner.role === "owner")?.id ?? "",
  );
  const [farmName, setFarmName] = useState("");
  const [deviceId, setDeviceId] = useState("");

  async function createOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await createOwnerAction({
        email: ownerEmail,
        full_name: ownerFullName,
        password: ownerPassword,
      });
      if (!result.ok) throw new Error(result.error);
      setOwnerEmail("");
      setOwnerFullName("");
      setOwnerPassword("");
      setNotice("Owner created");
      startRefresh(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create owner");
    } finally {
      setBusy(false);
    }
  }

  async function setOwnerDisabled(owner: Owner, disabled: boolean) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await setOwnerDisabledAction({ id: owner.id, disabled });
      if (!result.ok) throw new Error(result.error);
      setNotice(disabled ? "Owner disabled" : "Owner enabled");
      startRefresh(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to update owner");
    } finally {
      setBusy(false);
    }
  }

  async function createFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await createFarmAction({
        owner_id: farmOwnerId || (owners.find((owner) => owner.role === "owner")?.id ?? ""),
        farm_name: farmName,
        device_id: deviceId,
      });
      if (!result.ok) throw new Error(result.error);
      setFarmName("");
      setDeviceId("");
      setDeviceKey(result.device_key);
      setDeviceKeyOwner(`${result.farm_name} (${result.device_id})`);
      setNotice("Farm and device created");
      startRefresh(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create farm");
    } finally {
      setBusy(false);
    }
  }

  async function rotateKey(farm: Farm) {
    if (!farm.device) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await rotateDeviceKeyAction({
        device_id: farm.device.device_id,
        farm_name: farm.name,
      });
      if (!result.ok) throw new Error(result.error);
      setDeviceKey(result.device_key);
      setDeviceKeyOwner(`${result.farm_name} (${result.device_id})`);
      setNotice("Device key rotated");
      startRefresh(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to rotate key");
    } finally {
      setBusy(false);
    }
  }

  const shownError = error;


  return (
    <AppShell
      title="Admin"
      subtitle="Owners, farms and device keys"
      role="admin"
      refreshing={refreshing}
      onRefresh={() => startRefresh(() => router.refresh())}
    >
      {shownError ? <Notice tone="bad">{shownError}</Notice> : null}
      {notice ? <Notice tone="good">{notice}</Notice> : null}

      {deviceKey ? (
        <Notice tone="warn">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                Device key for {deviceKeyOwner}
              </h2>
              <p className="mt-1 text-xs opacity-80">
                Copy it now. It will not be shown again.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(deviceKey)}
                className={primaryButtonClass}
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => setDeviceKey(null)}
                className={secondaryButtonClass}
              >
                Done
              </button>
            </div>
          </div>
          <code className="mt-3 block w-full overflow-x-auto rounded-md bg-black/30 px-3 py-2 text-sm text-zinc-100">
            {deviceKey}
          </code>
        </Notice>
      ) : null}

      <div className="grid w-full gap-10 lg:grid-cols-2">
        <Section title="Create owner" description="Add an owner account and login.">
          <form onSubmit={createOwner} className="space-y-4">
            <label className="block text-sm font-medium text-zinc-300">
              Full name
              <input
                value={ownerFullName}
                onChange={(event) => setOwnerFullName(event.target.value)}
                required
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium text-zinc-300">
              Email
              <input
                type="email"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                required
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium text-zinc-300">
              Password
              <input
                type="password"
                value={ownerPassword}
                onChange={(event) => setOwnerPassword(event.target.value)}
                required
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className={`${primaryButtonClass} w-full`}
            >
              Create owner
            </button>
          </form>
        </Section>

        <Section
          title="Create farm + device"
          description="One ESP32 per farm; the key is shown once."
        >
          <form onSubmit={createFarm} className="space-y-4">
            <label className="block text-sm font-medium text-zinc-300">
              Owner
              <select
                value={farmOwnerId}
                onChange={(event) => setFarmOwnerId(event.target.value)}
                required
                className={inputClass}
              >
                <option value="">Select owner</option>
                {owners
                  .filter(
                    (owner) =>
                      owner.role === "owner" && owner.disabled_at === null,
                  )
                  .map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.full_name}
                      {owner.email ? ` (${owner.email})` : ""}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-300">
              Farm name
              <input
                value={farmName}
                onChange={(event) => setFarmName(event.target.value)}
                required
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium text-zinc-300">
              Device ID
              <input
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                required
                placeholder="farm-01"
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={busy || owners.length === 0}
              className={`${primaryButtonClass} w-full`}
            >
              Create farm + device
            </button>
          </form>
        </Section>
      </div>

      <Section title="Owners" description="Active owners can log in and view their farms.">
        {owners.length === 0 ? (
          <EmptyState>No owners yet.</EmptyState>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Farms</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr key={owner.id} className="border-t border-white/10">
                    <td className="py-3 pr-4 font-medium">{owner.full_name}</td>
                    <td className="py-3 pr-4 text-zinc-400">{owner.email ?? "—"}</td>
                    <td className="py-3 pr-4 capitalize text-zinc-400">{owner.role}</td>
                    <td className="py-3 pr-4">
                      <StatusPill
                        label={owner.disabled_at ? "Disabled" : "Active"}
                        tone={owner.disabled_at ? "bad" : "good"}
                        dot
                      />
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{owner.farm_count}</td>
                    <td className="py-3 text-right">
                      {owner.role === "owner" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void setOwnerDisabled(owner, owner.disabled_at === null)
                          }
                          disabled={busy}
                          className={secondaryButtonClass}
                        >
                          {owner.disabled_at ? "Enable" : "Disable"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Farms and devices" description="Device status and key rotation.">
        {farms.length === 0 ? (
          <EmptyState>No farms yet.</EmptyState>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Farm</th>
                  <th className="py-2 pr-4">Owner</th>
                  <th className="py-2 pr-4">Device ID</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Last seen</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => (
                  <tr key={farm.id} className="border-t border-white/10">
                    <td className="py-3 pr-4 font-medium">{farm.name}</td>
                    <td className="py-3 pr-4 text-zinc-400">{farm.owner_name ?? "—"}</td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {farm.device?.device_id ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill
                        label={
                          farm.device
                            ? farm.device.disabled_at
                              ? "Disabled"
                              : "Active"
                            : "No device"
                        }
                        tone={
                          farm.device?.disabled_at
                            ? "bad"
                            : farm.device
                              ? "good"
                              : "neutral"
                        }
                        dot={Boolean(farm.device)}
                      />
                    </td>
                    <td className="py-3 pr-4 text-zinc-400">
                      {farm.device?.last_seen_at
                        ? formatTime(farm.device.last_seen_at)
                        : "—"}
                    </td>
                    <td className="py-3 text-right">
                      {farm.device ? (
                        <button
                          type="button"
                          onClick={() => void rotateKey(farm)}
                          disabled={busy}
                          className={secondaryButtonClass}
                        >
                          Rotate key
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </AppShell>
  );
}
