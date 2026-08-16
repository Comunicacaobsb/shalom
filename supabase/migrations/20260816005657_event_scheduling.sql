-- Agenda de publicação dos eventos do painel.
-- NULL significa sem limite. A coluna publicada continua sendo o interruptor
-- manual; as datas permitem preparar inclusão e retirada sem deploy.
alter table public.events
  add column if not exists publish_at timestamptz,
  add column if not exists unpublish_at timestamptz;

alter table public.events
  drop constraint if exists events_publish_window_check;

alter table public.events
  add constraint events_publish_window_check
  check (publish_at is null or unpublish_at is null or unpublish_at > publish_at);

create index if not exists events_publication_window_idx
  on public.events (site, published, publish_at, unpublish_at, position);

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
  for select to anon
  using (
    published = true
    and (publish_at is null or publish_at <= now())
    and (unpublish_at is null or unpublish_at > now())
  );
