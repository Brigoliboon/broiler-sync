-- One latest snapshot per device for the dashboard (FR-19).
-- security_invoker keeps the readings RLS policy in force.

create or replace view public.latest_readings
with (security_invoker = true) as
select distinct on (device_id) r.*
from public.readings r
order by r.device_id, r.ts desc nulls last, r.id desc;

revoke all on public.latest_readings from anon;
grant select on public.latest_readings to authenticated;
grant all on public.latest_readings to service_role;
