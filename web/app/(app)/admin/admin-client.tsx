"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Cpu, House, Info, KeyRound, Plus, UserPlus, UserX, X } from "lucide-react";
import { Card, EmptyNote, ErrorNote, Tag, cx } from "@/components/app/ui";
import { plural, type OwnerRow } from "@/lib/admin-view";
import type { AdminFarm } from "@/lib/db/admin";
import { createFarmAction, createOwnerAction, rotateDeviceKeyAction, setOwnerDisabledAction } from "./actions";

const FIELD =
  "h-12 w-full rounded-sm border border-border-strong bg-surface px-3 text-base text-text placeholder:text-muted focus:outline-3 focus:outline-offset-2 focus:outline-primary";
const PRIMARY =
  "interactive flex h-12 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-base font-semibold text-white hover:bg-primary-hover";
const SECONDARY =
  "interactive flex h-12 items-center justify-center gap-2 rounded-sm border border-border-strong bg-surface px-4 text-base font-semibold text-text hover:border-subtle hover:bg-[#F1F5F9]";
const TH = "border-b border-border px-1 py-2 text-right text-xs font-semibold text-muted first:text-left";
const TD = "border-b border-[#F1F5F9] px-1 py-3 text-right tabular-nums first:text-left";

type OwnerOption = { id: string; label: string };
type ShownKey = { key: string; label: string };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="flex size-10 flex-none items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
      {initials}
    </span>
  );
}

function StatusTag({ disabled }: { disabled: boolean }) {
  return disabled ? <Tag tone="off">Disabled</Tag> : <Tag tone="on">Active</Tag>;
}

/** Disable / Enable text action from the owner card, with a 44px hit area. */
function ToggleOwner({ owner, busy, onToggle }: { owner: OwnerRow; busy: boolean; onToggle: (owner: OwnerRow) => void }) {
  const Icon = owner.disabled ? UserPlus : UserX;
  return (
    <button
      type="button"
      onClick={() => onToggle(owner)}
      disabled={busy}
      aria-label={`${owner.disabled ? "Enable" : "Disable"} ${owner.name}`}
      className={cx(
        "interactive -my-3 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-sm px-2 text-xs font-bold hover:underline",
        owner.disabled ? "text-success" : "text-danger",
      )}
    >
      <Icon size={16} aria-hidden />
      {owner.disabled ? "Enable" : "Disable"}
    </button>
  );
}

function OwnerCard({ owner, busy, onToggle }: { owner: OwnerRow; busy: boolean; onToggle: (owner: OwnerRow) => void }) {
  return (
    <Card className={cx("p-3", owner.disabled && "opacity-70")}>
      <div className="flex items-center gap-3">
        <Avatar initials={owner.initials} />
        <div className="min-w-0 flex-1">
          <b className="block truncate text-base">{owner.name}</b>
          <span className="block truncate text-xs text-muted">{owner.email ?? "No email"}</span>
        </div>
        <StatusTag disabled={owner.disabled} />
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <House size={14} aria-hidden />
          {plural(owner.farmCount, "farm")}
        </span>
        <span className="flex items-center gap-1">
          <Cpu size={14} aria-hidden />
          {owner.deviceCount} ESP32
        </span>
        <span className="ml-auto">
          <ToggleOwner owner={owner} busy={busy} onToggle={onToggle} />
        </span>
      </div>
    </Card>
  );
}

