# Painel de administração — Comunidade Shalom Brasília (repo-wide)

Área logada **compartilhada por todo o repositório**. Um único painel (`/admin/`)
edita o conteúdo de qualquer página (Asa Sul, Taguatinga, Santa Maria, …), com
**escopo por página** (cada página só vê o seu conteúdo). Usa Supabase (login +
banco + imagens, plano gratuito). O site continua no GitHub Pages.

Enquanto o Supabase não estiver configurado, cada página funciona com os dados de
exemplo do seu `js/data.js` — nada quebra.

## Estrutura
```
/
├── js/
│   ├── config.js     → credenciais do Supabase (compartilhado)
│   ├── store.js      → camada de dados por página (window.SHALOM_SITE)
│   ├── share.js      → compartilhar evento (compartilhado)
│   ├── header.js, footer.js, cev-data.js  (já existiam)
├── admin/
│   ├── index.html    → painel hub (login + mapa + workspaces)
│   ├── admin.js / admin.css
│   ├── supabase-setup.sql
│   └── ADMIN-SETUP.md (este arquivo)
├── asasul/  (index.html, evento.html, js/main.js, js/data.js, js/evento.js, e/…)
├── taguatinga/  santamaria/  …  (mesmo padrão)
```

## 1. Configurar o Supabase (uma vez)
1. Em **Project Settings → API**, copie a **anon public** e cole em `js/config.js`
   (a Project URL já está lá). A chave anon é pública — pode ir para o GitHub.
2. Em **SQL Editor → New query**, cole todo o `admin/supabase-setup.sql` e **Run**.
   Cria `sites`, `events`, `settings` (com escopo por página), o RLS e o bucket `eventos`.
3. **Login e permissões:** siga a seção **5. Níveis de acesso**. O painel usa e-mail e
   senha, com criação de conta, confirmação por e-mail e aprovação por página. Criar uma
   conta não concede acesso de edição; o master atribui páginas em **Usuários e acessos**.
4. Commit + push. Painel em `https://brasilia.comshalom.org/admin/`.

## 2. Como usar
Acesse `/admin/`, entre, e **escolha a página** no seletor do topo. Depois:
- **Eventos:** criar/editar/excluir, upload de imagem, texto curto (card),
  descrição completa (títulos/listas/negrito), link de inscrição, publicar/rascunho,
  ordem no carrossel. Também é possível definir **Publicar em** e **Retirar em**;
  o banco filtra automaticamente o evento pelo horário de Brasília/UTC, sem deploy.
  Vale só para a página selecionada. Eventos existentes da Asa Sul aparecem na lista
  e podem ser editados ou excluídos.
- **Horários & Serviços:** um campo por categoria, uma linha = um item.

As mudanças aparecem na respectiva página em tempo real.

## 3. Ligar uma página nova (ex.: Taguatinga)
1. No painel, o site já pode existir (registre em `sites` via o SQL, ou adicione
   uma linha: `insert into sites (id,name) values ('taguatinga','Shalom Taguatinga');`).
2. Na página nova, no HTML, antes dos scripts compartilhados:
   ```html
   <script>window.SHALOM_SITE = "taguatinga";</script>
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="../js/config.js"></script>
   <script src="js/data.js"></script>      <!-- fallback local (opcional) -->
   <script src="../js/store.js"></script>
   <script src="../js/share.js"></script>
   <script src="js/main.js"></script>
   ```
3. Use os mesmos IDs de campos de horários (`field-funcionamento`, `field-missa`,
   `field-adoracao`, `field-aconselhamento`, `field-grupos`, `field-servicos`) e o
   mesmo `#comshalom-list` / carrossel. Pronto — o painel já edita essa página.

