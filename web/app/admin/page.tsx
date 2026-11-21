"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, EmptyState, StatusPill } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Owner = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  disabled_at: string | null;
  farm_count: number;
};

type Device = {
  device_id: string;
  disabled_at: string | null;
  last_seen_at: string | null;
} | null;

type Farm = {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string | null;
  created_at: string;
  device: Device;
};

export default function AdminPage() {
  const router = useRouter();
  const [supabase] = useState<ReturnType<typeof supabaseBrowser> | null>(() => {
    try {
      return supabaseBrowser();
    } catch {
      return null;
    }
  });
  const [configError] = useState<string | null>(() => {
    try {
      supabaseBrowser();
      return null;
    } catch (caught) {
      return caught instanceof Error
        ? caught.message
        : "Browser Supabase configuration is missing";
    }
  });
  const [token, setToken] = useState<string | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [deviceKeyOwner, setDeviceKeyOwner] = useState<string | null>(null);

  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  const [farmOwnerId, setFarmOwnerId] = useState("");
  const [farmName, setFarmName] = useState("");
  const [deviceId, setDeviceId] = useState("");

  const apiRequest = useCallback(
    async <T,>(
      path: string,
      jwt: string,
      options: RequestInit = {},
    ): Promise<T> => {
      const response = await fetch(path, {
        ...options,
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
      });
      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : `HTTP ${response.status}`,
        );
      }
      return data as T;
    },
    [],
  );

  const loadData = useCallback(
    async (jwt: string) => {
      setLoading(true);
      setError(null);
      try {
        const [ownersData, farmsData] = await Promise.all([
          apiRequest<{ owners: Owner[] }>("/api/admin/owners", jwt),
          apiRequest<{ owners: Owner[]; farms: Farm[] }>(
            "/api/admin/farms",
            jwt,
          ),
        ]);
        setOwners(ownersData.owners);
        setFarms(farmsData.farms);
        setFarmOwnerId((current) => {
          if (current) return current;
          return farmsData.owners.find((owner) => owner.role === "owner")?.id ?? "";
        });
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Failed to load admin data",
        );
      } finally {
        setLoading(false);
      }
    },
    [apiRequest],
  );

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.session) {
          router.replace("/login");
          return;
        }
        setToken(data.session.access_token);
        void loadData(data.session.access_token);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not check sign-in session",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadData, router, supabase]);

  async function createOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest("/api/admin/owners", token, {
        method: "POST",
        body: JSON.stringify({
          email: ownerEmail,
          full_name: ownerFullName,
          password: ownerPassword,
        }),
      });
      setOwnerEmail("");
      setOwnerFullName("");
      setOwnerPassword("");
      setNotice("Owner created");
      await loadData(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create owner");
    } finally {
      setBusy(false);
    }
  }

  async function setOwnerDisabled(owner: Owner, disabled: boolean) {
    if (!token) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(`/api/admin/owners/${owner.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ disabled }),
      });
      setNotice(disabled ? "Owner disabled" : "Owner enabled");
      await loadData(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to update owner");
    } finally {
      setBusy(false);
    }
  }

  async function createFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await apiRequest<{
        farm: { id: string; name: string };
        device_id: string;
        device_key: string;
      }>("/api/admin/farms", token, {
        method: "POST",
        body: JSON.stringify({
          owner_id: farmOwnerId,
          farm_name: farmName,
          device_id: deviceId,
        }),
      });
      setFarmName("");
      setDeviceId("");
      setDeviceKey(result.device_key);
      setDeviceKeyOwner(`${result.farm.name} (${result.device_id})`);
      setNotice("Farm and device created");
      await loadData(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create farm");
    } finally {
      setBusy(false);
    }
  }

  async function rotateKey(farm: Farm) {
    if (!token || !farm.device) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await apiRequest<{ device_id: string; device_key: string }>(
        `/api/admin/devices/${farm.device.device_id}/rotate`,
        token,
        { method: "POST" },
      );
      setDeviceKey(result.device_key);
      setDeviceKeyOwner(`${farm.name} (${result.device_id})`);
      setNotice("Device key rotated");
      await loadData(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to rotate key");
    } finally {
      setBusy(false);
    }
  }

  const shownError = error ?? configError;

  if (!token) {
    return <main className="flex min-h-full w-full items-center justify-center">Loading...</main>;
  }

  return (
    <AppShell
      title="Admin"
      subtitle="Owners, farms and device keys"
      role="admin"
      actions={
        <button
          type="button"
          onClick={() => void loadData(token)}
          disabled={loading}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {shownError ? (
        <p className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {shownError}
        </p>
      ) : null}
      {notice ? (
        <p className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </p>
      ) : null}

      {deviceKey ? (
        <section className="w-full rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Device key for {deviceKeyOwner}
              </h2>
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                Copy it now. It will not be shown again.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(deviceKey)}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => setDeviceKey(null)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700"
              >
                Done
              </button>
            </div>
          </div>
          <code className="mt-3 block w-full overflow-x-auto rounded-lg bg-white px-3 py-2 text-sm dark:bg-zinc-950">
            {deviceKey}
          </code>
        </section>
      ) : null}

      <div className="grid w-full gap-6 lg:grid-cols-2">
        <Card title="Create owner" description="Add an owner account and login.">
          <form onSubmit={createOwner} className="space-y-4">
            <label className="block text-sm font-medium">
              Full name
              <input
                value={ownerFullName}
                onChange={(event) => setOwnerFullName(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                type="password"
                value={ownerPassword}
                onChange={(event) => setOwnerPassword(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <button
              type="submit"
              disabled={busy || loading}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Create owner
            </button>
          </form>
        </Card>

        <Card
          title="Create farm + device"
          description="One ESP32 per farm; the key is shown once."
        >
          <form onSubmit={createFarm} className="space-y-4">
            <label className="block text-sm font-medium">
              Owner
              <select
                value={farmOwnerId}
                onChange={(event) => setFarmOwnerId(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
            <label className="block text-sm font-medium">
              Farm name
              <input
                value={farmName}
                onChange={(event) => setFarmName(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="block text-sm font-medium">
              Device ID
              <input
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value)}
                required
                placeholder="farm-01"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <button
              type="submit"
              disabled={busy || loading || !farmOwnerId}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Create farm + device
            </button>
          </form>
        </Card>
      </div>

      <Card title="Owners" description="Active owners can log in and view their farms.">
        {owners.length === 0 ? (
          <EmptyState>No owners yet.</EmptyState>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Farms</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {owners.map((owner) => (
                  <tr
                    key={owner.id}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 font-medium">{owner.full_name}</td>
                    <td className="px-3 py-2">{owner.email ?? "—"}</td>
                    <td className="px-3 py-2 capitalize">{owner.role}</td>
                    <td className="px-3 py-2">
                      <StatusPill
                        label={owner.disabled_at ? "Disabled" : "Active"}
                        tone={owner.disabled_at ? "bad" : "good"}
                      />
                    </td>
                    <td className="px-3 py-2 tabular-nums">{owner.farm_count}</td>
                    <td className="px-3 py-2 text-right">
                      {owner.role === "owner" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void setOwnerDisabled(owner, owner.disabled_at === null)
                          }
                          disabled={busy}
                          className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium disabled:opacity-50 dark:border-zinc-700"
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
      </Card>

      <Card title="Farms and devices" description="Device status and key rotation.">
        {farms.length === 0 ? (
          <EmptyState>No farms yet.</EmptyState>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Farm</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Device ID</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Last seen</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => (
                  <tr
                    key={farm.id}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 font-medium">{farm.name}</td>
                    <td className="px-3 py-2">{farm.owner_name ?? "—"}</td>
                    <td className="px-3 py-2">
                      {farm.device?.device_id ?? "—"}
                    </td>
                    <td className="px-3 py-2">
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
                      />
                    </td>
                    <td className="px-3 py-2">
                      {farm.device?.last_seen_at ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {farm.device ? (
                        <button
                          type="button"
                          onClick={() => void rotateKey(farm)}
                          disabled={busy}
                          className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium disabled:opacity-50 dark:border-zinc-700"
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
      </Card>
    </AppShell>
  );
}

