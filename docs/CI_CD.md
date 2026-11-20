# CI/CD

GitHub Actions runs on pull requests and on pushes to `main`. A path filter skips jobs whose folders did not change. In-progress runs for the same ref are cancelled when a newer run starts.

## Jobs

- **changes**: decides whether the web, firmware and supabase jobs are needed. A change to `.github/workflows/ci.yml` runs all three.
- **web** (when `web/` or the workflow file changes): in `web/`, Node 22, `npm ci`, `npm run lint`, `npm test`, `npx next typegen` then `npx tsc --noEmit`, and `npm run build`. The npm cache is keyed on `web/package-lock.json`. `next typegen` is required because `next-env.d.ts` is gitignored.
- **firmware** (when `firmware/` or the workflow file changes): installs the ESP32 core from the Espressif board index and pinned Arduino libraries (DHT sensor library 1.4.7, Adafruit Unified Sensor 1.1.15, ArduinoJson 7.4.3, RTClib 2.1.4, Adafruit BusIO 1.17.4), then compiles `firmware` and `firmware/prototype` with `fqbn esp32:esp32:esp32`.
- **supabase** (when `supabase/` or the workflow file changes): starts a local Postgres 17 database with the Supabase CLI, runs `supabase db reset` (applies `supabase/migrations/` and `supabase/seed.sql`), then `supabase db lint`.
- **ci-ok**: always runs. It fails if a required job failed, was cancelled, or was skipped when it should have run. It passes when the needed jobs passed, including when web, firmware and supabase were correctly skipped.

## Deploy: database migrations

The `db-migrate` workflow runs `supabase db push --remote --yes` against the hosted project `djxhciqoieqryqchuxhn` when `supabase/migrations/**` is pushed to `main`, and can also be started by hand (`workflow_dispatch`). A concurrency group named `db-migrate` prevents overlapping pushes (`cancel-in-progress` is off, so a running apply is not cancelled).

Required GitHub secrets (Settings → Secrets and variables → Actions):

- `SUPABASE_ACCESS_TOKEN` — a Supabase personal access token
- `SUPABASE_DB_PASSWORD` — the project's database password

Do not put these values in the repo or in chat. The workflow will fail on merge until both secrets are set.

## Required check

Protect `main` by requiring the **`ci-ok`** check, not the individual web, firmware or supabase jobs. Those are skipped on PRs that do not touch their paths, so a required check on any of them would block merge.

Vercel preview and production deploys are already connected for `web/`.
