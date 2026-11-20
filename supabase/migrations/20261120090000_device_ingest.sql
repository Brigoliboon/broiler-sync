-- Idempotent device ingest for the Next.js route handlers (FR-14, FR-15).
-- The route validates and filters each item; these functions only touch the DB.
-- Called with the service role, never from the browser.

create or replace function public.ingest_readings(p_device_id text, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.readings (
      device_id,
      ts,
      uptime_s,
      age,
      setpoint,
      e_temp,
      e_hum,
      e_wind,
      e_temp_status,
      e_wind_status,
      c_temp,
      c_hum,
      c_wind,
      c_temp_status,
      c_wind_status,
      batt_v,
      fan,
      lamp,
      mode,
      alert_level,
      alert_codes,
      reason
    ) values (
      p_device_id,
      (item->>'ts')::timestamptz,
      (item->>'uptime_s')::integer,
      (item->>'age')::integer,
      (item->>'setpoint')::numeric,
      (item->>'e_temp')::numeric,
      (item->>'e_hum')::numeric,
      (item->>'e_wind')::numeric,
      item->>'e_temp_status',
      item->>'e_wind_status',
      (item->>'c_temp')::numeric,
      (item->>'c_hum')::numeric,
      (item->>'c_wind')::numeric,
      item->>'c_temp_status',
      item->>'c_wind_status',
      (item->>'batt_v')::numeric,
      (item->>'fan')::boolean,
      (item->>'lamp')::boolean,
      item->>'mode',
      item->>'alert_level',
      case
        when item ? 'alert_codes' then array(
          select jsonb_array_elements_text(item->'alert_codes')
        )
        else '{}'::text[]
      end,
      item->>'reason'
    )
    on conflict (device_id, ts, uptime_s) where ts is not null do nothing;
  end loop;
end;
$$;

create or replace function public.ingest_alerts(p_device_id text, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.alerts (
      device_id,
      ts,
      uptime_s,
      event,
      code,
      severity,
      message,
      value,
      age,
      source
    ) values (
      p_device_id,
      (item->>'ts')::timestamptz,
      (item->>'uptime_s')::integer,
      item->>'event',
      item->>'code',
      item->>'severity',
      item->>'message',
      (item->>'value')::numeric,
      (item->>'age')::integer,
      'device'
    )
    on conflict (device_id, ts, event, code) where ts is not null do nothing;
  end loop;
end;
$$;

revoke all on function public.ingest_readings(text, jsonb) from public;
revoke all on function public.ingest_alerts(text, jsonb) from public;
revoke all on function public.ingest_readings(text, jsonb) from anon, authenticated;
revoke all on function public.ingest_alerts(text, jsonb) from anon, authenticated;

grant execute on function public.ingest_readings(text, jsonb) to service_role;
grant execute on function public.ingest_alerts(text, jsonb) to service_role;