## 4. Compartilhar + prévia (og:image do evento)
Cada página tem `scripts/build-event-pages.mjs`, que gera `<pagina>/e/<slug>/index.html`
com a `og:image` do evento no HTML (o WhatsApp/Facebook não executam JS). Rode, dentro
da pasta da página, sempre que mudar os eventos do `data.js`:
```
node scripts/build-event-pages.mjs
```
> Para eventos gerenciados pelo Supabase, a prévia com a arte exige regerar essas
> páginas (ou usar um Cloudflare Worker que injeta a og:image na hora). Posso montar
> qualquer uma quando você quiser.

## 5. Níveis de acesso (Admin Master e editores por página)
A regra antiga ("qualquer pessoa logada = editor") foi **substituída** por níveis de
acesso guardados no banco (migração `supabase/migrations/20260718100000_cardapio_permissoes.sql`).

### Como funciona
- **`profiles`** — quem confirma uma conta ganha um perfil, criado automaticamente por um
  trigger em `auth.users` (copia o nome informado no cadastro). O campo `is_master` marca o Admin Master.
- **Admin Master** — pode tudo em todas as páginas e ainda promove/rebaixa outros masters e
  concede acesso por página. Bootstrap automático: `joao.roquesh@gmail.com` vira master no
  primeiro login confirmado.
- **Editores por página (`page_permissions`)** — cada linha `(user_id, site)` dá a um usuário
  permissão de **escrita** naquele site. Sem linha e não sendo master → só leitura.
- **Funções `is_master()` / `can_edit(site)`** (SECURITY DEFINER) fazem a checagem, e o RLS
  usa elas: em `sites` só o master escreve; `events`, `settings`, `menu_categories`,
  `menu_products` e o bucket `cardapio` exigem `can_edit(site)`. A leitura pública não muda.
- Quem gateia o acesso é a **permissão de edição**, não o login em si. Criar uma conta é
  apenas criar uma identidade; sem confirmação e aprovação, a pessoa vê "Sua conta ainda não
  tem acesso de edição. Peça a um administrador."

> ⚠️ **Editores atuais por e-mail/senha perdem a escrita** assim que esta migração roda —
> até o master conceder acesso a cada um em **Usuários e acessos**. (A leitura pública
> das páginas continua igual.)

### Passo a passo da configuração (uma vez, no Supabase)
1. **anon key** — preencha a chave em `js/config.js` (Project Settings → API → "anon public").
   Sem ela, as páginas seguem no fallback de `data.js` e o login não funciona.
2. **E-mail** — em Authentication → Providers, mantenha Email habilitado. Para produção,
   exija confirmação de e-mail e configure SMTP transacional; o SMTP padrão do Supabase serve
   apenas para testes e tem limites baixos.
3. **URLs** — Authentication → URL Configuration → **Site URL**: `https://brasilia.comshalom.org`.
   **Redirect URLs**: `https://brasilia.comshalom.org/admin/**` e `http://localhost:*/admin/**`.
4. **Aplicar as migrações** — o push/merge na `main` publica os arquivos no GitHub Pages
   e, enquanto a integração nativa Supabase–GitHub estiver ativa para a branch de produção,
   também aplica as migrations no projeto Supabase. Em um setup novo ou sem essa integração,
   aplique explicitamente os arquivos de `supabase/migrations/` usando a rotina autorizada
   de deploy (por exemplo, `supabase db push` com o projeto vinculado). O Admin Master é
   definido após o primeiro login confirmado de `joao.roquesh@gmail.com`.
5. **Conceder permissões** — em **Usuários e acessos** (visível só para o master), promova
   editores e marque os sites que cada um pode editar. A pessoa precisa confirmar o e-mail e
   entrar uma vez para aparecer na lista.

## Observação
Os antigos `asasul/js/config.js`, `asasul/js/store.js`, `asasul/js/share.js` e
`asasul/admin/` viraram ponteiros (não deu para removê-los automaticamente).
Podem ser apagados manualmente com segurança — nada mais os usa. O mesmo vale para
`js/_rmtest.txt`, se existir.
