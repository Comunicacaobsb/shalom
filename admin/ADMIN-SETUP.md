# Painel de administração — Comunidade Shalom Brasília (repo-wide)

Área logada **compartilhada por todo o repositório**. Um único painel (`/admin/`)
edita o conteúdo de qualquer página (Asa Sul, Taguatinga, Santa Maria, …), com
**escopo por página** (cada página só vê o seu conteúdo). Usa Supabase (login +
banco + imagens, plano gratuito). O site continua no GitHub Pages.

**O banco é a única fonte** de capa, horários e eventos das páginas de Centro de
Evangelização (2026-09-07). Não existe mais conteúdo editável dentro do código:
sem as linhas no banco, a página mostra "A confirmar" nos horários e esconde a
seção de eventos. O ponto de partida é o seed `docs/seeds/2026-09-07-seed-cev.sql`
(veja a seção 2.2).

**Cardápio da Lanchonete (2026-10-22):** saiu deste painel. A página pública é
`/asasul/sh82/` (o antigo `/sh82cafe/` só redireciona) e o cardápio, os horários
e os pedidos da Lanchonete Shalom | SH82 são editados no Portal, no módulo
Lanchonete (esquema `lanchonete` no Supabase). As tabelas `menu_categories`,
`menu_products` e o bucket `cardapio` citados abaixo ficaram sem tela de edição.

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
├── asasul/  (index.html, evento.html, js/main.js, js/events.js, js/evento.js, e/…)
├── taguatinga/  santamaria/  …  (mesmo padrão)
└── scripts/qa/admin-mock/  → teste automático do painel com um Supabase falso
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
Acesse `/admin/`, entre, e **escolha a página** no seletor do topo. Cada página abre
com os módulos que ela suporta, na mesma ordem em que aparecem no site: **Capa**,
**Horários e serviços** e **Eventos e encontros**. Cada módulo mostra uma miniatura
da página com o trecho que ele edita em destaque, a frase "Onde aparece: …" e um
botão **Ver no site** que abre a página pública direto naquele trecho. Dentro do
editor, a faixa do topo repete em que página e em que módulo você está.

- **Capa (topo da página):** o título, a frase de apoio e a imagem de fundo da
  primeira tela. O título tem **uma linha do campo = uma linha do título** na
  página. A **prévia ao vivo**, ao lado, mostra como vai ficar (aproximada: o site
  usa Montserrat e ocupa a tela inteira); sem imagem, ela mostra o fundo azul
  institucional, exatamente como a página faz. A imagem é reduzida a no máximo
  1920 px e comprimida no navegador até caber em **300 KB** (veja "Imagens"),
  depois enviada para o bucket `eventos`, na pasta da própria página
  (`<site>/capa-<data>.webp`). Nada aparece no site antes de clicar em
  **Salvar capa**.
- **Eventos:** criar/editar/excluir, upload de imagem, texto curto (card),
  descrição completa (títulos/listas/negrito), link de inscrição, publicar/rascunho,
  ordem no carrossel. Também é possível definir **Publicar em** e **Retirar em**;
  o banco filtra automaticamente o evento pelo horário de Brasília/UTC, sem deploy.
  Vale só para a página selecionada. Eventos existentes da Asa Sul aparecem na lista
  e podem ser editados ou excluídos.
- **Horários & Serviços:** um campo por categoria, uma linha = um item. Preencha
  todas as seis categorias (Funcionamento, Missas, Adoração, Aconselhamento,
  Grupos de Oração, Serviços): o que ficar em branco aparece como "A confirmar"
  na página. Não há mais cópia dos horários no código — sem linha em
  `settings`/`schedules`, a página mostra "A confirmar" nas seis categorias.

As mudanças aparecem na respectiva página em tempo real.

## 2.1 Imagens (limite de 300 KB)

Toda imagem enviada pelo painel — capa, arte de evento e foto de produto do
cardápio — é **ajustada e comprimida no seu próprio navegador** antes de subir.
Nada precisa ser preparado antes: mande a foto do jeito que ela está.

O que acontece com o arquivo:

1. o lado maior é reduzido para o tamanho do lugar onde a imagem aparece —
   **1920 px** na capa, **1200 px** em evento e cardápio;
2. a imagem é gravada em **WebP** com qualidade 0,82; se passar de 300 KB, a
   qualidade cai para 0,72 → 0,62 → 0,52;
3. se ainda passar, a imagem encolhe mais 20% e o processo recomeça, até o piso
   de 800 px (em navegador antigo, sem WebP, a mesma escada é feita em JPEG).

O painel **nunca envia um arquivo acima de 300 KB**. Quando termina, a mensagem
abaixo do botão mostra o tamanho final ("Imagem enviada (184 KB)"). Se nem no
menor tamanho a imagem couber no limite — normalmente foto com ruído ou textura
muito fina —, o envio é recusado com "Não foi possível deixar a imagem abaixo de
300 KB. Use uma imagem menor ou com menos detalhes.". Arquivo que não é imagem
também é recusado, sem subir nada.

