-- Age-based temperature setpoints (display-only in v1).
-- Moved here from seed.sql so the rows reach the hosted database;
-- `supabase db push` applies migrations but never runs seed.sql.
-- Bands match firmware/control.cpp SP_TABLE.

insert into public.age_thresholds (from_day, to_day, setpoint_c) values
  (0,  0,    30),
  (1,  3,    28),
  (4,  6,    27),
  (7,  9,    26),
  (10, 12,   25),
  (13, 15,   24),
  (16, 18,   23),
  (19, 21,   22),
  (22, 24,   21),
  (25, null, 20)
on conflict (from_day) do nothing;
