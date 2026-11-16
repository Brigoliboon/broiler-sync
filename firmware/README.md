# Poultry climate controller - ESP32 firmware v2

Two compartments (experimental + control). The **experimental** compartment has an exhaust fan and a
lamp, both driven from the experimental DHT22 temperature. The control compartment is monitor-only.
Data goes to Boon's database / web app (no Blynk).

Sketch folder: `firmware/` (open `firmware.ino`; the `.h/.cpp` tabs load with it).
Board: **ESP32 Dev Module** (`esp32:esp32:esp32`, core 3.3.x). The old POC is untouched in `poultry_poc/`.

| file | what it does |
|---|---|
| `config.h` | **edit this first**: Wi-Fi / API placeholders, pins, relay polarity, all defaults |
| `firmware.ino` | setup/loop, serial status line, watchdog |
| `sensors.*` | DHT22 x2 (3 retries, NaN/range/frozen detection), anemometer x2, battery |
| `control.*` | age -> setpoint table, fan/lamp rules, brooding guard, safe states, alerts |
| `settings.*` | defaults -> flash cache -> server config (validated), manual override |
| `storage.*` | SD CSV log, RAM fallback, "what is still unsent" pointers |
| `cloud.*` | Wi-Fi, GET config, batched POST + backfill |
| `clock_rtc.*` | DS3231, NTP fallback (UTC+8) |

## Libraries
Adafruit **DHT sensor library** (+ Adafruit Unified Sensor), **ArduinoJson 7.x**, Adafruit **RTClib 2.x**
(+ Adafruit BusIO). `WiFi`, `HTTPClient`, `SD`, `SPI`, `Wire`, `Preferences` come with the ESP32 core.

```
arduino-cli compile --fqbn esp32:esp32:esp32 firmware
```

## Wiring (ESP32 DevKit V1, 30-pin)

| part | pin |
|---|---|
| DHT22 experimental, DATA | D4 (10 k pull-up to 3V3 if bare 4-pin sensor) |
| DHT22 control, DATA | D13 (same) |
| Anemometer experimental, signal | D34 (ADC1) |
| Anemometer control, signal | D32 (ADC1) |
| Voltage sensor (0-25 V, 5:1), S | D35 (ADC1) |
| Relay board IN1 = **exhaust fan** | D27 |
| Relay board IN2 = **lamp** | D26 |
| microSD (SPI) | MOSI D23, MISO D19, SCK D18, CS D5 |
| DS3231 (I2C) | SDA D21, SCL D22 |

* Only ADC1 pins (32-39) are used for analog, because ADC2 does not work while Wi-Fi is on.
* The ESP32 pins are **3.3 V only**. Keep anemometer / voltage-sensor outputs below 3.1 V.
* Relays: `RELAY_ACTIVE_LOW 1` in `config.h` is for the real 4-channel SRD-05VDC board (LOW = ON).
  The Wokwi Grove relay needs `0`.
* Boot glitch: the relay pins are set to OFF first thing in `setup()`, but GPIO levels during the
  first ~second of boot are not controlled by software. If the fan/lamp ever twitch at power-up, add a
  10 k pull-up from each relay IN to the board's VCC (active-low boards).
* In Wokwi the DHT22 never changes by itself, so set `DHT_FROZEN_READS` to 100000 there, or it will
  (correctly) report FROZEN after ~2.5 min.

## Control rules

* **Age (days)** = today (RTC) - flock start date (from server config, cached). `age_override_days`
  from config wins if set. If the clock is bad: last known age (cached daily), else fallback 7 days.
  Either of those two raises the `AGE_UNKNOWN` warning.
* **Setpoint** by age (table in `control.cpp`): day 0 = 30, 1-3 = 28, 4-6 = 27, 7-9 = 26, 10-12 = 25,
  13-15 = 24, 16-18 = 23, 19-21 = 22, 22-24 = 21, 25+ = 20 C.
* **Fan** (experimental DHT22 temperature only; wind never turns it on):
  ON at `T >= setpoint + fan_on_delta` (2.0), OFF at `T <= setpoint + fan_off_delta` (0.5).
* **Brooding airflow guard** (age <= `brood_days`, 14): the fan may run at most `fan_max_on_s` (300 s)
  in a row, then is forced off for `fan_rest_s` (300 s); after the rest it can start again if the
  temperature is still at/above the ON point. The guard is skipped while `T >= setpoint + temp_crit_delta`
  (heat stress beats draught; `GUARD_BYPASS_ON_CRITICAL` in `config.h`).
* **Lamp** (*assumption, to be confirmed with the client*): ON at `T <= setpoint - lamp_on_delta` (1.0),
  OFF at `T >= setpoint + lamp_off_delta` (0.0). Fan and lamp are never on together: if the fan is on or
  wants on, the lamp is forced off.
