# AGENTS.md

Rules for any agent or person working in this repo.

## Project
BroilerSync: ESP32 climate monitoring and fan/lamp control for a two-compartment broiler house, with a Next.js + Supabase website for live data, history, alerts and export.

## Source of truth
`REQUIREMENTS.md` says what to build; `IMPLEMENTATION.md` says the order. If something isn't in either, ask Boon before building it.

## Layout
- `firmware/`: main ESP32 sketch (`firmware.ino` plus modules). Arduino needs the `.ino` name to match its folder.
- `firmware/prototype/`: single-file copy for the Wokwi simulator. Keep it in sync when firmware logic changes.
- `web/`: Next.js app (added in M3).
- `supabase/migrations/`: every database change, as a migration.
- `docs/`: design, guides, parts list; `docs/images/` for diagrams.

## Stack (fixed)
- Firmware: Arduino C++ for ESP32 DevKit V1; libraries Adafruit DHT, Adafruit Unified Sensor, ArduinoJson 7, RTClib, SD.
- Web: Next.js (App Router, TypeScript) on Vercel.
- Database and auth: Supabase with Row Level Security on every table.
- Alerts: web push only.

## Build loop
1. Pick the first unchecked item in the current milestone of `IMPLEMENTATION.md`.
2. Branch off `main`: `feat/<milestone>-<short-name>`, `fix/...`, `docs/...`, `ci/...`.
3. Make the smallest change that completes it, with tests where possible.
4. Run checks: lint, type-check, tests and build for `web/`; `arduino-cli compile` for `firmware/`.
5. Open a PR into `main`. Tick the item and add a progress log line in the same PR.
6. Boon reviews and merges. Never push to `main` directly.

## Commits and PRs
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`, `refactor:`.
- PR description: What / Covers (FR ids, milestone) / Tests / Notes.
- Never commit secrets (Wi-Fi passwords, `DEVICE_KEY`, Supabase keys). `config.h` keeps placeholders only (`YOUR_WIFI`, `change-me`); put real values in your local copy and never commit them.
- Never merge, deploy or delete branches without Boon's go-ahead.

## Firmware rules
- Relays are active LOW on hardware (SRD-05VDC board) and active HIGH in the Wokwi simulator, set by `RELAY_ACTIVE_LOW` in `config.h`. Boot with every relay off.
- Never act on a reading flagged as a fault.
- Control must keep working with no internet.
- Pin changes go in `config.h` and the pin diagram together.

## Web rules
- Database changes only through `supabase/migrations/`.
- Only `NEXT_PUBLIC_*` values reach the browser; the service-role key never does.
- Device endpoints check the per-device key.
