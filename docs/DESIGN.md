# BroilerSync: Design

Schema, device API and alert rules for M3. Grounded in `REQUIREMENTS.md` (FR-13–FR-24, NFR-1–NFR-5, C-4, C-5) and in the v2 firmware (`firmware/cloud.cpp`, `config.h`, `storage.cpp`, `settings.cpp`, `control.cpp`). Where the firmware and the requirements disagree, the firmware contract wins for the device API. Accepted differences are recorded under [Decisions](#12-decisions); remaining gaps are under [Open questions](#13-open-questions).

Times are Asia/Manila (UTC+8). Supabase project ref: `djxhciqoieqryqchuxhn`.

## 1. Architecture

```
ESP32  --HTTPS + device key-->  Next.js device API on Vercel  --service role-->  Supabase
                                                                      ^
browser  --cookie / RSC / Server Actions-->  Next.js App Router ------+
                                             |  cookie-bound @supabase/ssr client (RLS)
                                             |  service role (device API, admin provisioning only)
                                             +
                                        web push (VAPID)
```

- The ESP32 never talks to Supabase directly. It calls the Next.js device API with a per-device key (FR-16).
- Device route handlers verify the key, then read and write with the **service role**. The service-role key never reaches the browser or the firmware (NFR-4).
- The website does not call Supabase from the browser. Login, the dashboard and admin pages are Server Components and Server Actions. User data is loaded with a cookie-bound `@supabase/ssr` server client so Row Level Security applies under the signed-in session. Admin provisioning and the device API use the service-role client, which is guarded with `import "server-only"`.
- The dashboard still refreshes every 30 s, but through `router.refresh()` (same-origin), so DevTools does not show Supabase requests.
- One owner can have several farms; one ESP32 per farm (FR-18). Boon is the admin (FR-17).

Firmware sync (FR-13, FR-14, FR-15): a reading is logged to microSD every 60 s; a POST runs every 5 minutes, or immediately on an alert, relay or mode trigger (which also resets the 5-minute countdown). Alert events are uploaded first, then readings, oldest first, 20 items per request. On Wi-Fi return, the same loop backfills anything still unsent.

Local display (FR-25): a 1602 character LCD with a PCF8574 I2C backpack shares the DS3231 bus (D21/D22). It rotates three pages every 4 s: experimental/control readings, fan/lamp/mode/battery/alert, and age/setpoint/SD/Wi-Fi. The display is read-only and never participates in control. A missing LCD is retried every 30 s and does not block logging or sync.

## 2. Data model

UUID primary keys unless noted. Timestamps are `timestamptz`. Firmware `ts` values are ISO-8601 with offset, e.g. `2026-11-12T11:48:00+08:00`; store them as-is. `ts` may be null when the RTC is unset and NTP has not run yet.

### 2.1 `profiles`

One row per Supabase Auth user.

| column | type | notes |
|---|---|---|
| `id` | uuid PK | `= auth.users.id` |
| `full_name` | text not null | |
| `role` | text not null | `owner` or `admin`, default `owner` |
| `disabled_at` | timestamptz | null = active (FR-17) |
| `created_at`, `updated_at` | timestamptz | |

### 2.2 `farms`

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `owner_id` | uuid not null | FK `profiles.id` |
| `name` | text not null | |
| `created_at` | timestamptz | |

Index: `(owner_id)`.

### 2.3 `devices`

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `farm_id` | uuid not null unique | FK `farms.id`; one device per farm |
| `device_id` | text not null unique | firmware `DEVICE_ID`, e.g. `farm-01` |
| `key_hash` | text not null | SHA-256 hex of `DEVICE_KEY` (optional server pepper). The plaintext key is shown once at provision time and never stored. |
| `last_seen_at` | timestamptz | updated on every authenticated device request |
| `disabled_at` | timestamptz | null = accepted |
| `created_at` | timestamptz | |

### 2.4 `compartments`

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `farm_id` | uuid not null | FK `farms.id` |
| `slug` | text not null | `experimental` or `control` |
| `name` | text | |

Unique `(farm_id, slug)`. Seed both rows when a farm is created.

### 2.5 `readings`

One row per firmware snapshot (both compartments in the same payload). This matches the POST body exactly, so graphs and daily stats unpivot in a view rather than splitting on ingest.

| column | type | firmware field |
|---|---|---|
| `id` | bigserial PK | |
| `device_id` | text not null | `device_id` (must match the authenticated device) |
| `ts` | timestamptz | `ts` (nullable) |
| `uptime_s` | integer not null | `uptime_s` |
| `age` | integer | `age` (days) |
| `setpoint` | numeric | `setpoint` °C |
| `e_temp`, `e_hum`, `e_wind` | numeric | experimental; null if the sensor was unusable |
| `e_temp_status`, `e_wind_status` | text | `ok`, `no_data`, `range`, `frozen`, `disconnected`, `unknown` |
| `c_temp`, `c_hum`, `c_wind` | numeric | control compartment |
| `c_temp_status`, `c_wind_status` | text | same status enum |
| `batt_v` | numeric | nullable |
| `fan`, `lamp` | boolean not null | |
| `mode` | text not null | `AUTO` or `MANUAL` |
| `alert_level` | text not null | `ok`, `warning`, `critical` |
| `alert_codes` | text[] | from the firmware `|`-separated list |
| `reason` | text | `interval`, `alert`, `relay`, or `mode` |
| `received_at` | timestamptz not null | server time, default `now()` |

Indexes:

- `(device_id, ts desc)` for dashboard and history.
- Unique `(device_id, ts, uptime_s)` **where `ts is not null`**, for idempotent backfill (FR-15).
- Null-`ts` rows are not uniquely constrained. Rare duplicates are accepted rather than dropping data (see [Decisions](#12-decisions)).

Ingest is an upsert on that unique key: a retried batch must not insert duplicates.

View `compartment_readings`: one row per compartment per snapshot (`compartment_slug`, `temp`, `hum`, `wind`, `temp_status`, `wind_status`, plus the shared device columns). History graphs (FR-20) read this view.

View `latest_readings`: the newest snapshot per device for the dashboard (FR-19), ordered by `ts desc nulls last, id desc`. It uses `security_invoker`, so readings RLS still applies.

### 2.6 `alerts`

Firmware alert and info events, plus server-generated `DEVICE_OFFLINE` rows.

| column | type | firmware field |
|---|---|---|
| `id` | bigserial PK | |
| `device_id` | text not null | `device_id` |
| `ts` | timestamptz | `ts` (nullable) |
| `uptime_s` | integer | `uptime_s` |
| `event` | text not null | `start`, `clear`, or `info` |
| `code` | text not null | see [§6](#6-alert-rules-and-web-push) |
| `severity` | text not null | `ok`, `warning`, `critical` |
| `message` | text | `message` |
| `value` | numeric | `value` (nullable) |
| `age` | integer | `age` |
| `received_at` | timestamptz not null | default `now()` |
| `source` | text not null | `device` or `server` |

Indexes: `(device_id, ts desc)`; unique `(device_id, ts, event, code)` where `ts is not null`.

`start` / `clear` close a logical incident when `code` matches. An incident is open if the latest event for that `(device_id, code)` is `start`.

### 2.7 `daily_stats`

Materialized as a **SQL view** over `readings` (thesis-scale: about one row a minute). Refresh to a table later only if needed.

One row per device, per compartment, per **calendar date in Asia/Manila**. Rows with `ts is null` are excluded.

| column | type |
|---|---|
| `device_id` | text |
| `compartment_slug` | text |
| `day` | date |
| `temp_min`, `temp_max`, `temp_avg` | numeric |
| `hum_min`, `hum_max`, `hum_avg` | numeric |
| `wind_min`, `wind_max`, `wind_avg` | numeric |
| `reading_count` | integer |

Averages ignore nulls. This is FR-21.

### 2.8 `age_thresholds`

Display and documentation of the age → setpoint table (FR-7). The v2 firmware has this table **hardcoded** in `control.cpp` (`SP_TABLE`) and does **not** read it from config.

| column | type | v2 values |
|---|---|---|
| `from_day` | integer PK | 0, 1, 4, 7, 10, 13, 16, 19, 22, 25 |
| `to_day` | integer | 0, 3, 6, 9, 12, 15, 18, 21, 24, null (= 25 and after) |
| `setpoint_c` | numeric not null | 30, 28, 27, 26, 25, 24, 23, 22, 21, 20 |

This table is **display-only in v1**. The v2 firmware keeps using its hardcoded `SP_TABLE`. FR-7 writes the last band as days 25–60 at 20°C; v2 stays at 20°C after day 60 as well. That mismatch is accepted for v1.

### 2.9 `device_settings`

The object returned by `GET /api/devices/{id}/config`. Typed columns, not a free-form JSON blob, so the website can edit them safely (FR-24, optional).

| column | type | default (matches `config.h`) |
|---|---|---|
| `device_id` | text PK | FK `devices.device_id` |
| `flock_start` | date | null |
| `age_override_days` | integer | null (= `-1` / unused) |
| `mode` | text not null | `auto` |
| `fan_on_delta`, `fan_off_delta` | numeric | 2.0, 0.5 |
| `lamp_on_delta`, `lamp_off_delta` | numeric | 1.0, 0.0 |
| `temp_warn_delta`, `temp_crit_delta` | numeric | 3.0, 5.0 |
| `brood_days`, `fan_max_on_s`, `fan_rest_s` | integer | 14, 300, 300 |
| `hum_low`, `hum_high`, `hum_brood_low` | numeric | 50, 70, 60 |
| `hum_brood_days` | integer | 3 |
| `wind_alert_ms` | numeric[3] | `{0.15, 0.30, 0.50}` |
| `wind_alert_until_days` | integer[3] | `{14, 21, 28}` |
| `batt_warn_v`, `batt_crit_v` | numeric | 11.8, 11.0 |
| `min_switch_s`, `manual_minutes` | integer | 30, 30 |
| `manual_id` | integer | 0 (increment for each new manual command) |
| `manual_fan`, `manual_lamp` | boolean | false, false |
| `updated_at` | timestamptz | |

Server-side validation must match `settingsValidate()` in `settings.cpp` (ranges and relationships). A config the firmware would reject is not stored.

### 2.10 `push_subscriptions`

| column | type |
|---|---|
| `id` | uuid PK |
| `owner_id` | uuid not null | FK `profiles.id` |
| `endpoint` | text not null unique |
| `p256dh` | text not null |
| `auth` | text not null |
| `user_agent` | text |
| `created_at` | timestamptz |

## 3. Row Level Security

Enable RLS on every table (NFR-4). The service role used by device route handlers bypasses RLS.

Helpers (security definer, stable):

- `is_admin()`: `profiles.role = 'admin'` and `disabled_at is null` for `auth.uid()`.
- `is_active_owner()`: `role = 'owner'` and `disabled_at is null`.
- `owns_farm(farm_id)` / `owns_device(device_id)` via `farms.owner_id`.

Policies (all roles are authenticated unless noted):

| table | select | insert / update / delete |
|---|---|---|
| `profiles` | own row; admin: all | own `full_name`; admin: all, including `role` and `disabled_at` |
| `farms` | own farms; admin: all | admin only (v1) |
| `devices` | via farm ownership; **never** `key_hash` to owners (column privilege or a view without it); admin: all | admin provisions and rotates keys |
| `compartments` | via farm | admin |
| `readings`, `alerts`, `daily_stats` | via farm / device | **no client writes**. Only the service role (device routes, or a server job for `DEVICE_OFFLINE`) |
| `age_thresholds` | any active user | admin |
| `device_settings` | via farm | owner update of own device (FR-24); admin: all. No client insert/delete. |
| `push_subscriptions` | own rows | own rows |

Anonymous access: none. Disabled owners fail the active-user checks, so they see nothing even if a session still exists. Admin also disables the Auth user.

The browser never receives the service-role key. Device endpoints do not use the user's JWT.

## 4. Device authentication

Every firmware request sends:

```
x-device-key: <DEVICE_KEY>
x-device-id: <DEVICE_ID>
```

(`config.h`. The key is a placeholder in git; real values stay on the device and in `key_hash`.)

The handler looks up `devices` by `x-device-id`, rejects disabled devices, and compares `SHA-256(pepper || key)` to `key_hash` in constant time. On failure: **401**. Do not use 400 here: the firmware treats most 4xx as a permanent rejection and **drops the batch**. 401, 403, 408 and 429 are retried.

For `GET /api/devices/{id}/config`, the path `{id}` must equal `x-device-id`; otherwise 401.

On success, set `devices.last_seen_at = now()`. If a `DEVICE_OFFLINE` incident is open, write a server `clear` event.

## 5. Device API

Implemented as Next.js App Router handlers, at the **paths the firmware already calls**. Do not put them under `/api/device/...` — `cloud.cpp` will not find them.

`API_BASE` has no trailing slash. Timeouts on the device are 3 s connect / 4 s total, so these handlers must stay small (push I/O after the DB write, or in a follow-up).

All three endpoints require the headers in §4.

### 5.1 `GET /api/devices/{device_id}/config`

File: `web/app/api/devices/[deviceId]/config/route.ts`.

Pulled on first connect, then every 5 minutes (`CONFIG_INTERVAL_MS`). **200** and a JSON **object**. Missing keys leave the previous cached values on the device; still, always send a complete object so the website and the device agree.

```json
{
  "flock_start": "2026-11-01",
  "age_override_days": null,
  "mode": "auto",
  "fan_on_delta": 2.0,
  "fan_off_delta": 0.5,
  "lamp_on_delta": 1.0,
  "lamp_off_delta": 0.0,
  "temp_warn_delta": 3.0,
  "temp_crit_delta": 5.0,
  "brood_days": 14,
  "fan_max_on_s": 300,
  "fan_rest_s": 300,
  "hum_low": 50,
  "hum_high": 70,
  "hum_brood_low": 60,
  "hum_brood_days": 3,
  "batt_warn_v": 11.8,
  "batt_crit_v": 11.0,
  "min_switch_s": 30,
  "manual_minutes": 30,
  "wind_alert_ms": [0.15, 0.30, 0.50],
  "wind_alert_until_days": [14, 21, 28],
  "manual_id": 3,
  "manual_fan": false,
  "manual_lamp": false
}
```

Field rules, as parsed by `settingsApplyJson()`:

- `flock_start`: `YYYY-MM-DD` string, or `null` to clear. Year 2020–2099.
- `age_override_days`: integer 0–120, or `null` to clear (`-1` on the device).
- `mode`: `auto` or `manual` (case-insensitive). `auto` cancels an active override.
- `wind_alert_ms` and `wind_alert_until_days`: arrays of exactly 3 numbers, or omitted.
- Manual session: starts only when `mode` is `manual` **and** `manual_id` is a new integer (not the last one the device applied). `manual_fan` / `manual_lamp` are booleans (default false). Duration is `manual_minutes`.
- Any other listed numeric key is applied if present and valid. If the merged config fails `settingsValidate()`, the firmware keeps the previous config — so the server must not emit an invalid object.

`flock_start: null` and omitted `flock_start` are different: omitted means "leave unchanged".

### 5.2 `POST /api/alerts`

File: `web/app/api/alerts/route.ts`.

Body: a **JSON array** of event objects (max 20; firmware `SYNC_BATCH`). Each element is already JSON, with these fields:

| field | type | notes |
|---|---|---|
| `device_id` | string | must match `x-device-id` |
| `ts` | string or null | ISO-8601 with offset, or null |
| `uptime_s` | number | |
| `event` | string | `start`, `clear`, or `info` |
| `code` | string | e.g. `E_HUM_LOW`, or `BOOT` for info |
| `severity` | string | `ok`, `warning`, `critical` |
| `message` | string | |
| `value` | number or null | |
| `age` | number | days |

Example:

```json
[
  {
    "device_id": "farm-01",
    "ts": "2026-11-17T03:12:00+08:00",
    "uptime_s": 3600,
    "event": "start",
    "code": "E_HUM_LOW",
    "severity": "warning",
    "message": "Experimental humidity too low",
    "value": 47.2,
    "age": 4
  }
]
```

The firmware also posts `info` / `BOOT` events at boot (`value` null, `severity` `ok`). Store them in `alerts`; do not send a web push.

### 5.3 `POST /api/readings`

File: `web/app/api/readings/route.ts`.

Body: a **JSON array** of snapshot objects (max 20). Fields and types as in §2.5. `alert_codes` arrives as a JSON array of strings (the firmware expands the `|` list). `fan` and `lamp` are booleans. Empty numeric strings on the SD card become JSON `null`.

```json
[
  {
    "device_id": "farm-01",
    "ts": "2026-11-17T03:12:00+08:00",
    "uptime_s": 3600,
    "age": 4,
    "setpoint": 27.0,
    "e_temp": 28.1,
    "e_hum": 62.0,
    "e_wind": 0.08,
    "e_temp_status": "ok",
    "e_wind_status": "ok",
    "c_temp": 27.4,
    "c_hum": 64.0,
    "c_wind": 0.05,
    "c_temp_status": "ok",
    "c_wind_status": "ok",
    "batt_v": 12.41,
    "fan": true,
    "lamp": false,
    "mode": "AUTO",
    "alert_level": "ok",
    "alert_codes": [],
    "reason": "interval"
  }
]
```

### 5.4 Status codes (firmware behaviour)

From `cloud.cpp` `shouldDrop()` and `sendBatch()`:

| code | device behaviour |
|---|---|
| 2xx | commit the batch (pointer advances; data will not be resent) |
| 401, 403, 408, 429 | keep the batch, retry after 30 s |
| other 4xx | **drop the batch permanently** |
| 5xx, network error | keep the batch, retry after 30 s |

After a successful auth, always return **200** and upsert well-formed items. Skip items whose `device_id` does not match the header, or that fail schema, and list skips in the response body. Never 400 a mixed batch: that would delete the good rows from the device's unsent queue.

## 6. Alert rules and web push

The firmware already evaluates the climate and sensor rules and emits debounced `start` / `clear` events (raise delay 0–120 s depending on the code; clear after 120 s). The website must **not** re-evaluate those rules on each reading. It stores the events and notifies on `start`.

### 6.1 Device-originated codes

Defaults below are `config.h`; they follow the device's cached config.

| code | severity | meaning (v2) |
|---|---|---|
| `E_TEMP_SENSOR` | critical | experimental DHT22 failed (NaN, out of range, frozen, failed cycles); safe mode |
| `E_TEMP_HIGH` / `E_TEMP_HIGH_CRIT` | warning / critical | experimental T ≥ setpoint + 3 / + 5 °C (mutually exclusive) |
| `E_TEMP_LOW` / `E_TEMP_LOW_CRIT` | warning / critical | experimental T ≤ setpoint − 3 / − 5 °C |
| `E_HUM_LOW` / `E_HUM_HIGH` | warning | experimental humidity &lt; 60% on days 0–3, else &lt; 50%, or &gt; 70% |
| `E_WIND_HIGH` | warning | experimental wind ≥ 0.15 m/s (days 0–14), 0.30 (15–21), 0.50 (22–28); none after day 28 |
| `E_WIND_SENSOR` | warning | experimental anemometer disconnected or out of range |
| `C_TEMP_SENSOR`, `C_HUM_LOW`, `C_HUM_HIGH`, `C_WIND_HIGH`, `C_WIND_SENSOR` | warning | same rules, control compartment (temperature-vs-setpoint alerts are experimental-only) |
| `BATT_LOW` / `BATT_CRIT` | warning / critical | voltage ≤ 11.8 V / ≤ 11.0 V |
| `BATT_SENSOR` | warning | voltage sensor unusable |
| `SD_ERROR` | warning | SD missing or failing |
| `RTC_LOST` | warning | clock unset |
| `AGE_UNKNOWN` | warning | flock start unknown; cached or fallback age |
| `BOOT` | ok | info only, at boot; reset reason in `message` |

Humidity and wind bands match FR-23. Temperature "outside the setpoint band" in FR-23 is implemented as the ±3 / ±5 °C pair above.

### 6.2 Server-originated: device offline (FR-23)

The firmware cannot report that it is offline. A scheduled job (every 5 minutes) marks a device offline when `last_seen_at` is older than **12 minutes** (two missed 5-minute syncs plus slack). That timeout is decided. It inserts `alerts` with `source = server`, `event = start`, `code = DEVICE_OFFLINE`, `severity = warning`. When the device authenticates again, the API writes the matching `clear`.

The job lives at `GET`/`POST` `/api/cron/device-offline` and requires `Authorization: Bearer $CRON_SECRET`. Vercel Hobby only allows a cron once per day, which is too slow for a 12-minute timeout, so the 5-minute trigger is Supabase `pg_cron` + `pg_net` (`supabase/cron_device_offline.sql`) calling that route. If the project is later moved to Vercel Pro, a 5-minute Vercel Cron can replace or be used instead of the Supabase schedule; keep only one 5-minute trigger. The handler still dedupes so a double fire does not open a second incident.

### 6.3 Power loss (FR-23, NFR-5)

The firmware **does not** distinguish mains from battery, and v1 adds **no extra hardware sense line** from the adapter. Power-loss notification is the existing `BATT_LOW`, `BATT_CRIT` and `BATT_SENSOR` alerts, plus the server `DEVICE_OFFLINE` alert if the device stops checking in. Do not invent an `ON_BATTERY` event in the API.

### 6.4 Web push flow (C-5, FR-23)

1. An owner accepts notifications in the website. The browser subscribes with the VAPID public key; the subscription is stored in `push_subscriptions`.
2. On ingest of a device `event = start`, or when the offline job opens `DEVICE_OFFLINE`, the server sends a web push to every subscription for that farm's owner. Payload: `{ code, severity, message, device_id, ts, farm_name }` (no secrets).
3. No push for `clear`, `info` / `BOOT`, or for `alert_codes` on a reading (that would duplicate the `start` event).
4. A 410/404 from the push service deletes that subscription.

`clear` events still update the dashboard and close the incident.

## 7. Daily stats

View `daily_stats` ( §2.7 ), grouped by `date(ts at time zone 'Asia/Manila')`. The website (FR-21) can also show "today so far" from the same view. No separate job is required at thesis scale.

## 8. CSV export (FR-22)

Authenticated owner (own farm) or admin. Query params: `farm_id` (or `device_id`), `from`, `to` (dates in Asia/Manila, inclusive). Excel-compatible: UTF-8 with BOM, comma-separated, `
` lines.

Two download options, both from `readings` (null `ts` rows omitted unless the user asks for them):

- **Snapshots:** one row per firmware record, columns matching the CSV the device already writes (`ts,uptime_s,age,setpoint,e_*,c_*,batt_v,fan,lamp,mode,alert_level,alert_codes,reason`).
- **Per compartment:** rows from `compartment_readings` for graphing in Excel.

Route: `GET /api/export.csv` (session auth, not the device key). Cap a single download at a reasonable range (e.g. 90 days) and stream the response.

## 9. Retention

v1 **keeps all rows**. There is no automatic delete. At one reading a minute that is about 525,000 rows a year, which is fine for this project. Revisit a delete-or-summarize policy after handover (C-1 is 2026-11-29), once the group has exported what they need for the paper.

## 10. Configuration and environment

Set these in Vercel (Production and Preview) and in local `web/.env.local` (gitignored). Never commit real values. Prefer the server-only `SUPABASE_*` names for the project URL and publishable key so they are not inlined into the browser bundle; the `NEXT_PUBLIC_SUPABASE_*` names still work as fallbacks. Never put the service-role or VAPID private key in `NEXT_PUBLIC_*`.

| name | where | purpose |
|---|---|---|
| `SUPABASE_URL` | **server only** | project URL, `https://djxhciqoieqryqchuxhn.supabase.co`. `NEXT_PUBLIC_SUPABASE_URL` is still accepted as a fallback |
| `SUPABASE_PUBLISHABLE_KEY` | **server only** | Supabase publishable key used by the cookie server client. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is still accepted as a fallback |
| `SUPABASE_SECRET` | **server only** | service-role key (device routes, cron, admin provisioning) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | browser | web push subscribe |
| `VAPID_PRIVATE_KEY` | **server only** | web push send |
| `VAPID_SUBJECT` | server | `mailto:` contact for the push service |
| `DEVICE_KEY_PEPPER` | **server only** | optional; mixed into `key_hash` |
| `DEVICE_OFFLINE_AFTER_MS` | server | default 12 minutes (`720000`) |
| `CRON_SECRET` | **server only** | Bearer token for `/api/cron/device-offline`. Required. Also stored with the Supabase pg_cron job that calls the route |

Firmware (`config.h`, placeholders only in git): `WIFI_SSID`, `WIFI_PASS`, `API_BASE` (the Vercel origin, no trailing slash), `DEVICE_ID`, `DEVICE_KEY`, optional `API_ROOT_CA`.

## 11. Website (implementation notes)

- **Auth:** Supabase email/password login through a Server Action (`signIn` / `signOut`). The session is stored in cookies and refreshed by Next.js Proxy (`web/proxy.ts`, the Next.js 16 name for middleware). Admin creates the owner user, inserts `profiles`, and can set `disabled_at` (FR-17). `/login` and `/admin` are server-rendered; admin mutations are Server Actions (cookie session required). Leftover `/api/admin/*` routes still accept a Bearer token as a fallback and use the service role only server-side.
- **Dashboard (FR-19, NFR-3):** implemented at `/dashboard` as a Server Component that loads data through `getDashboardData()`: latest snapshot per device, both compartments, fan/lamp, mode, battery, online (`now - last_seen_at` &lt; 12 minutes). Phone-first, 30 s refresh via `router.refresh()` (no browser Supabase client).
- **History (FR-20):** `compartment_readings` charts, date range, Asia/Manila.
- **Alerts:** open incidents plus a log of `start` / `clear` / `info`.
- **FR-24 (optional):** the website writes `device_settings`; the device picks the changes up on the next config GET. The age → °C table itself is not configurable in v2 firmware.
- Firmware `API_BASE` should be pointed at the Vercel deployment once the routes exist.

## 12. Decisions

Decided 2026-11-17 (Asia/Manila):

1. **Offline alert** fires 12 minutes after `last_seen_at`.
2. **Power loss:** no extra mains-vs-battery sense line. Rely on `BATT_LOW` / `BATT_CRIT` / `BATT_SENSOR` plus the offline alert.
3. **Null `ts` readings:** accept rare duplicates rather than drop data. Unique `(device_id, ts, uptime_s)` applies only where `ts is not null` (`uptime_s` also resets on reboot).
4. **Age setpoint table** is display-only in v1. The v2 firmware hardcoded `SP_TABLE` stays in use. The FR-7 last band of days 25–60 at 20°C vs v2 holding 20°C after day 60 is accepted for v1.
5. **Retention:** keep all rows for v1 (about 525,000 readings a year at one per minute). Revisit the policy after handover.

## 13. Open questions

Still open in `REQUIREMENTS.md`:

- Anemometer model.
- Safe-state defaults (FR-10).
- Final price and contract update.

## Change log

Newest first. Times are Asia/Manila (UTC+8).

### 2026-11-21
- Reworked website data access so the browser no longer talks to Supabase: typed server-only helpers, cookie auth with Proxy, a server-rendered dashboard, admin Server Actions, and a lint/build check that keeps supabase-js out of the client bundle.
- Added the live dashboard (FR-19): latest snapshot per farm/device, both compartments, relay states, battery, online status and a `latest_readings` view.
- Added admin provisioning (FR-17/FR-18): login, owner create/disable, farm + device creation with a one-time device key, and device-key rotation.

### 2026-11-20
- Added the local 1602 I2C LCD (FR-25): shares the DS3231 bus, three rotating pages, no control path, missing-LCD retry.

### 2026-11-17
- Closed design questions: 12-minute offline alert, power-loss = low-battery + offline (no extra sense line), accept rare null-`ts` duplicates, display-only setpoint table for v1, keep all rows until after handover.
- First draft: schema, device API matching v2 firmware, alert rules and web push, daily stats, CSV export.