* **Minimum switch interval** per relay: `min_switch_s` (30 s).
* **Alerts only** (no control action), evaluated for BOTH compartments:
  humidity warning below 50 % or above 70 % (days 0-3: below 60 %); wind warning at >= 0.15 m/s (days 0-14),
  >= 0.30 (15-21), >= 0.50 (22-28), none after day 28 unless `wind_alert_until_days` is extended.
  Experimental temperature: warning at setpoint +/- 3, **critical** at +/- 5. Battery: warning <= 11.8 V,
  **critical** <= 11.0 V. Sensor failures, SD error, clock lost.
  Severity is `ok` / `warning` / `critical`. Conditions are debounced (raise after 0-120 s depending on the
  alert, clear after 120 s) so a value hovering on a threshold does not spam events.
* **Modes.** `AUTO` = the rules above. `MANUAL` = server sends desired fan/lamp for `manual_minutes`
  (default 30); then AUTO resumes. Manual bypasses the brooding guard and sensor rules (the expiry is the safety
  net) but still honours the 30 s relay interval and "fan wins over lamp". The running manual session is cached
  and resumes after a reboot if the clock is valid.

## Safe states (all easy to change)

| situation | behaviour |
|---|---|
| Boot / reset / power loss | Relays OFF at boot, stay OFF until the first valid experimental temperature (or until that sensor is declared failed). RTC keeps the time, cached config is reloaded from flash. |
| **Experimental DHT22 failed** (NaN, out of range -10..60 C / 0..100 %, frozen 30 reads, 3 failed cycles) in AUTO | **Fan low duty cycle: 2 min ON / 8 min OFF** (`SAFE_FAN_ON_S`, `SAFE_FAN_OFF_S`), **lamp OFF**, **CRITICAL** alert `E_TEMP_SENSOR`. Reasoning: some ventilation is safer than none; a lamp with no temperature feedback could overheat chicks. Not applied in MANUAL. |
| Control DHT22 failed | `C_TEMP_SENSOR` **warning** only (nothing is controlled from it). |
| Anemometer disconnected (< 0.1 V for the 0.4 V-offset type) or > 2.5 V | `E_WIND_SENSOR` / `C_WIND_SENSOR` warning, wind shown as null. |
| Wi-Fi lost | Keeps running on cached config, keeps logging to SD, reconnects automatically; when back, uploads everything not yet sent (oldest first, batches of 20). |
| SD missing / write error | `SD_ERROR` warning; records and events go to a RAM ring buffer (60 records, 20 events) and are still uploaded; moved to SD when it comes back (re-mount every 30 s). A reboot loses the RAM buffer. |
| RTC lost power | `RTC_LOST` warning; clock is set from NTP (pool.ntp.org, UTC+8) as soon as Wi-Fi is up and written to the DS3231. Until then records have `ts: null` (use `uptime_s` / server receive time). |
| Firmware hang | Task watchdog (30 s) reboots; relays come up OFF. |
| Battery | volts are reported every record; `BATT_LOW`/`BATT_CRIT` alerts. The firmware does **not** guess mains vs battery (not detectable from one voltage). |
| Server sends bad config | Whole config rejected, previous (cached) one kept. |

## Logging and sync

* **SD:** one line per minute in `/logs/YYYYMMDD.csv` (header + `ts, uptime_s, age, setpoint, e_*, c_*, batt_v, fan, lamp, mode, alert_level, alert_codes, reason`), alert events in `/logs/events.jsonl`, upload pointers in `/logs/sync.txt`.
* **Upload** every 5 min: `POST {API_BASE}/api/readings` with a JSON **array** of the unsent records, and `POST {API_BASE}/api/alerts` with an array of alert events. Alerts are sent first.
* **Immediate upload** (and the 5-min countdown restarts) when an alert **starts or clears**, or a **relay changes**, or manual mode starts/ends. A *sustained* alert is not re-sent every minute: one `start` event, one `clear` event. The minute records still carry `alert_level` / `alert_codes` for charting.
* Server answers 2xx = accepted. 401/403/408/429/5xx/network error = retried every 30 s, nothing is lost. Any other 4xx = batch is dropped (so one bad batch cannot block the queue).
* After a reboot the firmware may repeat a `start` event for an alert that is still active: treat `start` for an already-open alert as a no-op.
* Every request carries headers `x-device-key: <DEVICE_KEY>` and `x-device-id: <DEVICE_ID>`.
* Timestamps are local time with offset, e.g. `2026-11-12T11:48:00+08:00`.

## API payloads

