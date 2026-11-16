# CI/CD

GitHub Actions runs on pull requests and on pushes to `main`. A path filter skips jobs whose folders did not change. In-progress runs for the same ref are cancelled when a newer run starts.

## Jobs

- **changes**: decides whether the web and firmware jobs are needed. A change to `.github/workflows/ci.yml` runs both.
- **web** (when `web/` or the workflow file changes): in `web/`, Node 22, `npm ci`, `npm run lint`, `npx next typegen` then `npx tsc --noEmit`, and `npm run build`. The npm cache is keyed on `web/package-lock.json`. `next typegen` is required because `next-env.d.ts` is gitignored.
- **firmware** (when `firmware/` or the workflow file changes): installs the ESP32 core from the Espressif board index and pinned Arduino libraries (DHT sensor library 1.4.7, Adafruit Unified Sensor 1.1.15, ArduinoJson 7.4.3, RTClib 2.1.4, Adafruit BusIO 1.17.4), then compiles `firmware` and `firmware/prototype` with `fqbn esp32:esp32:esp32`.
- **ci-ok**: always runs. It fails if a required job failed, was cancelled, or was skipped when it should have run. It passes when the needed jobs passed, including when both web and firmware were correctly skipped.

## Required check

Protect `main` by requiring the **`ci-ok`** check, not the individual web or firmware jobs. Those are skipped on PRs that do not touch their paths, so a required check on `web` or `firmware` would block merge.

Vercel (web) and Supabase (database) deploy checks are not wired up yet.
