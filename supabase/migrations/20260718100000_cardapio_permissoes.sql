-- =====================================================================
--  Migração — Cardápio SH-82 Café + sistema de permissões por página
--  Comunidade Shalom Brasília (repo-wide, escopo por site)
--  Aplicada automaticamente pelo Supabase a cada push na branch de produção.
--  Idempotente: pode rodar de novo sem quebrar (if not exists / on conflict
--  do nothing / drop policy if exists / create or replace).
--  Depende da migração 20260710120000_init_shalom.sql (sites/events/settings).
-- =====================================================================


-- =====================================================================
--  1. PERFIS (profiles) — espelham auth.users, guardam o papel Admin Master
--     O usuário NÃO edita o próprio papel: quem promove é o master (via RLS).
-- =====================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  avatar_url   text,
  is_master    boolean not null default false,   -- Admin Master = manda em tudo
  created_at   timestamptz not null default now()
);

-- ---------- Trigger: cria o profile quando um usuário nasce em auth.users ----------
-- SECURITY DEFINER para escrever em public.profiles a partir do schema auth.
-- Bootstrap: joao.roquesh@gmail.com nasce como Admin Master.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, is_master)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.email = 'joao.roquesh@gmail.com', false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger em auth.users precisa de "drop if exists" antes de recriar (idempotência).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Backfill: profiles para usuários que já existem em auth.users ----------
insert into public.profiles (id, email, display_name, avatar_url, is_master)
select
  u.id,
  coalesce(u.email, ''),
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'avatar_url',
  coalesce(u.email = 'joao.roquesh@gmail.com', false)
from auth.users u
on conflict (id) do nothing;

-- Garante o bootstrap do Admin Master mesmo que o profile já existisse antes
-- desta migração (ex.: criado por um run anterior sem a regra de master).
update public.profiles
set is_master = true
where email = 'joao.roquesh@gmail.com' and is_master = false;


-- =====================================================================
--  2. PERMISSÕES POR PÁGINA (page_permissions)
--     Um editor recebe acesso de escrita a um site específico.
--     Master tem acesso a tudo sem precisar de linha aqui.
-- =====================================================================
create table if not exists public.page_permissions (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  site       text not null references public.sites(id)     on delete cascade,
  granted_by uuid,                                  -- quem concedeu (profile do master)
  created_at timestamptz not null default now(),
  primary key (user_id, site)
);


-- =====================================================================
--  3. FUNÇÕES DE CHECAGEM (SECURITY DEFINER, stable, search_path = public)
--     Owner = postgres → leem profiles/page_permissions IGNORANDO o RLS,
--     o que evita recursão infinita nas políticas que as chamam.
--     Nunca chamar can_edit() em política DA PRÓPRIA tabela profiles.
-- =====================================================================
create or replace function public.is_master()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_master = true
  );
$$;

create or replace function public.can_edit(p_site text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_master() or exists (
    select 1 from public.page_permissions
    where user_id = auth.uid() and site = p_site
  );
$$;

-- Garante que os papéis do Supabase possam avaliar as funções nas políticas RLS.
grant execute on function public.is_master()      to anon, authenticated;
grant execute on function public.can_edit(text)   to anon, authenticated;


-- =====================================================================
--  4. RLS — profiles e page_permissions
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.page_permissions enable row level security;

-- ---------- profiles ----------
-- Leitura: o próprio OU master. Update: só master (é assim que se promove).
-- Sem insert/delete via API — o trigger (SECURITY DEFINER) cuida da criação.
drop policy if exists "profiles_self_or_master_read" on public.profiles;
create policy "profiles_self_or_master_read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_master());

drop policy if exists "profiles_master_update" on public.profiles;
create policy "profiles_master_update" on public.profiles
  for update to authenticated
  using (public.is_master())
  with check (public.is_master());

-- ---------- page_permissions ----------
-- Leitura: o próprio OU master. Escrita: só master.
drop policy if exists "page_permissions_self_or_master_read" on public.page_permissions;
create policy "page_permissions_self_or_master_read" on public.page_permissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_master());

drop policy if exists "page_permissions_master_insert" on public.page_permissions;
create policy "page_permissions_master_insert" on public.page_permissions
  for insert to authenticated
  with check (public.is_master());

drop policy if exists "page_permissions_master_update" on public.page_permissions;
create policy "page_permissions_master_update" on public.page_permissions
  for update to authenticated
  using (public.is_master())
  with check (public.is_master());

drop policy if exists "page_permissions_master_delete" on public.page_permissions;
create policy "page_permissions_master_delete" on public.page_permissions
  for delete to authenticated
  using (public.is_master());


-- =====================================================================
--  5. REESCRITA DAS POLÍTICAS DE ESCRITA EXISTENTES
--     Antes: "qualquer logado escreve". Agora: escrita gateada por papel.
--     ATENÇÃO: editores por e-mail/senha SEM permissão perdem a escrita
--     até o master conceder acesso na aba Usuários. Leitura NÃO muda.
-- =====================================================================