> **Por que 300 KB:** as páginas abrem no celular, muitas vezes em rede fraca. É
> o teto que todas as imagens do site já respeitam hoje.

> **Prévia no WhatsApp:** a `og:image` de cada página continua vindo do HTML e
> **não muda** ao trocar a imagem da capa pelo painel — programas como WhatsApp e
> Facebook não executam JavaScript. Trocar a imagem da prévia exige alterar o
> `index.html` e publicar.

## 2.2 Publicação e primeiro acesso (uma vez)

O conteúdo das três páginas de Centro de Evangelização nasce no banco, por um
**seed** aplicado uma única vez. Nesta ordem:

1. **Aplicar o seed** — *ação do João*: no SQL Editor do projeto Supabase (conta
   comshalom), rodar `docs/seeds/2026-09-07-seed-cev.sql`. Ele é idempotente
   (`on conflict do nothing`): grava capa, horários e eventos das três páginas e
   **não mexe** no que já existe. Rodar duas vezes não duplica nada.
2. **Publicar** o site (push na `main`).
3. **Conferir as três páginas** (Asa Sul, Taguatinga, Santa Maria): capa,
   horários e o carrossel de eventos. Se o seed ainda não tiver rodado, os
   horários aparecem como "A confirmar" e a seção de eventos some — é o sinal de
   que falta o passo 1.
4. **Conceder acessos** em **Usuários e acessos** (visível só para o master):
   marque quais páginas cada editor pode cuidar. Criar conta não concede edição
   (veja a seção 5).

A partir daí toda a edição é pelo painel, sem publicar de novo.

## 3. Ligar uma página nova (ex.: Taguatinga)

> **Taguatinga e Santa Maria já estão ligadas** (2026-09-07), pelo processo abaixo,
> no mesmo padrão da Asa Sul: páginas autocontidas (`index.html`, `evento.html`,
> `e/<slug>/`, sem `header.js`/Bootstrap/`cev-data.js`), com
> `window.SHALOM_SITE` = `"taguatinga"` / `"santamaria"` e o catálogo do painel
> (`admin/admin.js` → `SITE_CATALOG`) com `type:"editable"`,
> `modules:["home","schedules","events"]` (a mesma ordem em que aparecem na página)
> e `children` apontando para as páginas de evento geradas (`e/<slug>/`) de cada centro.
> Sobre como o conteúdo chega ao banco, veja a seção 2.2.
>
> **Capa editável:** a capa vive em `settings` com `key = "home"` e valor
> `{ titulo, subtitulo, imagem, imagem_alt }`, no mesmo escopo por página das outras
> chaves. Sem linha no banco, a página mantém o hero que está no HTML (mesmo texto
> e mesma imagem do seed) — nada quebra, mas nada é editável até o seed rodar.
> `imagem: ""` salvo pelo painel significa **sem foto** (fundo azul institucional).
>
> **Feed de notícias compartilhado:** Taguatinga e Santa Maria não têm feed próprio;
> ambas leem `../asasul/data/noticias.json` (o mesmo feed da Asa Sul, atualizado a
> cada hora pelo workflow `.github/workflows/asasul-news.yml`). As notícias são da
> missão, não do centro — não crie um `data/noticias.json` local para essas páginas.
>
> **Eventos:** vêm todos do banco (`events`, filtrados por `published` e pelas datas
> de publicar/retirar). Não existe mais lista de eventos no código: sem linhas no
> banco a seção "Eventos e encontros" simplesmente não aparece. Quando não há arte,
> a página monta um pôster de reserva com o título.

1. No painel, o site já pode existir (registre em `sites` via o SQL, ou adicione
   uma linha: `insert into sites (id,name) values ('taguatinga','Shalom Taguatinga');`).
2. Na página nova, no HTML, antes dos scripts compartilhados:
   ```html
   <script>window.SHALOM_SITE = "taguatinga";</script>
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="../js/config.js"></script>
   <script src="../js/store.js"></script>
   <script src="js/events.js"></script>      <!-- eventos: só Supabase -->
   <script src="../js/share.js"></script>
   <script src="js/main.js"></script>
   ```
3. Use os mesmos IDs de campos de horários (`field-funcionamento`, `field-missa`,
   `field-adoracao`, `field-aconselhamento`, `field-grupos`, `field-servicos`) e o
   mesmo `#comshalom-list` / carrossel. Pronto — o painel já edita essa página.

## 4. Compartilhar + prévia (og:image do evento)
Cada página tem `scripts/build-event-pages.mjs`, que gera `<pagina>/e/<slug>/index.html`
com a `og:image` do evento no HTML (o WhatsApp/Facebook não executam JS). Ele lê os
eventos publicados **do banco**. Rode, dentro da pasta da página, sempre que criar,
renomear ou excluir um evento:
```
node scripts/build-event-pages.mjs
# ou, sem rede, a partir do JSON do seed:
node scripts/build-event-pages.mjs --from-json ../docs/seeds/2026-09-07-seed-cev.json
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
   Sem ela, as páginas não conseguem ler o banco (horários viram "A confirmar", a seção
   de eventos some) e o login não funciona.
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
