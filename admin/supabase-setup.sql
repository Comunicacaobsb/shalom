-- =====================================================================
--  Comunidade Shalom Brasília — Setup do Supabase (repo-wide)
--  Cole este arquivo INTEIRO no Supabase → SQL Editor → New query → Run.
--  Cria as tabelas com escopo por página (site), o RLS e o bucket de imagens.
-- =====================================================================

-- ---------- Páginas editáveis (registre aqui cada página nova) ----------
create table if not exists public.sites (
  id         text primary key,          -- ex.: 'asasul', 'taguatinga', 'santamaria'
  name       text not null,
  created_at timestamptz not null default now()
);

insert into public.sites (id, name) values
  ('asasul',     'Shalom Asa Sul'),
  ('taguatinga', 'Shalom Taguatinga'),
  ('santamaria', 'Shalom Santa Maria')
on conflict (id) do nothing;

-- ---------- EVENTOS (por página) ----------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  site        text not null references public.sites(id) default 'asasul',
  slug        text not null,                  -- vai na URL: evento.html?id=slug
  title       text not null,
  badge       text,
  date_text   text,
  location    text,
  image_url   text,
  summary     text,                           -- texto curto do card
  description text,                           -- texto longo (HTML) da página do evento
  link_text   text,
  link_url    text,
  published   boolean not null default true,
  position    int not null default 0,
  updated_at  timestamptz not null default now(),
  unique (site, slug)                         -- slug único por página
);
create index if not exists events_site_idx on public.events (site, published, position);

-- ---------- CONFIGURAÇÕES (horários e seções, por página) ----------
create table if not exists public.settings (
  site       text not null references public.sites(id),
  key        text not null,                   -- ex.: 'schedules'
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (site, key)
);

-- Horários iniciais da Asa Sul (edite depois pelo painel /admin)
insert into public.settings (site, key, value)
values ('asasul', 'schedules', '{
  "funcionamento": ["Segunda a sábado: 14h às 22h"],
  "missa":         ["Segunda e sexta: 18h", "Sábado e domingo: 17h", "2ª terça: Missa pelas Famílias", "4ª quinta: Missa da Misericórdia"],
  "grupos":        ["Casais: terça às 20h", "Amare (aberto): quinta às 19h30", "Kyrios (16 a 23 anos): sábado às 15h"],
  "adoracao":      ["Capela Kyrios — Santíssimo exposto 24 horas"],
  "servicos":      ["Quarta: 19h30 às 21h", "Sexta: 17h", "Sábado: 16h", "Domingo: após a missa das 17h"],
  "aconselhamento":["Quinta: 14h30 às 21h", "Ou agende pelo link: https://forms.gle/fnbLoKrEtNMw5D5y8"]
}'::jsonb)
on conflict (site, key) do nothing;

-- =====================================================================
--  SEGURANÇA (Row Level Security)
--  Visitante LÊ (eventos publicados + configurações). Só logado ESCREVE.
--  (Níveis de acesso por página entram num próximo passo, com tabela de papéis.)
-- =====================================================================
alter table public.sites    enable row level security;
alter table public.events   enable row level security;
alter table public.settings enable row level security;

drop policy if exists "sites_read" on public.sites;
create policy "sites_read" on public.sites for select to anon, authenticated using (true);
drop policy if exists "sites_auth_write" on public.sites;
create policy "sites_auth_write" on public.sites for all to authenticated using (true) with check (true);

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events for select to anon using (published = true);
drop policy if exists "events_auth_read" on public.events;
create policy "events_auth_read" on public.events for select to authenticated using (true);
drop policy if exists "events_auth_write" on public.events;
create policy "events_auth_write" on public.events for all to authenticated using (true) with check (true);

drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings for select to anon, authenticated using (true);
drop policy if exists "settings_auth_write" on public.settings;
create policy "settings_auth_write" on public.settings for all to authenticated using (true) with check (true);

-- =====================================================================
--  STORAGE — bucket público para as artes dos eventos (compartilhado;
--  os arquivos são salvos com prefixo do site, ex.: asasul/arte.jpg)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('eventos', 'eventos', true)
on conflict (id) do nothing;

drop policy if exists "eventos_public_read" on storage.objects;
create policy "eventos_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'eventos');
drop policy if exists "eventos_auth_write" on storage.objects;
create policy "eventos_auth_write" on storage.objects
  for all to authenticated using (bucket_id = 'eventos') with check (bucket_id = 'eventos');

-- Pronto. Crie os editores em Authentication → Users → Add user
-- e desative o cadastro público em Authentication → Sign In / Providers.