-- sites: só o master mexe no cadastro de páginas.
drop policy if exists "sites_auth_write"   on public.sites;  -- política antiga (init)
drop policy if exists "sites_master_write" on public.sites;  -- idempotência (re-run)
create policy "sites_master_write" on public.sites
  for all to authenticated
  using (public.is_master())
  with check (public.is_master());

-- events: escrita exige can_edit(site). (Leitura mantém events_public_read /
-- events_auth_read da migração inicial.)
drop policy if exists "events_auth_write" on public.events;  -- política antiga (init)
drop policy if exists "events_edit_write" on public.events;  -- idempotência (re-run)
create policy "events_edit_write" on public.events
  for all to authenticated
  using (public.can_edit(site))
  with check (public.can_edit(site));

-- settings: escrita exige can_edit(site). (Leitura mantém settings_public_read.)
drop policy if exists "settings_auth_write" on public.settings;  -- política antiga (init)
drop policy if exists "settings_edit_write" on public.settings;  -- idempotência (re-run)
create policy "settings_edit_write" on public.settings
  for all to authenticated
  using (public.can_edit(site))
  with check (public.can_edit(site));


-- =====================================================================
--  6. CARDÁPIO — novo site sh82cafe + tabelas de categorias e produtos
-- =====================================================================
insert into public.sites (id, name) values
  ('sh82cafe', 'SH-82 Café')
on conflict (id) do nothing;

-- ---------- Categorias do cardápio (por página) ----------
create table if not exists public.menu_categories (
  id         uuid primary key default gen_random_uuid(),
  site       text not null references public.sites(id),
  slug       text not null,
  name       text not null,
  position   int  not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (site, slug)
);
create index if not exists menu_categories_site_idx
  on public.menu_categories (site, position);

-- ---------- Produtos do cardápio (por página) ----------
--  weekdays: null = todos os dias; 0=dom … 6=sáb (mesma numeração de EXTRACT(dow)).
--  start_date/end_date: null = sem limite. badge: selo opcional.
create table if not exists public.menu_products (
  id          uuid primary key default gen_random_uuid(),
  site        text not null references public.sites(id),
  category_id uuid references public.menu_categories(id) on delete set null,
  slug        text not null,
  name        text not null,
  description text,
  price       numeric(10,2) not null default 0,
  image_url   text,
  position    int  not null default 0,
  active      boolean not null default true,
  weekdays    smallint[],
  start_date  date,
  end_date    date,
  badge       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (site, slug)
);
create index if not exists menu_products_site_idx
  on public.menu_products (site, active, position);

-- ---------- Trigger updated_at (produtos) ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists menu_products_set_updated_at on public.menu_products;
create trigger menu_products_set_updated_at
  before update on public.menu_products
  for each row execute function public.set_updated_at();


-- =====================================================================
--  7. RLS — cardápio
--     anon lê só o que está ativo; authenticated lê tudo;
--     escrita (categorias e produtos) exige can_edit(site).
-- =====================================================================
alter table public.menu_categories enable row level security;
alter table public.menu_products   enable row level security;

-- ---------- menu_categories ----------
drop policy if exists "menu_categories_anon_read" on public.menu_categories;
create policy "menu_categories_anon_read" on public.menu_categories
  for select to anon using (active = true);

drop policy if exists "menu_categories_auth_read" on public.menu_categories;
create policy "menu_categories_auth_read" on public.menu_categories
  for select to authenticated using (true);

drop policy if exists "menu_categories_edit_write" on public.menu_categories;
create policy "menu_categories_edit_write" on public.menu_categories
  for all to authenticated
  using (public.can_edit(site))
  with check (public.can_edit(site));

-- ---------- menu_products ----------
drop policy if exists "menu_products_anon_read" on public.menu_products;
create policy "menu_products_anon_read" on public.menu_products
  for select to anon using (active = true);

drop policy if exists "menu_products_auth_read" on public.menu_products;
create policy "menu_products_auth_read" on public.menu_products
  for select to authenticated using (true);

drop policy if exists "menu_products_edit_write" on public.menu_products;
create policy "menu_products_edit_write" on public.menu_products
  for all to authenticated
  using (public.can_edit(site))
  with check (public.can_edit(site));


-- =====================================================================
--  8. VIEW de conveniência — produtos disponíveis HOJE (fuso America/Sao_Paulo)
--     Fonte de verdade da disponibilidade (replicada no front):
--       active
--       AND (weekdays is null OR dow_hoje = any(weekdays))
--       AND (start_date is null OR hoje >= start_date)
--       AND (end_date   is null OR hoje <= end_date)
--     security_invoker = true → respeita o RLS de menu_products (Postgres 15).
-- =====================================================================
create or replace view public.menu_available_today
with (security_invoker = true) as
select p.*
from public.menu_products p
where p.active = true
  and (
    p.weekdays is null
    or extract(dow from (now() at time zone 'America/Sao_Paulo'))::smallint = any (p.weekdays)
  )
  and (p.start_date is null or (now() at time zone 'America/Sao_Paulo')::date >= p.start_date)
  and (p.end_date   is null or (now() at time zone 'America/Sao_Paulo')::date <= p.end_date);

