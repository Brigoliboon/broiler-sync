# BroilerSync: Requirements

Client project for a student thesis group: *IoT-Based Environmental Monitoring and Automated Ventilation System for Broiler Housing*.

## 1. Overview

BroilerSync monitors and controls the climate in a broiler house with two compartments, an **experimental** one and a **control** one. An ESP32 reads temperature, humidity and air speed in both, runs a 12V fan and a lamp in the experimental compartment, logs to a microSD card, and syncs to a Supabase database. A 1602 I2C LCD shows the current readings and relay state locally. A Next.js website shows live and historical data, sends web push alerts, and exports the data for the group's paper.

**Users:** the thesis group (farm owners/operators of the setup) and Boon as admin.

## 2. Problem

Broiler chicks need temperature, humidity and airflow that change with their age. Checking by hand is slow and misses problems at night or during outages, and the group needs clean, comparable data from both compartments for their paper.

## 3. Goal

Keep the experimental compartment at the right temperature for the birds' age automatically, alert on bad conditions, and record both compartments reliably, even through power and Wi-Fi outages.

## 4. Objectives

1. Measure temperature, humidity and air speed in both compartments.
2. Control the fan (and lamp) in the experimental compartment from age-based setpoints.
3. Never lose data: local SD log plus cloud sync with backfill.
4. Alert the owner on out-of-range readings, sensor faults and outages.
5. Give the group daily summaries and exportable data for their paper.

## 5. Scope

**In scope**
- ESP32 firmware (Arduino C++).
- 1602 I2C LCD for local live readings and status.
- Supabase database and device endpoints.
- Next.js website: dashboard, history, alerts, export, admin.
- 12V power with battery backup and automatic switchover; protective enclosure.
- Wiring and pin diagrams, a short operating and troubleshooting manual, sensor documentation for the paper's appendices, installation photos and a demo.

**Out of scope**
- SMS, Telegram or Messenger alerts (web push only).
- Blynk or any third-party IoT dashboard.
- A native mobile app.
- Mains (220V) wiring work, which needs a licensed electrician.
- Livestock losses (see the service agreement).

## 6. Functional requirements

### 6.1 Sensing (firmware)
- FR-1: Read a DHT22 (temperature and humidity) in each compartment: experimental on D4, control on D13.
- FR-2: Read an anemometer in each compartment: experimental on D34, control on D32. The model is not final; the input stays analog so it can be swapped.
- FR-3: Read battery voltage on D35.
- FR-4: Keep time with a DS3231 real-time clock (I2C on D21/D22).
- FR-5: Detect sensor faults (disconnected, faulty, invalid or out-of-range readings) and flag them instead of acting on them.

### 6.2 Control (firmware)
- FR-6: Fan (experimental compartment only, relay IN1 on D27) runs on temperature only, against an age-based setpoint with hysteresis so the relay doesn't chatter.
- FR-7: Age-based temperature targets: day 0 30°C, days 1-3 28°C, 4-6 27°C, 7-9 26°C, 10-12 25°C, 13-15 24°C, 16-18 23°C, 19-21 22°C, 22-24 21°C, 25-60 20°C.
- FR-8: Lamp (experimental compartment only, relay IN2 on D26) turns on when the experimental temperature is at least 1.0°C below the age-based setpoint, and turns off at or above the setpoint (defaults: `lampOnDelta` 1.0, `lampOffDelta` 0.0, overridable from cached server config). The fan and lamp are never on together: if the fan is on or wants on, the lamp is forced off.
- FR-9: Manual and auto modes. A manual override runs for a set time, then auto resumes.
- FR-10: Fail-safe behavior on sensor failure, power loss and Wi-Fi loss, with defaults that protect the birds. The fan must not push strong air at chick level during brooding.
- FR-11: Relays are on the client's 4-channel 5V board, active LOW on hardware (set by `RELAY_ACTIVE_LOW`; the simulator uses active HIGH).
- FR-12: Thresholds and settings are cached on the ESP32 so control works offline.

