-- Allow the admin API (service role) to disable owners and set roles.
-- Authenticated admins still go through is_admin(); RLS still blocks anon/owner writes.

create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() is not null
     and (new.role is distinct from old.role
       or new.disabled_at is distinct from old.disabled_at
       or new.id is distinct from old.id)
  then
    raise exception 'not allowed to change role or disabled_at';
  end if;

  return new;
end;
$$;