grant select on public.menu_available_today to anon, authenticated;


-- =====================================================================
--  9. STORAGE — bucket público "cardapio"
--     Leitura pública. Escrita exige can_edit(site), onde o site é o primeiro
--     segmento do caminho do arquivo: <site>/<uuid>.<ext>.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('cardapio', 'cardapio', true)
on conflict (id) do nothing;

drop policy if exists "cardapio_public_read" on storage.objects;
create policy "cardapio_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'cardapio');

drop policy if exists "cardapio_edit_write" on storage.objects;
create policy "cardapio_edit_write" on storage.objects
  for all to authenticated
  using  (bucket_id = 'cardapio' and public.can_edit(split_part(name, '/', 1)))
  with check (bucket_id = 'cardapio' and public.can_edit(split_part(name, '/', 1)));


-- =====================================================================
--  10. SEED (mock) — categorias, ~12 produtos e infos do café
--      Cobre os 4 casos de disponibilidade + 1 produto inativo.
--      image_url = null em todos (o front renderiza placeholder).
--      Slugs estáveis + on conflict (site, slug) do nothing (idempotente).
-- =====================================================================

-- ---------- Categorias ----------
insert into public.menu_categories (site, slug, name, position, active) values
  ('sh82cafe', 'bebidas',  'Bebidas',  0, true),
  ('sh82cafe', 'salgados', 'Salgados', 1, true),
  ('sh82cafe', 'doces',    'Doces',    2, true)
on conflict (site, slug) do nothing;

-- ---------- Produtos ----------
--  Casos cobertos:
--   • perenes (weekdays/start/end = null)
--   • weekdays = {2,3,4}  → terça a quinta
--   • weekdays = {1}      → toda segunda
--   • start = end = hoje  → "Só hoje" (badge)
--   • active = false      → item desativado
insert into public.menu_products
  (site, category_id, slug, name, description, price, image_url, position, active, weekdays, start_date, end_date, badge)
values
  -- Bebidas
  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'bebidas'),
   'espresso', 'Espresso', 'Espresso curto e encorpado, torra média da casa.',
   6.00, null, 0, true, null, null, null, null),

  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'bebidas'),
   'cappuccino', 'Cappuccino', 'Espresso, leite vaporizado e espuma cremosa.',
   12.00, null, 1, true, null, null, null, null),

  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'bebidas'),
   'cafe-coado', 'Café coado', 'Coado na hora com grãos selecionados.',
   7.00, null, 2, true, null, null, null, null),

  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'bebidas'),
   'chocolate-quente', 'Chocolate quente', 'Chocolate belga cremoso com raspas de cacau. Especial de meio de semana.',
   14.00, null, 3, true, '{2,3,4}'::smallint[], null, null, null),

  -- Salgados
  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'salgados'),
   'pao-de-queijo', 'Pão de queijo', 'Assado na hora, casca crocante e recheio macio.',
   8.00, null, 0, true, null, null, null, null),

  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'salgados'),
   'coxinha-de-frango', 'Coxinha de frango', 'Recheio cremoso de frango desfiado com catupiry.',
   9.00, null, 1, true, null, null, null, null),

  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'salgados'),
   'quiche-alho-poro', 'Quiche de alho-poró', 'Massa amanteigada com recheio de alho-poró. Só às segundas.',
   16.00, null, 2, true, '{1}'::smallint[], null, null, null),

  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'salgados'),
   'empada-de-palmito', 'Empada de palmito', 'Palmito pupunha ao molho branco. (Fora de linha no momento.)',
   10.00, null, 3, false, null, null, null, null),

  -- Doces
  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'doces'),
   'bolo-de-cenoura', 'Fatia de bolo de cenoura', 'Bolo fofinho com cobertura de brigadeiro.',
   11.00, null, 0, true, null, null, null, null),

  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'doces'),
   'brigadeiro-gourmet', 'Brigadeiro gourmet', 'Brigadeiro de colher com chocolate 55%.',
   5.00, null, 1, true, null, null, null, null),

  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'doces'),
   'torta-de-limao', 'Torta de limão do dia', 'Base crocante, creme de limão siciliano e merengue maçaricado.',
   13.00, null, 2, true, null, current_date, current_date, 'Só hoje'),

  ('sh82cafe', (select id from public.menu_categories where site = 'sh82cafe' and slug = 'doces'),
   'cheesecake-frutas-vermelhas', 'Cheesecake de frutas vermelhas', 'Cremoso com calda de frutas vermelhas.',
   15.00, null, 3, true, null, null, null, null)
on conflict (site, slug) do nothing;

-- ---------- Informações do café (settings/cafe_info) ----------
insert into public.settings (site, key, value)
values ('sh82cafe', 'cafe_info', '{
  "nome": "SH-82 Café",
  "subtitulo": "",
  "endereco": "",
  "instagram": "",
  "whatsapp": "",
  "aviso": ""
}'::jsonb)
on conflict (site, key) do nothing;

-- Pronto. Master = primeiro login de joao.roquesh@gmail.com (Google).
-- Conceda permissões aos demais editores na aba "Usuários" do /admin.
