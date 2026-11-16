-- BroilerSync initial schema, views, helpers and RLS.
-- Matches docs/DESIGN.md (FR-17, FR-18, NFR-4).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'owner' check (role in ('owner', 'admin')),
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now()
);

create index farms_owner_id_idx on public.farms (owner_id);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null unique references public.farms (id) on delete restrict,
  device_id text not null unique,
  key_hash text not null,
  last_seen_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.compartments (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  slug text not null check (slug in ('experimental', 'control')),
  name text,
  unique (farm_id, slug)
);

create table public.readings (
  id bigserial primary key,
  device_id text not null references public.devices (device_id) on delete restrict,
  ts timestamptz,
  uptime_s integer not null,
  age integer,
  setpoint numeric,
  e_temp numeric,
  e_hum numeric,
  e_wind numeric,
  e_temp_status text check (e_temp_status in ('ok', 'no_data', 'range', 'frozen', 'disconnected', 'unknown')),
  e_wind_status text check (e_wind_status in ('ok', 'no_data', 'range', 'frozen', 'disconnected', 'unknown')),
  c_temp numeric,
  c_hum numeric,
  c_wind numeric,
  c_temp_status text check (c_temp_status in ('ok', 'no_data', 'range', 'frozen', 'disconnected', 'unknown')),
  c_wind_status text check (c_wind_status in ('ok', 'no_data', 'range', 'frozen', 'disconnected', 'unknown')),
  batt_v numeric,
  fan boolean not null,
  lamp boolean not null,
  mode text not null check (mode in ('AUTO', 'MANUAL')),
  alert_level text not null check (alert_level in ('ok', 'warning', 'critical')),
  alert_codes text[] not null default '{}',
  reason text check (reason in ('interval', 'alert', 'relay', 'mode')),
  received_at timestamptz not null default now()
);

create index readings_device_ts_idx on public.readings (device_id, ts desc);
create unique index readings_device_ts_uptime_uidx
  on public.readings (device_id, ts, uptime_s)
  where ts is not null;

create table public.alerts (
  id bigserial primary key,
  device_id text not null references public.devices (device_id) on delete restrict,
  ts timestamptz,
  uptime_s integer,
  event text not null check (event in ('start', 'clear', 'info')),
  code text not null,
  severity text not null check (severity in ('ok', 'warning', 'critical')),
  message text,
  value numeric,
  age integer,
  received_at timestamptz not null default now(),
  source text not null check (source in ('device', 'server'))
);

create index alerts_device_ts_idx on public.alerts (device_id, ts desc);
create unique index alerts_device_ts_event_code_uidx
  on public.alerts (device_id, ts, event, code)
  where ts is not null;

create table public.age_thresholds (
  from_day integer primary key,
  to_day integer,
  setpoint_c numeric not null
);

create table public.device_settings (
  device_id text primary key references public.devices (device_id) on delete cascade,
  flock_start date,
  age_override_days integer,
  mode text not null default 'auto' check (mode in ('auto', 'manual')),
  fan_on_delta numeric not null default 2.0,
  fan_off_delta numeric not null default 0.5,
  lamp_on_delta numeric not null default 1.0,
  lamp_off_delta numeric not null default 0.0,
  temp_warn_delta numeric not null default 3.0,
  temp_crit_delta numeric not null default 5.0,
  brood_days integer not null default 14,
  fan_max_on_s integer not null default 300,
  fan_rest_s integer not null default 300,
  hum_low numeric not null default 50,
  hum_high numeric not null default 70,
  hum_brood_low numeric not null default 60,
  hum_brood_days integer not null default 3,
  wind_alert_ms numeric[] not null default '{0.15, 0.30, 0.50}',
  wind_alert_until_days integer[] not null default '{14, 21, 28}',
  batt_warn_v numeric not null default 11.8,
  batt_crit_v numeric not null default 11.0,
  min_switch_s integer not null default 30,
  manual_minutes integer not null default 30,
  manual_id integer not null default 0,
  manual_fan boolean not null default false,
  manual_lamp boolean not null default false,
  updated_at timestamptz not null default now(),
  check (cardinality(wind_alert_ms) = 3),
  check (cardinality(wind_alert_until_days) = 3)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS helpers (after tables they reference)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and disabled_at is null
  );
