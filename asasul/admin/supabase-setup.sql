-- =====================================================================
--  Shalom Asa Sul — Setup do Supabase
--  Cole este arquivo INTEIRO no Supabase → SQL Editor → New query → Run.
--  Cria as tabelas, as permissões (RLS) e o bucket de imagens.
-- =====================================================================

-- ---------- Tabela de EVENTOS ----------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,           -- vai na URL: evento.html?id=slug
  title       text not null,
  badge       text,                           -- etiqueta curta (ex.: "Encontro")
  date_text   text,                           -- data livre (ex.: "29 e 30 de agosto")
  location    text,
  image_url   text,                           -- URL da arte (upload vai para o Storage)
  summary     text,                           -- texto curto do card
  description text,                           -- texto longo (HTML do editor) da página do evento
  link_text   text,                           -- rótulo do botão externo (ex.: "Inscreva-se")
  link_url    text,                           -- link de inscrição / WhatsApp
  published   boolean not null default true,
  position    int not null default 0,         -- ordem no carrossel
  updated_at  timestamptz not null default now()
);

-- ---------- Tabela de CONFIGURAÇÕES (horários e serviços) ----------
-- Guarda um único registro key='schedules' com um JSON de listas por categoria.
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Valor inicial dos horários (edite depois pelo painel /admin)
insert into public.settings (key, value)
values ('schedules', '{
  "funcionamento": ["Segunda a sábado: 14h às 22h"],
  "missa":         ["Segunda e sexta: 18h", "Sábado e domingo: 17h", "2ª terça: Missa pelas Famílias", "4ª quinta: Missa da Misericórdia"],
  "grupos":        ["Casais: terça às 20h", "Amare (aberto): quinta às 19h30", "Kyrios (16 a 23 anos): sábado às 15h"],
  "adoracao":      ["Capela Kyrios — Santíssimo exposto 24 horas"],
  "servicos":      ["Quarta: 19h30 às 21h", "Sexta: 17h", "Sábado: 16h", "Domingo: após a missa das 17h"],
  "aconselhamento":["Quinta: 14h30 às 21h", "Ou agende pelo link: https://forms.gle/fnbLoKrEtNMw5D5y8"]
}'::jsonb)
on conflict (key) do nothing;

-- =====================================================================
--  SEGURANÇA (Row Level Security)
--  - Qualquer visitante LÊ (eventos publicados + configurações).
--  - Só usuários LOGADOS podem criar/editar/apagar.
-- =====================================================================
alter table public.events   enable row level security;
alter table public.settings enable row level security;

-- EVENTS: leitura pública apenas de publicados
drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
  for select to anon using (published = true);

-- EVENTS: usuários logados veem tudo e podem escrever
drop policy if exists "events_auth_read" on public.events;
create policy "events_auth_read" on public.events
  for select to authenticated using (true);
drop policy if exists "events_auth_write" on public.events;
create policy "events_auth_write" on public.events
  for all to authenticated using (true) with check (true);

-- SETTINGS: leitura pública, escrita só logado
drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings
  for select to anon, authenticated using (true);
drop policy if exists "settings_auth_write" on public.settings;
create policy "settings_auth_write" on public.settings
  for all to authenticated using (true) with check (true);

-- =====================================================================
--  STORAGE — bucket público para as artes dos eventos
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('eventos', 'eventos', true)
on conflict (id) do nothing;

-- Leitura pública das imagens
drop policy if exists "eventos_public_read" on storage.objects;
create policy "eventos_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'eventos');

-- Upload / substituição / remoção só para usuários logados
drop policy if exists "eventos_auth_write" on storage.objects;
create policy "eventos_auth_write" on storage.objects
  for all to authenticated using (bucket_id = 'eventos') with check (bucket_id = 'eventos');

-- Pronto. Agora crie os editores em Authentication → Users → Add user
-- (defina e-mail e senha, ou use "Invite"). Eles farão login em /asasul/admin/.
