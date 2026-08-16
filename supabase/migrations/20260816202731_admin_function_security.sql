-- Harden exposed helper functions used by the admin RLS policies.
-- Idempotent: CREATE OR REPLACE, REVOKE and GRANT are safe to re-run.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- These functions are not public RPC entry points. RLS evaluation of the
-- authenticated admin paths still needs the two permission helpers.
revoke execute on function public.handle_new_user() from public;

revoke execute on function public.is_master() from public, anon;
grant execute on function public.is_master() to authenticated;

revoke execute on function public.can_edit(text) from public, anon;
grant execute on function public.can_edit(text) to authenticated;
