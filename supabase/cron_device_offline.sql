-- DEVICE_OFFLINE schedule (FR-23, DESIGN.md §6.2).
--
-- The Vercel project is on the Hobby plan, which only allows a cron once
-- per day. A daily job is too slow for the 12-minute last_seen_at timeout,
-- so this schedule lives in Supabase: pg_cron every 5 minutes calls the
-- protected route with pg_net.
--
-- Run this in the Supabase SQL editor after you have set CRON_SECRET on
-- the Vercel project (Production and Preview). Replace the two
-- placeholders below. Do not commit the real secret.
--
-- If you later upgrade to Vercel Pro, you can also add a 5-minute cron in
-- vercel.json pointing at GET /api/cron/device-offline (Authorization:
-- Bearer $CRON_SECRET is sent automatically when CRON_SECRET is set).
-- Keep only one 5-minute scheduler so you do not double-fire; the route
-- still dedupes open incidents.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Replace these two values before running.
-- Production origin, no trailing slash.
-- Example: https://broilersync.vercel.app
do $setup$
declare
  cron_url text := 'https://REPLACE_WITH_VERCEL_ORIGIN/api/cron/device-offline';
  cron_secret text := 'REPLACE_WITH_CRON_SECRET';
begin
  if cron_url like '%REPLACE_WITH_VERCEL_ORIGIN%' or cron_secret like '%REPLACE_WITH_CRON_SECRET%' then
    raise exception 'Replace REPLACE_WITH_VERCEL_ORIGIN and REPLACE_WITH_CRON_SECRET before scheduling';
  end if;

  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'device-offline-check';

  perform cron.schedule(
    'device-offline-check',
    '*/5 * * * *',
    format(
      $cmd$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || %L,
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
      $cmd$,
      cron_url,
      cron_secret
    )
  );
end;
$setup$;
