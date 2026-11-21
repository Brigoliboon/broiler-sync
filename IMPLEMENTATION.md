# BroilerSync: Implementation

Build order. Each item cites its requirement IDs from `REQUIREMENTS.md`. Tick items in the PR that completes them and add a progress log line.

Deadline: **2026-11-29**.

## M1 (Nov 12-15): Scope and parts [done]
- [x] Client scope doc reviewed, Blynk replaced by the website
- [x] Parts list (`docs/item_lists.pdf`) (C-3)
- [x] Power design: 12V rail, battery switchover, buck to 5V, IP65 panel (C-3, NFR-5)
- [x] Services breakdown for pricing (C-2)

## M2 (Nov 16-19): ESP32 firmware
- [x] Both DHT22s and both anemometers read in the simulator (FR-1, FR-2)
- [ ] Battery voltage on D35 (FR-3)
- [x] Sensor fault detection (FR-5)
- [x] Age-based fan setpoints with hysteresis (FR-6, FR-7)
- [x] Lamp rule (FR-8)
- [ ] Manual and auto modes with timed override (FR-9)
- [ ] Fail-safe defaults for sensor, power and Wi-Fi loss (FR-10), after Boon confirms them
- [x] Settings cached in flash (FR-12)
- [x] SD logging every 1 minute with RTC time (FR-4, FR-13)
- [x] 1602 I2C LCD status display with rotating pages (FR-25)
- [ ] Bench test with real parts, `SIM_MODE 0`, active-LOW relays (FR-11)

## M3 (Nov 17-22): Database and website
- [x] Repo setup: CI, PR template, branch protection on `main`, Vercel and Supabase connected
- [x] `docs/DESIGN.md`: schema, device API, alert rules
- [x] Schema migrations: owners, farms, devices, compartments, readings, alerts, daily stats, age thresholds, with RLS (FR-17, FR-18, NFR-4)
- [x] Device endpoints: post readings, batch backfill, pull settings, per-device key (FR-14, FR-15, FR-16)
- [x] Firmware sync every 5 min plus immediate warnings (FR-14)
- [x] Admin: create and disable owners (FR-17)
- [x] Dashboard for both compartments (FR-19)
- [ ] History graphs (FR-20)
- [ ] Daily min, max and average (FR-21)
- [ ] CSV export (FR-22)
- [ ] Web push alerts (FR-23)
- [ ] Optional: setpoint and mode controls (FR-24)
- [ ] Server-side data access rework (#21)
  - [x] Typed server-only query helpers (#15)
  - [x] Cookie auth with Server Actions and middleware (#18)
  - [x] Server-rendered dashboard (#16)
  - [x] Admin pages via Server Actions (#17)
  - [ ] Keep Supabase out of the browser bundle (#19)
  - [ ] Docs for the new data-access rules (#20)

## M4 (Nov 22-23): Bench integration
- [ ] Full loop test with simulated sensor faults, power loss and Wi-Fi loss (FR-5, FR-10, FR-15, NFR-1, NFR-2)
- [ ] Final wiring and ESP32 pin diagrams in `docs/images/`

## M5 (Nov 24-27): Power, enclosure, installation
- [ ] 12V and battery switchover installed (NFR-5)
- [ ] Enclosure, sensors at bird level in both compartments, fan in the experimental one
- [ ] Mount the 1602 I2C LCD where it is readable from outside the enclosure (FR-25)
- [ ] Installation photos

## M6 (Nov 28-29): Field test and handover
- [ ] Field test and demo
- [ ] Operating and troubleshooting manual (`docs/USER_GUIDE.md`)
- [ ] Sensor documentation for the appendices
- [ ] Tag `v1.0`

## Progress log

Newest first. Times are Asia/Manila (UTC+8).

### 2026-11-21
- M3 rework: admin list data is loaded on the server; create/disable owners, create farm+device and rotate-key are Server Actions. The one-time device key is still shown only after create or rotate.
- M3 rework: the dashboard is a Server Component that loads farms, devices and latest readings through `getDashboardData()`. The 30 s refresh uses `router.refresh()` so the browser never queries Supabase.
- M3 rework: cookie sessions via Next.js Proxy (`web/proxy.ts`, the Next.js 16 name for middleware), sign-in/sign-out Server Actions, and `requireAdmin` reading the cookie first. Dashboard table queries still use a cookie-backed browser client until #16.
- M3 rework: added typed server-only query helpers (`web/lib/db/`) and a cookie-bound `@supabase/ssr` server client. The service-role client now lives in `web/lib/supabase/admin.ts` with `import "server-only"`. Website pages still use the browser client until the follow-up issues.
- M3: added the live dashboard (FR-19) for both compartments with fan/lamp, mode, battery, alert, online status and 30 s refresh, backed by a `latest_readings` view with RLS. The admin, dashboard, login and landing pages now share one dark UI shell. `firmware/config.h` stays local-only with placeholder keys.
- M3: verified repo setup (CI, PR template, branch protection on `main`, Vercel and Supabase connected).
- M3: added admin provisioning (FR-17/FR-18): login, owner create/disable, farm + device creation with a one-time device key, and device-key rotation. The admin API is guarded by an admin Supabase JWT and uses the service role only server-side.
- M3: verified firmware-to-API sync (FR-14) against the deployed Vercel API using `test-farm`: config GET, readings POST and alerts POST all returned 200. Device key and API URL remain local-only and uncommitted.

### 2026-11-20
- M3: added the device API (FR-14/15/16): per-device key auth, config GET, readings/alerts POST, duplicate-safe backfill RPCs and offline-clear on reconnect. Firmware-side 5-minute sync and the website remain pending.
- M2: added the 1602 I2C LCD status display (FR-25): three rotating pages, missing-LCD retry, no extra library (uses `Wire`). Bench test with the real LCD still pending.

### 2026-11-17
- Init schema applied to hosted Supabase via `db-migrate`; age setpoints moved from `seed.sql` into a migration so they reach the hosted DB; Supabase CLI pinned to 3.2.0 in CI.
- Added Supabase schema migrations with RLS, plus CI `supabase` check and `db-migrate` workflow.
- Drafted `docs/DESIGN.md` (schema, device API, alert rules).
- M2: fault detection, setpoints, lamp rule, flash settings and SD logging confirmed working in v2 (Boon); battery, modes, fail-safes and bench test still untested.
- CI pipeline and PR template added (web lint/type-check/build, firmware compile).
- Project named BroilerSync; folder cleaned: firmware in `firmware/` (`firmware.ino`), single-file Wokwi sketch in `firmware/prototype/`, diagrams in `docs/images/`, parts list in `docs/item_lists.pdf`.

### 2026-11-15
- M1 closed (price still in negotiation, anemometer deferred, database design moved to M3).
- v2 firmware runs in the simulator with both compartments' sensors and the fan and lamp relays.
