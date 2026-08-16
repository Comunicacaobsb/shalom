-- Admin hub security hardening.
-- Idempotent: removes permissive policies from the original setup and gates
-- drafts/storage writes by the existing public.can_edit(site) function.
-- Does not touch event_* registration tables.

-- Authenticated readers may see published events, while drafts are visible
-- only to an editor authorized for that page (or a master).
drop policy if exists "events_auth_read" on public.events;
drop policy if exists "events_authenticated_read_scoped" on public.events;
create policy "events_authenticated_read_scoped" on public.events
  for select to authenticated
  using (
    (
      published = true
      and (publish_at is null or publish_at <= now())
      and (unpublish_at is null or unpublish_at > now())
    )
    or public.can_edit(site)
  );

-- Defensive cleanup in case the original setup was reapplied.
drop policy if exists "sites_auth_write" on public.sites;
drop policy if exists "events_auth_write" on public.events;
drop policy if exists "settings_auth_write" on public.settings;
drop policy if exists "eventos_auth_write" on storage.objects;

-- Keep writes explicit and page-scoped. The policy names are unique so this
-- migration can be safely re-run after a branch reset or a manual setup.
drop policy if exists "sites_master_write" on public.sites;
create policy "sites_master_write" on public.sites
  for all to authenticated
  using (public.is_master())
  with check (public.is_master());

drop policy if exists "events_edit_write" on public.events;
create policy "events_edit_write" on public.events
  for all to authenticated
  using (public.can_edit(site))
  with check (public.can_edit(site));

drop policy if exists "settings_edit_write" on public.settings;
create policy "settings_edit_write" on public.settings
  for all to authenticated
  using (public.can_edit(site))
  with check (public.can_edit(site));

-- Storage paths are written as <site>/<filename>. Editors can only upload,
-- replace, or delete assets under a page they can edit. Public reads remain
-- available for the published site assets; draft event records themselves are
-- protected by the events policy above.
drop policy if exists "eventos_public_read" on storage.objects;
create policy "eventos_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'eventos');

drop policy if exists "eventos_edit_write" on storage.objects;
create policy "eventos_edit_write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'eventos'
    and public.can_edit(split_part(name, '/', 1))
  )
  with check (
    bucket_id = 'eventos'
    and public.can_edit(split_part(name, '/', 1))
  );