$$;

create or replace function public.is_active_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
      and disabled_at is null
  );
$$;

create or replace function public.owns_farm(p_farm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.farms f
    where f.id = p_farm_id
      and f.owner_id = auth.uid()
      and public.is_active_owner()
  );
$$;

create or replace function public.owns_device(p_device_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.devices d
    join public.farms f on f.id = d.farm_id
    where d.device_id = p_device_id
      and f.owner_id = auth.uid()
      and public.is_active_owner()
  );
$$;

-- ---------------------------------------------------------------------------
-- Views (security_invoker so underlying table RLS applies; views cannot have RLS)
-- ---------------------------------------------------------------------------

create view public.compartment_readings
with (security_invoker = true) as
select
  r.id,
  r.device_id,
  r.ts,
  r.uptime_s,
  r.age,
  r.setpoint,
  'experimental'::text as compartment_slug,
  r.e_temp as temp,
  r.e_hum as hum,
  r.e_wind as wind,
  r.e_temp_status as temp_status,
  r.e_wind_status as wind_status,
  r.batt_v,
  r.fan,
  r.lamp,
  r.mode,
  r.alert_level,
  r.alert_codes,
  r.reason,
  r.received_at
from public.readings r
union all
select
  r.id,
  r.device_id,
  r.ts,
  r.uptime_s,
  r.age,
  r.setpoint,
  'control'::text,
  r.c_temp,
  r.c_hum,
  r.c_wind,
  r.c_temp_status,
  r.c_wind_status,
  r.batt_v,
  r.fan,
  r.lamp,
  r.mode,
  r.alert_level,
  r.alert_codes,
  r.reason,
  r.received_at
from public.readings r;

create view public.daily_stats
with (security_invoker = true) as
select
  device_id,
  compartment_slug,
  (ts at time zone 'Asia/Manila')::date as day,
  min(temp) as temp_min,
  max(temp) as temp_max,
  avg(temp) as temp_avg,
  min(hum) as hum_min,
  max(hum) as hum_max,
  avg(hum) as hum_avg,
  min(wind) as wind_min,
  max(wind) as wind_max,
  avg(wind) as wind_avg,
  count(*)::integer as reading_count
from public.compartment_readings
where ts is not null
group by device_id, compartment_slug, (ts at time zone 'Asia/Manila')::date;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger device_settings_set_updated_at
  before update on public.device_settings
  for each row execute function public.set_updated_at();

-- Owners may update their name, not role or disabled_at. Admin may update all.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role
       or new.disabled_at is distinct from old.disabled_at
       or new.id is distinct from old.id then
      raise exception 'not allowed to change role or disabled_at';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'User'),
    'owner'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.farms_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.compartments (farm_id, slug, name) values
    (new.id, 'experimental', 'Experimental'),
    (new.id, 'control', 'Control');
  return new;
end;
$$;

create trigger farms_after_insert
  after insert on public.farms
  for each row execute function public.farms_after_insert();

create or replace function public.devices_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.device_settings (device_id) values (new.device_id);
  return new;
end;
$$;

create trigger devices_after_insert
  after insert on public.devices
  for each row execute function public.devices_after_insert();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.is_admin() from public;
revoke all on function public.is_active_owner() from public;
revoke all on function public.owns_farm(uuid) from public;
revoke all on function public.owns_device(text) from public;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_active_owner() to authenticated, service_role;
grant execute on function public.owns_farm(uuid) to authenticated, service_role;
grant execute on function public.owns_device(text) to authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- profiles: owners update name; admin updates all (guard trigger blocks role changes)
grant select, insert, update, delete on public.profiles to authenticated;