### POST /api/readings  (body = array, oldest first)
`reason` is `interval`, `alert`, `relay` or `mode`. Statuses: `ok`, `no_data`, `range`, `frozen`, `disconnected`, `unknown`.
Numbers are `null` when the sensor is not usable. `e_` = experimental, `c_` = control.
```json
[
  {
    "device_id": "farm-01",
    "ts": "2026-11-12T11:48:00+08:00",
    "uptime_s": 3600,
    "age": 5,
    "setpoint": 27.0,
    "e_temp": 26.4, "e_hum": 63.2, "e_wind": 0.08,
    "e_temp_status": "ok", "e_wind_status": "ok",
    "c_temp": 27.1, "c_hum": 61.0, "c_wind": 0.12,
    "c_temp_status": "ok", "c_wind_status": "ok",
    "batt_v": 12.61,
    "fan": false,
    "lamp": true,
    "mode": "AUTO",
    "alert_level": "warning",
    "alert_codes": ["E_HUM_LOW"],
    "reason": "interval"
  }
]
```

### POST /api/alerts  (body = array)
`event` = `start` | `clear` | `info` (`info` is only `BOOT`, message = reset reason). `value` is the measurement that
triggered it (null if not applicable).
```json
[
  {
    "device_id": "farm-01",
    "ts": "2026-11-12T11:52:00+08:00",
    "uptime_s": 3840,
    "event": "start",
    "code": "E_HUM_LOW",
    "severity": "warning",
    "message": "Experimental humidity too low",
    "value": 47.30,
    "age": 5
  },
  { "device_id": "farm-01", "ts": null, "uptime_s": 4, "event": "info", "code": "BOOT",
    "severity": "ok", "message": "power-on", "value": null, "age": 7 }
]
```
Alert codes: `E_TEMP_SENSOR`(crit) `E_TEMP_HIGH` `E_TEMP_HIGH_CRIT`(crit) `E_TEMP_LOW` `E_TEMP_LOW_CRIT`(crit)
`E_HUM_LOW` `E_HUM_HIGH` `E_WIND_HIGH` `E_WIND_SENSOR` `C_TEMP_SENSOR` `C_HUM_LOW` `C_HUM_HIGH` `C_WIND_HIGH`
`C_WIND_SENSOR` `BATT_LOW` `BATT_CRIT`(crit) `BATT_SENSOR` `SD_ERROR` `RTC_LOST` `AGE_UNKNOWN` (rest are warnings).

### GET /api/devices/{DEVICE_ID}/config  (polled every 5 min)
All keys are optional (missing = keep the current value); an invalid value rejects the whole response.
```json
{
  "flock_start": "2026-11-07",
  "age_override_days": null,
  "mode": "auto",
  "manual_id": 12,
  "manual_fan": true,
  "manual_lamp": false,
  "manual_minutes": 30,
  "fan_on_delta": 2.0,
  "fan_off_delta": 0.5,
  "lamp_on_delta": 1.0,
  "lamp_off_delta": 0.0,
  "temp_warn_delta": 3.0,
  "temp_crit_delta": 5.0,
  "brood_days": 14,
  "fan_max_on_s": 300,
  "fan_rest_s": 300,
  "hum_low": 50, "hum_high": 70, "hum_brood_low": 60, "hum_brood_days": 3,
  "wind_alert_ms": [0.15, 0.30, 0.50],
  "wind_alert_until_days": [14, 21, 28],
  "batt_warn_v": 11.8,
  "batt_crit_v": 11.0,
  "min_switch_s": 30
}
```
* `flock_start` = date of broiler **day 0** (`YYYY-MM-DD`, farm local date). `null` clears it.
* Manual override: send `"mode":"manual"` with a **new `manual_id`** (any integer different from the last one) plus
  `manual_fan` / `manual_lamp` (and optionally `manual_minutes`, 1-1440). The device starts a timed session when it sees a
  new id; the same id seen again later does nothing (so it does not restart every 5 min). `"mode":"auto"` cancels it.
  If both are true, the fan wins.
* Validation: `fan_off_delta` at least 0.5 below `fan_on_delta`; `lamp_off_delta` above `-lamp_on_delta` and below
  `fan_off_delta`; `temp_warn_delta >= fan_on_delta`; `temp_crit_delta >= temp_warn_delta`; humidity `hum_low < hum_high`;
  `batt_crit_v < batt_warn_v`; `min_switch_s` 5-600; etc. (see `settingsValidate()` in `settings.cpp`).

## Anemometer (model not chosen)
Edit `ANEMO_V_MIN / ANEMO_V_MAX / WIND_MAX_MS / ANEMO_V_DISCONNECT / ANEMO_V_OVER` in `config.h`
(default 0.4-2.0 V -> 0-32.4 m/s). Heads-up: with that cup anemometer 0.15 m/s is only ~4 mV above the zero
offset, below ADC noise, and most cup sensors do not even start turning under ~0.3-0.5 m/s. For the 0.15 m/s alert
level pick a hot-wire / low-speed sensor. Wind is smoothed (~2.5 s) before alerting; the raw volts are in
`Compartment.windV` for calibration.

## Not done / open points
* Lamp rule, brooding-guard defaults and safe-state choices are assumptions (see above).
* The default ESP32 partition leaves ~158 KB of flash free. OTA updates would need a bigger partition scheme.
* Not tested on hardware or in Wokwi yet - compile-tested only.