function OwnerTable({ owners, busy, onToggle }: { owners: OwnerRow[]; busy: boolean; onToggle: (owner: OwnerRow) => void }) {
  return (
    <Card className="hidden lg:block">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={TH}>Owner</th>
            <th className={TH}>Status</th>
            <th className={TH}>Farms</th>
            <th className={TH}>ESP32</th>
            <th className={TH}>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {owners.map((owner) => (
            <tr key={owner.id} className={cx(owner.disabled && "opacity-70")}>
              <td className={TD}>
                <div className="flex items-center gap-3">
                  <Avatar initials={owner.initials} />
                  <div className="min-w-0">
                    <b className="block text-base">{owner.name}</b>
                    <span className="block text-xs text-muted">{owner.email ?? "No email"}</span>
                  </div>
                </div>
              </td>
              <td className={TD}>
                <StatusTag disabled={owner.disabled} />
              </td>
              <td className={TD}>{owner.farmCount}</td>
              <td className={TD}>{owner.deviceCount}</td>
              <td className={TD}>
                <ToggleOwner owner={owner} busy={busy} onToggle={onToggle} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function deviceTag(farm: AdminFarm) {
  if (!farm.device) return <Tag tone="off">No ESP32</Tag>;
  return farm.device.disabled_at ? <Tag tone="bad">Disabled</Tag> : <Tag tone="on">Active</Tag>;
}

function RotateButton({ farm, busy, onRotate }: { farm: AdminFarm; busy: boolean; onRotate: (farm: AdminFarm) => void }) {
  if (!farm.device) return null;
  return (
    <button
      type="button"
      onClick={() => onRotate(farm)}
      disabled={busy}
      aria-label={`Rotate key for ${farm.name}`}
      className="interactive -my-3 -mr-2 inline-flex min-h-11 items-center gap-1 rounded-sm px-2 text-xs font-bold text-primary hover:underline"
    >
      <KeyRound size={16} aria-hidden />
      Rotate key
    </button>
  );
}

/** One-time device key display. The key is only in client state until "Done". */
function KeyCard({ shown, onDone }: { shown: ShownKey; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="border-warning bg-warning-soft" role="status">
      <b className="flex items-center gap-2 text-base text-warning">
        <KeyRound size={18} aria-hidden />
        Device key for {shown.label}
      </b>
      <p className="mt-1 text-sm text-warning">Copy it now. It won&apos;t be shown again.</p>
      <code className="mt-3 block overflow-x-auto rounded-sm border border-border bg-surface px-3 py-2 font-mono text-sm">
        {shown.key}
      </code>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={cx(PRIMARY, "flex-1")}
          onClick={() => {
            void navigator.clipboard.writeText(shown.key).then(() => setCopied(true));
          }}
        >
          {copied ? <Check size={20} aria-hidden /> : <Copy size={20} aria-hidden />}
          {copied ? "Copied" : "Copy key"}
        </button>
        <button type="button" className={cx(SECONDARY, "flex-1")} onClick={onDone}>
          Done
        </button>
      </div>
    </Card>
  );
}

export function AdminClient({
  owners,
  ownerOptions,
  farms,
}: {
  owners: OwnerRow[];
  ownerOptions: OwnerOption[];
  farms: AdminFarm[];
}) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shownKey, setShownKey] = useState<ShownKey | null>(null);
  const [form, setForm] = useState<"owner" | "farm" | null>(null);

  async function run(work: () => Promise<string>, fallback: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setNotice(await work());
      startRefresh(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function createOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const data = new FormData(formEl);
    void run(async () => {
      const result = await createOwnerAction({
        full_name: String(data.get("full_name") ?? ""),
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      });
      if (!result.ok) throw new Error(result.error);
      formEl.reset();
      setForm(null);
      return "Owner created";
    }, "Failed to create owner");
  }

  function createFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const data = new FormData(formEl);
    void run(async () => {
      const result = await createFarmAction({
        owner_id: String(data.get("owner_id") ?? ""),
        farm_name: String(data.get("farm_name") ?? ""),
        device_id: String(data.get("device_id") ?? ""),
      });
      if (!result.ok) throw new Error(result.error);
      formEl.reset();
      setForm(null);
      setShownKey({ key: result.device_key, label: `${result.farm_name} (${result.device_id})` });
      return "Farm and ESP32 created";
    }, "Failed to create farm");
  }

  function toggleOwner(owner: OwnerRow) {
    void run(async () => {
      const result = await setOwnerDisabledAction({ id: owner.id, disabled: !owner.disabled });
      if (!result.ok) throw new Error(result.error);
      return owner.disabled ? `${owner.name} enabled` : `${owner.name} disabled`;
    }, "Failed to update owner");
  }

  function rotateKey(farm: AdminFarm) {
    if (!farm.device) return;
    const device = farm.device;
    void run(async () => {
      const result = await rotateDeviceKeyAction({ device_id: device.device_id, farm_name: farm.name });
      if (!result.ok) throw new Error(result.error);
      setShownKey({ key: result.device_key, label: `${result.farm_name} (${result.device_id})` });
      return "Device key rotated";
    }, "Failed to rotate key");
  }

  return (
    <>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {notice ? (
        <p role="status" className="flex items-center gap-2 rounded-sm bg-success-soft p-3 text-sm text-success">
          <Check size={18} className="flex-none" aria-hidden />
          {notice}
        </p>
      ) : null}
      {shownKey ? <KeyCard shown={shownKey} onDone={() => setShownKey(null)} /> : null}

      {form === "owner" ? (
        <Card>
          <form onSubmit={createOwner} className="flex flex-col gap-4">
            <b className="text-base">Add owner</b>
            <Field label="Full name">
              <input name="full_name" required autoComplete="off" className={FIELD} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required autoComplete="off" className={FIELD} />
            </Field>
            <Field label="Password">
              <input name="password" type="password" required autoComplete="new-password" className={FIELD} />
            </Field>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className={cx(PRIMARY, "flex-1")}>
                <UserPlus size={20} aria-hidden />
                Create owner
              </button>
              <button type="button" onClick={() => setForm(null)} className={cx(SECONDARY, "flex-1")}>
                <X size={20} aria-hidden />
                Cancel
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <button type="button" onClick={() => setForm("owner")} className={cx(PRIMARY, "lg:self-start")}>
          <UserPlus size={20} aria-hidden />
          Add owner
        </button>
      )}

      {owners.length === 0 ? (
        <EmptyNote>No owners yet. Add one to get started.</EmptyNote>
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:hidden">
            {owners.map((owner) => (
              <OwnerCard key={owner.id} owner={owner} busy={busy} onToggle={toggleOwner} />
            ))}
          </div>
          <OwnerTable owners={owners} busy={busy} onToggle={toggleOwner} />
        </>
      )}

      <p className="flex items-center gap-2 text-xs text-muted">
        <Info size={16} className="flex-none text-primary" aria-hidden />
        Disabled owners can&apos;t sign in. Their data is kept.
      </p>

      <section aria-labelledby="farms-heading" className="mt-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="farms-heading" className="flex items-center gap-2 text-base font-bold">
            <House size={18} className="text-primary" aria-hidden />
            Farms and ESP32s
          </h2>
          {form === "farm" ? null : (
            <button
              type="button"
              onClick={() => setForm("farm")}
              disabled={ownerOptions.length === 0}
              className={cx(SECONDARY, "h-11 text-sm")}
            >
              <Plus size={18} aria-hidden />
              Add farm
            </button>
          )}
        </div>

        {form === "farm" ? (
          <Card>
            <form onSubmit={createFarm} className="flex flex-col gap-4">
              <b className="text-base">Add farm and ESP32</b>
              <Field label="Owner">
                <select name="owner_id" required defaultValue="" className={FIELD}>
                  <option value="" disabled>
                    Select owner
                  </option>
                  {ownerOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Farm name">
                <input name="farm_name" required autoComplete="off" className={FIELD} />
              </Field>
              <Field label="Device ID">
                <input name="device_id" required autoComplete="off" placeholder="farm-01" className={FIELD} />
              </Field>
              <p className="flex items-center gap-2 text-xs text-muted">
                <Info size={16} className="flex-none text-primary" aria-hidden />
                One ESP32 per farm. Its key is shown once.
              </p>
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className={cx(PRIMARY, "flex-1")}>
                  <Plus size={20} aria-hidden />
                  Create farm
                </button>
                <button type="button" onClick={() => setForm(null)} className={cx(SECONDARY, "flex-1")}>
                  <X size={20} aria-hidden />
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        ) : null}

        {farms.length === 0 ? (
          <EmptyNote>No farms yet.</EmptyNote>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:hidden">
              {farms.map((farm) => (
                <Card key={farm.id} className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <b className="block truncate text-base">{farm.name}</b>
                      <span className="block truncate text-xs text-muted">{farm.owner_name ?? "No owner"}</span>
                    </div>
                    {deviceTag(farm)}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Cpu size={14} aria-hidden />
                      {farm.device?.device_id ?? "No ESP32"}
                    </span>
                    <span className="ml-auto">
                      <RotateButton farm={farm} busy={busy} onRotate={rotateKey} />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
            <Card className="hidden lg:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className={TH}>Farm</th>
                    <th className={TH}>Owner</th>
                    <th className={TH}>ESP32</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {farms.map((farm) => (
                    <tr key={farm.id}>
                      <td className={cx(TD, "font-semibold")}>{farm.name}</td>
                      <td className={TD}>{farm.owner_name ?? "—"}</td>
                      <td className={cx(TD, "font-mono")}>{farm.device?.device_id ?? "—"}</td>
                      <td className={TD}>{deviceTag(farm)}</td>
                      <td className={TD}>
                        <RotateButton farm={farm} busy={busy} onRotate={rotateKey} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </section>
    </>
  );
}