grant select, insert, update, delete on public.farms to authenticated;
grant select, insert, update, delete on public.compartments to authenticated;

-- devices: owners must not read key_hash (column privilege). Admin writes use RLS.
grant select (id, farm_id, device_id, last_seen_at, disabled_at, created_at)
  on public.devices to authenticated;
grant insert, update, delete on public.devices to authenticated;

grant select on public.readings to authenticated;
grant select on public.alerts to authenticated;
grant select on public.age_thresholds to authenticated;
grant insert, update, delete on public.age_thresholds to authenticated;

grant select, update on public.device_settings to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

grant select on public.compartment_readings to authenticated;
grant select on public.daily_stats to authenticated;

grant usage, select on all sequences in schema public to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.farms enable row level security;
alter table public.devices enable row level security;
alter table public.compartments enable row level security;
alter table public.readings enable row level security;
alter table public.alerts enable row level security;
alter table public.age_thresholds enable row level security;
alter table public.device_settings enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated
  using (public.is_admin() or (id = auth.uid() and disabled_at is null));

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using (public.is_admin() or (id = auth.uid() and disabled_at is null))
  with check (public.is_admin() or (id = auth.uid() and disabled_at is null));

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- farms: writes admin-only in v1
create policy farms_select on public.farms
  for select to authenticated
  using (public.is_admin() or public.owns_farm(id) or (owner_id = auth.uid() and public.is_active_owner()));

create policy farms_insert on public.farms
  for insert to authenticated
  with check (public.is_admin());

create policy farms_update on public.farms
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy farms_delete on public.farms
  for delete to authenticated
  using (public.is_admin());

-- devices
create policy devices_select on public.devices
  for select to authenticated
  using (public.is_admin() or public.owns_farm(farm_id));

create policy devices_insert on public.devices
  for insert to authenticated
  with check (public.is_admin());

create policy devices_update on public.devices
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy devices_delete on public.devices
  for delete to authenticated
  using (public.is_admin());

-- compartments
create policy compartments_select on public.compartments
  for select to authenticated
  using (public.is_admin() or public.owns_farm(farm_id));

create policy compartments_insert on public.compartments
  for insert to authenticated
  with check (public.is_admin());

create policy compartments_update on public.compartments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy compartments_delete on public.compartments
  for delete to authenticated
  using (public.is_admin());

-- readings / alerts: no client writes (service role bypasses RLS)
create policy readings_select on public.readings
  for select to authenticated
  using (public.is_admin() or public.owns_device(device_id));

create policy alerts_select on public.alerts
  for select to authenticated
  using (public.is_admin() or public.owns_device(device_id));

-- age_thresholds: any active user may read; admin writes
create policy age_thresholds_select on public.age_thresholds
  for select to authenticated
  using (public.is_admin() or public.is_active_owner());

create policy age_thresholds_insert on public.age_thresholds
  for insert to authenticated
  with check (public.is_admin());

create policy age_thresholds_update on public.age_thresholds
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy age_thresholds_delete on public.age_thresholds
  for delete to authenticated
  using (public.is_admin());

-- device_settings: owner may update own device; no client insert/delete
create policy device_settings_select on public.device_settings
  for select to authenticated
  using (public.is_admin() or public.owns_device(device_id));

create policy device_settings_update on public.device_settings
  for update to authenticated
  using (public.is_admin() or public.owns_device(device_id))
  with check (public.is_admin() or public.owns_device(device_id));

-- push_subscriptions: own rows only
create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated
  using (owner_id = auth.uid() and public.is_active_owner());

create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated
  with check (owner_id = auth.uid() and public.is_active_owner());

create policy push_subscriptions_update on public.push_subscriptions
  for update to authenticated
  using (owner_id = auth.uid() and public.is_active_owner())
  with check (owner_id = auth.uid() and public.is_active_owner());

create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated
  using (owner_id = auth.uid() and public.is_active_owner());