### 6.3 Data and sync (firmware + backend)
- FR-13: Log every reading to microSD every 1 minute.
- FR-14: Sync to the database every 5 minutes. A warning or critical reading syncs immediately and resets the countdown.
- FR-15: Backfill unsent readings from SD when the connection returns, without duplicates.
- FR-16: Devices authenticate to the API with a per-device key.

### 6.4 Website
- FR-17: Admin creates and disables owner accounts.
- FR-18: An owner can have several farms; one ESP32 per farm.
- FR-19: Dashboard for both compartments: live temperature, humidity, air speed, fan and lamp state, mode, ESP32 online status and battery level.
- FR-20: History graphs per compartment.
- FR-21: Daily minimum, maximum and average per reading per compartment.
- FR-22: CSV export (Excel-compatible) for a chosen date range.
- FR-23: Web push alerts for:
  - humidity below 50% or above 70% (target 60-70% for days 0-3, 50-70% from day 4);
  - air speed at or above 0.15 m/s (days 0-14), 0.30 m/s (days 15-21), 0.50 m/s (days 22-28);
  - temperature outside the setpoint band;
  - sensor fault, low battery (`BATT_LOW`, `BATT_CRIT`, `BATT_SENSOR`) and device offline. There is no separate mains-vs-battery sense line; those alerts are the power-loss notification.
- FR-24 (optional, "only if possible"): change setpoints, flock start date and mode from the website.

### 6.5 Local display (firmware)
- FR-25: Show live status on a 1602 character LCD with an I2C backpack (RoHS-compliant). It shares the DS3231 I2C bus (D21/D22) and rotates three pages: compartment readings, fan/lamp/mode/battery/alert, and age/setpoint/SD/Wi-Fi. A missing LCD must not stop control, logging or sync.

## 7. Non-functional requirements

- NFR-1: No data loss across power or Wi-Fi outages of at least 24 hours (SD buffer).
- NFR-2: Control keeps running with no internet.
- NFR-3: The dashboard works on a phone.
- NFR-4: Row Level Security on every table; the service-role key never reaches the browser.
- NFR-5: The system runs on the battery long enough to send a low-battery alert, or to be detected as offline (12 minutes after last contact).

## 8. Constraints

- C-1: Deadline 2026-11-29.
- C-2: Fee ₱10,000 labor (price still under negotiation); the group pays for parts and hosting.
- C-3: Hardware: ESP32 DevKit V1, 2 DHT22, 2 anemometers, Delta FFC1212DE 12V fan, 4-channel 5V relay board, microSD, DS3231, 1602 I2C LCD (RoHS), 12V supply, battery, switchover module, buck to 5V, IP65 enclosure.
- C-4: Stack: Arduino C++ firmware, Next.js on Vercel, Supabase.
- C-5: Web push only for alerts.

## 9. Data privacy

- Personal data is limited to owner accounts (name, email). Sensor data is not personal.
- The group may use the exported data in their paper and cite Boon.

## 10. Known risks

- Cup anemometers usually can't read below about 0.3-0.5 m/s, so the 0.15 m/s alert may not be detectable. A hot-wire sensor (for example Modern Device Wind Sensor Rev P) is the suggested option.
- DHT22 readings fail occasionally; FR-5 handles that.
- Parts arriving late push M5.

## 11. Open questions

- Anemometer model.
- Safe-state defaults (FR-10).
- Final price and contract update.

## 12. Change log

Newest first. Times are Asia/Manila (UTC+8).

### 2026-11-20
- Added FR-25: 1602 I2C LCD (RoHS) for local live readings and status, sharing the DS3231 I2C bus. Missing LCD must not affect control, logging or sync.
- Added the LCD to C-3 and the in-scope list.

### 2026-11-17
- FR-23 / NFR-5: power-loss notification is low-battery alerts plus device offline (12 minutes after last contact). No extra mains sense line.
- FR-8 recorded from the v2 firmware: lamp on at 1.0°C below the setpoint, off at the setpoint, never on with the fan. Lamp rule and AC vs 12V dropped from open questions.
- First draft from the client's scope doc (Nov 12) and the decisions in the project notes. Project named BroilerSync.
