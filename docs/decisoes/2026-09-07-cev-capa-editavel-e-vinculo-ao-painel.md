# Capa editável, vínculo completo ao painel e preparação para publicar (CEVs)

**Data:** 2026-09-07 (segunda rodada) · **Repo:** `~/Documents/GitHub/Shalom` · **Complementa:** `2026-09-07-cev-taguatinga-santamaria.md` (réplica das páginas; ler antes).
**Pedido do João (transcrição):** (1) vincular Taguatinga e Santa Maria completamente ao banco e à edição, para outros usuários editarem tudo; (2) imagem de fundo da capa (hero) editável no painel nas três páginas (Asa Sul, Taguatinga, Santa Maria); (3) título da capa ("Um lugar para encontrar Deus em Santa Maria") editável; (4) horários e eventos continuam editáveis; (5) painel muito claro: a pessoa vê o que está editando e onde aquilo aparece; (6) tudo pronto para subir só estas páginas, sem tocar no que outras pessoas desenvolvem no mesmo repositório; (7) hover do botão "Comunhão de bens" no menu fica invisível; (8) rodapé padrão com link discreto para a página logada.

Classificação: **Fato** (verificado), **Decisão**, **Pendente**.

## 1. Fatos verificados

- `main` local = `origin/main` (`1f3d9ec`). A working tree tem mudanças **alheias** não commitadas: `.gitignore`, `providencia/**`, `sh82cafe/index.html`, `inscricoes/`, `eventos/`, `docs/council/`, `supabase/migrations/20260718190427_eventos_inscricoes.sql`, `DESIGN.md`, `PRODUCT.md`, `PLANO-SH82CAFE.md`, `mobile.png`, `.impeccable/`. **Não tocar, não commitar, não apagar.**
- Supabase: `settings(site, key, value jsonb)` com escopo por site (`schedules`, `cafe_info` já usam); `events(site, slug, …)`; bucket público `eventos` com política `eventos_edit_write` = `can_edit(split_part(name,'/',1))` → editores só escrevem em `<site>/…`. Nenhuma migration é necessária para esta rodada.
- Regra do ecossistema: migrations só a partir do repo do Portal e nunca em produção sem homolog. Por isso **nenhum arquivo em `supabase/migrations/`** aqui; a semeadura acontece pelo painel (D2) ou por SQL opcional aplicado pelo fluxo do Portal (D3).
- Painel (`admin/`): hub com rotas `#page/<site>/<módulo>`, módulos `events`/`schedules`/`menu`, `resizeImage()` e uploader já existem; `loadSchedules()` mostra campos vazios quando não há linha; `loadEvents()` só lista linhas remotas.
- Bug (7): em `css/styles.css` a regra `.site-header.scrolled .nav-links a:hover { background: var(--blue-soft) }` (e a irmã `:not(.scrolled)`) tem especificidade maior que `.nav-cta:hover` e mantém `color:#fff !important` → texto branco sobre fundo claro. Vale nas três páginas (CSS copiado).

## 2. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | Capa editável via `settings(site, key = "home")` com valor `{ "titulo", "subtitulo", "imagem", "imagem_alt" }`. Campo vazio ou ausente → a página usa o padrão local `window.SHALOM_HOME` do seu `js/data.js` (campo a campo). Nada muda no HTML publicado quando não há linha. | Reusa tabela e RLS existentes; zero migration. |
| D2 | Semeadura pelo próprio painel: quando não há linha no banco, o editor de Horários e o de Capa **pré-preenchem com os dados locais do site** (lidos de `../<site>/js/data.js`) e avisam; o editor de Eventos mostra os eventos locais `featuredLocal` ainda não trazidos, com "Trazer para o painel" (um a um ou todos). Ao trazer/salvar, o banco passa a governar (mesmo slug → remoto vence). | Vincula 100% sem segredo, sem migration e sem escrever no banco a partir da IA. Um clique por página, feito pelo João após publicar. |
| D3 | SQL opcional e idempotente em `docs/seeds/2026-09-07-seed-cev.sql` (horários + eventos das duas páginas), para o fluxo de migrations do Portal, se o João preferir semear por lá. Não é aplicado nesta sessão. | Alternativa rastreável. |
| D4 | Imagem da capa: upload no bucket `eventos`, caminho `<site>/capa-<timestamp>.jpg`, redimensionada no navegador para no máximo 1920 px (JPEG 0.85). URL pública absoluta gravada em `home.imagem`. | Política de storage já permite; imagem grande demais derrubaria a LCP. |
| D5 | Página aplica a capa em duas etapas: (a) script inline logo após o hero aplica **sincronamente** a última capa salva em `localStorage` (`shalom:home:<site>`); (b) `main.js` busca `settings.home` e reconcilia (título, frase, imagem) com transição suave, atualizando o cache. Se a URL da imagem for a mesma, nada é trocado (sem download duplo). | Sem atraso de LCP no caso comum e sem "piscar" nas visitas seguintes. |
| D6 | `og:image`/`twitter:image` continuam estáticas (o WhatsApp não executa JS). Documentar. | Limitação conhecida; trocar exige commit. |
| D7 | As três páginas passam a compartilhar **o mesmo `main.js`/`evento.js`/`css`** (só o nome do centro e o caminho do feed diferem): o modo estático do carrossel (D14 anterior) e os títulos do pôster (D15 anterior) são portados para a Asa Sul, e o bloco "Ajustes locais" entra nos três CSS. | Manutenção: um único comportamento para os três centros. QA revalida a Asa Sul. |
| D8 | Correção (7) nos três CSS: `.site-header .nav-links a.nav-cta:hover, .site-header.scrolled .nav-links a.nav-cta:hover { background: var(--blue-deep); color: #fff; }` logo após `.nav-cta:hover`. | Especificidade maior que as regras genéricas de hover. |
| D9 | Item (8): no `.footer-bottom` das três páginas, `<a class="footer-admin" href="../admin/" rel="nofollow">Área de edição</a>` discreto: `rgba(255,255,255,.5)` (contraste 5,3:1 sobre `#0a1526`, AA) contra `.7` dos demais links; regra com seletor `.site-footer .footer-admin` para vencer `.site-footer a`. O `js/footer.js` (usado por outras páginas em desenvolvimento) **não** muda. | Não tocar no que é de outros; discreto sem ferir AA. |
| D10 | Painel claro: cada módulo mostra **onde aparece na página** (miniatura esquemática SVG com a seção destacada + frase "Onde aparece: …" + link "Ver no site" com âncora), o editor de Capa tem **prévia ao vivo**, e os textos de ajuda são em linguagem de leigo. Sem redesenho do painel; usar o processo da skill `impeccable` só no que for novo (Nielsen como aceite). | Pedido (5). |
| D11 | Testes do painel sem credenciais: mock de Supabase injetado por Playwright (`scripts/qa/admin-mock/`), com usuário master fictício e tabelas em memória; verifica fluxos (capa, horários, trazer eventos) e o que seria gravado. Nunca usar credenciais reais. | Login/senha são proibidos para a IA. |
| D13 | `home.imagem = ""` gravado pelo painel significa **sem foto** (gradiente institucional); só o campo **ausente** cai no padrão local. Vale no `main.js` e no script inline de cache. | O painel oferece "Remover imagem"; sem isso Asa Sul/Taguatinga voltariam à foto do arquivo. (QA M1) |
| D14 | Falha ao carregar a imagem da capa (404/rede): o `<img>` é removido e o gradiente volta, tanto no `main.js` quanto no cache inline. | Antes, `is-swapping` ficava preso em `opacity:.001` e o topo ficava em branco. (QA M2) |
| D15 | `toPublicUrl()` do painel só aceita `http(s):` (e `data:image/` para prévia); `run.mjs` grava screenshots fora do repo por padrão e perdeu uma asserção vazia; snippet de integração do ADMIN-SETUP inclui `js/events.js`. | QA B3/B4/B5 e observação 7. |
| D12 | Publicação: branch limpa `feat/cev-editavel` criada em **worktree separada** a partir de `origin/main`, contendo somente os arquivos desta sessão (seção 8). Push/merge é ação do João (deploy = push na `main`). | Pedido (6). |

## 3. Contrato site ↔ painel

```js
// js/data.js de cada página (padrões locais; usados quando não há linha no banco)
window.SHALOM_HOME = {
  titulo:     "Um lugar para\nencontrar Deus\nem Taguatinga",   // \n = quebra de linha do h1
  subtitulo:  "Missas, adoração, grupos de oração e formação. Toda a vida do Centro de Evangelização, num só lugar.",
  imagem:     "../images/shalom-taguatinga.webp",                 // "" = sem foto (gradiente); Santa Maria começa com ""
  imagem_alt: "Centro de Evangelização Shalom Taguatinga"
};
```
- Asa Sul: `titulo: "Um lugar para\nencontrar Deus\nna Asa Sul"`, `imagem: "../images/shalom-asa-sul.webp"`, `imagem_alt: "Centro de Evangelização Shalom Asa Sul"`. Santa Maria: `titulo: "…\nem Santa Maria"`, `imagem: ""`.
- Linha no banco: `settings` `{ site, key: "home", value: { titulo, subtitulo, imagem, imagem_alt }, updated_at }`. `imagem` = URL absoluta (storage ou `https://brasilia.comshalom.org/...`). Painel converte caminho local relativo em URL absoluta de produção ao pré-preencher: `new URL(caminho, "https://brasilia.comshalom.org/<site>/").href`.
- Eventos trazidos do local: `image_url` absoluta de produção (mesma regra), `description` = texto local convertido em HTML (parágrafos em `<p>`, quebras simples em `<br>`, URLs viram `<a target="_blank" rel="noopener">`), `published: true`, `position` = próxima posição, `link_text/link_url` do `link` local, `badge`, `date_text`, `location`, `summary`.
- Cache: `localStorage["shalom:home:<site>"]` = JSON com os quatro campos já resolvidos (imagem absoluta). Removido quando a página cai nos padrões locais.

## 4. Site — agente S (Sonnet)

Arquivos: `js/store.js`; para **cada** `<site>` em `asasul`, `taguatinga`, `santamaria`: `index.html`, `css/styles.css`, `js/data.js`, `js/main.js`, `js/evento.js`, `evento.html`, `scripts/build-event-pages.mjs` (só se precisar), `e/**` (regerar), `README.md` (taguatinga/santamaria; Asa Sul não tem README — não criar). Mais `docs/seeds/2026-09-07-seed-cev.sql`.

### 4.1 `js/store.js`
Adicionar, sem alterar o resto:
```js
  function loadSetting(key) {
    var c = client();
    if (!c) return Promise.resolve(null);
    return c.from("settings").select("value").eq("site", SITE).eq("key", key).limit(1)
      .then(function (res) { if (res.error || !res.data || !res.data.length) return null; return res.data[0].value || null; })
      .catch(function () { return null; });
  }
  function loadHome() { return loadSetting("home"); }
```
e expor `loadSetting` e `loadHome` no objeto retornado. Atualizar o comentário de cabeçalho.

### 4.2 `js/main.js` (idêntico nas três páginas, exceto o nome do centro e o caminho do feed)
Tomar `taguatinga/js/main.js` atual (já com D14/D15) como base para as três páginas. Acrescentar, antes do bloco "HORÁRIOS & SERVIÇOS":
```js
  /* ===================== CAPA (settings.home no painel, com padrão local) ===================== */
  var HOME_KEY = "shalom:home:" + ((window.SHALOM && SHALOM.site) || window.SHALOM_SITE || "taguatinga");
  function escHtml(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" })[c]; }); }
  function resolveUrl(v) { try { return v ? new URL(v, location.href).href : ""; } catch (e) { return ""; } }
  function applyHome(row) {
    var base = window.SHALOM_HOME || {};
    var home = {
      titulo:     (row && row.titulo)     || base.titulo     || "",
      subtitulo:  (row && row.subtitulo)  || base.subtitulo  || "",
      imagem:     resolveUrl((row && row.imagem) || base.imagem || ""),
      imagem_alt: (row && row.imagem_alt) || base.imagem_alt || ""
    };
    var h1 = $(".hero h1"), sub = $(".hero__sub"), bg = $(".hero__bg");
    if (h1 && home.titulo) h1.innerHTML = escHtml(home.titulo).replace(/\n/g, "<br>");
    if (sub && home.subtitulo) sub.textContent = home.subtitulo;
    if (bg) {
      var img = bg.querySelector("img");
      if (home.imagem) {
        if (!img) { img = document.createElement("img"); img.setAttribute("fetchpriority", "high"); bg.appendChild(img); }
        img.alt = home.imagem_alt;
        if (img.src !== home.imagem) { img.classList.add("is-swapping"); img.onload = function () { img.classList.remove("is-swapping"); }; img.src = home.imagem; }
        bg.classList.remove("hero__bg--nophoto");
      } else {
        if (img) img.remove();
        bg.classList.add("hero__bg--nophoto");
      }
    }
    try { if (row) localStorage.setItem(HOME_KEY, JSON.stringify(home)); else localStorage.removeItem(HOME_KEY); } catch (e) {}
  }
  if (window.SHALOM && SHALOM.loadHome) { SHALOM.loadHome().then(applyHome).catch(function () { applyHome(null); }); }
  else { applyHome(null); }
```
(`$` já existe no IIFE.) Não remover nada do que já existe.

### 4.3 `index.html` (três páginas)
1. Logo **depois** do `</section>` do hero, inserir o script inline de cache:
```html
  <script>
  /* Capa editável no painel: aplica de imediato a última capa salva (cache local); js/main.js reconcilia depois com o banco. */
  (function () {
    try {
      var c = JSON.parse(localStorage.getItem("shalom:home:<site>") || "null"); if (!c) return;
      var h = document.querySelector(".hero h1"), s = document.querySelector(".hero__sub"), bg = document.querySelector(".hero__bg");
      var esc = function (t) { return String(t).replace(/[&<>"]/g, function (ch) { return ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" })[ch]; }); };
      if (c.titulo && h) h.innerHTML = esc(c.titulo).replace(/\n/g, "<br>");
      if (c.subtitulo && s) s.textContent = c.subtitulo;
      if (bg) {
        var img = bg.querySelector("img");
        if (c.imagem) { if (!img) { img = document.createElement("img"); img.setAttribute("fetchpriority", "high"); bg.appendChild(img); } img.alt = c.imagem_alt || ""; if (img.src !== c.imagem) img.src = c.imagem; bg.classList.remove("hero__bg--nophoto"); }
        else if (img) { img.remove(); bg.classList.add("hero__bg--nophoto"); }
      }
    } catch (e) {}
  })();
  </script>
```
2. Rodapé: dentro de `.footer-bottom`, após o `<span>Comunidade Católica Shalom</span>`, acrescentar `<a class="footer-admin" href="../admin/" rel="nofollow">Área de edição</a>`.
3. Nada mais muda no HTML (Santa Maria mantém `hero__bg--nophoto` sem `<img>`; o JS cria a imagem quando houver).

### 4.4 `css/styles.css` (três páginas, idênticos exceto a linha 2 de comentário)
- D8: logo após a linha `.nav-cta:hover { background: var(--blue-deep); }` inserir a regra de D8.
- No bloco "Ajustes locais" (que a Asa Sul também recebe), acrescentar:
```css
/* Capa editável: troca suave da imagem vinda do painel */
.hero__bg img { transition: opacity .35s var(--ease); }
.hero__bg img.is-swapping { opacity: .001; }
/* Link discreto para a área de edição no rodapé */
.footer-admin { color: rgba(255,255,255,.42); font-size: .78rem; }
.footer-admin:hover { color: #fff; }
```
- Asa Sul: comentário da linha 2 vira "Shalom Asa Sul — Layout (self-contained, Montserrat) — base compartilhada com Taguatinga e Santa Maria"; a linha do comentário `cev-data.js` (≈264) recebe o mesmo texto das irmãs. Depois disso `diff` entre os três CSS deve mostrar **só a linha 2**.

### 4.5 `js/data.js` — acrescentar `window.SHALOM_HOME` (seção 3) no topo de cada arquivo, com comentário curto.

### 4.6 Asa Sul: portar D15 (`evento.js` fallback `<strong>` + estilo inline em `evento.html`), regerar `e/` (`node scripts/build-event-pages.mjs` dentro de `asasul/`), e `main.js` conforme 4.2 (mantendo o caminho do feed `data/noticias.json` da Asa Sul).

### 4.7 `docs/seeds/2026-09-07-seed-cev.sql`
Gerado a partir dos `data.js` de Taguatinga e Santa Maria: `insert into public.settings (site,key,value) values (...) on conflict (site,key) do nothing;` para `schedules` e `home` (imagem absoluta de produção; Santa Maria `imagem: ""`), e `insert into public.events (...) values (...) on conflict (site,slug) do nothing;` para os 6 eventos (descrição em HTML como em 3). Cabeçalho explicando que é opcional, idempotente e para o fluxo do Portal.

### 4.8 Verificação do agente S
`node --check` em todos os `.js` tocados; `build-event-pages.mjs` nas três pastas; `diff` dos três CSS (só linha 2) e dos três `main.js` (só nome do centro e feed); screenshots 390/1280 das três páginas com `shot.mjs` (erros = []); teste de hover: script Playwright que faz `hover` em `.nav-cta` com o header rolado (`window.scrollTo(0,400)`) e lê `background-color`/`color` computados → devem ser `rgb(32, 79, 140)` e `rgb(255, 255, 255)`; teste da capa: `page.route` interceptando `**/rest/v1/settings*key=eq.home*` devolvendo `[{"value":{"titulo":"Linha 1\nLinha 2","subtitulo":"Teste","imagem":"https://brasilia.comshalom.org/images/shalom-brasilia.jpg","imagem_alt":"x"}}]` → h1 com `<br>`, sub trocado, `img.src` trocado, `localStorage` preenchido; recarregar com a rota devolvendo `[]` → volta ao padrão e cache removido.

## 5. Painel — agente P (Opus)

Arquivos: `admin/index.html`, `admin/admin.js`, `admin/admin.css`, `admin/ADMIN-SETUP.md`, `scripts/qa/admin-mock/*` (novos). Proibido: tudo o mais (em especial as pastas das páginas, `js/`, `supabase/`).

### 5.1 Catálogo e rótulos
- `SITE_CATALOG`: `asasul`, `taguatinga`, `santamaria` → `modules:["home","schedules","events"]` (nesta ordem: capa primeiro, como na página). `children` mantidos.
- `MODULE_LABELS`: `home:"Capa (topo da página)"`, `schedules:"Horários e serviços"`, `events:"Eventos e encontros"`, `menu:"Cardápio"`.
- Novo `MODULE_META` com, por módulo: `descricao` leiga ("A imagem de fundo, o título e a frase de apoio que abrem a página."; "Os seis cartões de horários: funcionamento, missas, grupos de oração, adoração, serviços e aconselhamento."; "Os cartões do carrossel 'Eventos e encontros' e a página de detalhe de cada um."), `onde` ("topo da página" / "logo abaixo do topo" / "seção 'Eventos e encontros'"), `ancora` (`""`, `"#horarios"`, `"#eventos"`) e um SVG esquemático (miniatura de página 3:4 com blocos cinza e a seção do módulo em azul).

### 5.2 Workspace claro (D10)
- Cards de módulo (`#workspaceModules`) e links do switcher mostram rótulo + descrição + miniatura esquemática.
- No topo de cada editor (`#tab-capa`, `#tab-horarios`, `#tab-eventos`): faixa `.editing-context` com "Você está editando **Shalom Taguatinga › Capa (topo da página)**", a miniatura, "Onde aparece: …", e botão "Ver no site" (`publicHref(item) + ancora`, `target=_blank`). Reutilizar `siteName`.
- Manter cardápio e usuários como estão.

### 5.3 Editor de Capa (`#tab-capa`, módulo `home`)
Campos: **Título** (`textarea`, 3 linhas, ajuda "Cada linha do campo vira uma linha do título na página"); **Frase de apoio** (`input`); **Imagem de fundo** (uploader com prévia, botão "Enviar imagem", "Remover imagem", ajuda "JPG ou PNG na horizontal, de preferência com 1600 px de largura ou mais. A imagem é ajustada automaticamente."); **Prévia ao vivo** (`.capa-preview`, proporção 16:9, imagem de fundo + o mesmo escurecimento do site + título/frase em branco, atualizada a cada tecla; rótulo "Prévia aproximada — o site usa a fonte Montserrat"); botão **Salvar capa** + `msg`. Sem imagem → prévia mostra o gradiente institucional (mesmo gradiente do `.hero__bg--nophoto`).
- Carregar: `settings.home` do site; se não houver linha → pré-preencher com `SHALOM_HOME` local (seção 5.5) e mostrar aviso `.notice--info`: "Estes dados vieram do arquivo do site e ainda não foram salvos aqui. Revise e clique em Salvar capa para passar a controlá-los pelo painel."
- Salvar: `upsert settings { site, key:"home", value:{titulo, subtitulo, imagem, imagem_alt}, updated_at }` com `onConflict:"site,key"`. `imagem_alt` = "Centro de Evangelização " + nome curto (derivar de `siteName` sem "Shalom "). Título vazio não é permitido (mensagem clara).
- Upload: `resizeImage(file, 1920, 0.85)` → `sb.storage.from("eventos").upload("<site>/capa-<Date.now()>.jpg", blob, {upsert:true, cacheControl:"3600", contentType:"image/jpeg"})` → URL pública em `imagem`.

### 5.4 Horários e Eventos com dados locais (D2)
- `loadSchedules()`: se não houver linha (`res.data` vazio) → preencher os `textarea` com `SHALOM_SCHEDULES` local e mostrar o aviso (mesmo texto adaptado: "…clique em Salvar horários…"). Se houver linha, comportamento atual.
- `loadEvents()`/`renderList()`: depois da lista remota, seção "No site, mas ainda não no painel" com os eventos locais `featuredLocal === true` cujo `id` (slug) não existe em `currentEvents`: cartão com miniatura (imagem local resolvida para URL absoluta de produção, ou pôster cinza), título, data, e botão **Trazer para o painel**; acima, botão **Trazer todos** e texto: "Estes eventos estão gravados no arquivo do site. Ao trazer, passam a ser editados só por aqui." Trazer = `insert` na tabela `events` com os campos da seção 3 (`position` = maior posição atual + 1, na ordem local), depois `loadEvents()`. Se nenhum local pendente, a seção não aparece.
- Asa Sul também se beneficia (tem 4 eventos `featuredLocal` que não estão no banco).

### 5.5 Leitura dos dados locais do site
`loadSiteLocalData(siteId)` → `fetch("../" + siteId + "/js/data.js", {cache:"no-store"})` → texto → `new Function("window", src)(sandbox)` com `sandbox = {}` → `{ home: sandbox.SHALOM_HOME||null, schedules: sandbox.SHALOM_SCHEDULES||null, events: sandbox.SHALOM_EVENTOS||[] }`; cache em memória por site; falha (404, erro) → `{home:null, schedules:null, events:[]}` sem quebrar o painel. Conversão de URL local → absoluta de produção: `new URL(path, "https://brasilia.comshalom.org/" + siteId + "/").href` (`PUBLIC_ORIGIN` constante).

### 5.6 Mock e testes (D11) — `scripts/qa/admin-mock/`
- `mock-supabase.js`: substitui `window.supabase.createClient` por um cliente em memória: `auth.getSession/getUser/onAuthStateChange/signOut` com usuário master fictício (`id`, `email` fictício `editor@example.test`); `from(tabela)` com `select/eq/order/limit/insert/update/upsert/delete/single` encadeáveis e `then`; tabelas iniciais: `sites` (4 linhas reais), `profiles` (master), `page_permissions` (vazio), `settings` (só `asasul/schedules`), `events` (só os 4 da Asa Sul semeados, com os campos reais); `storage.from(bucket).upload/getPublicUrl` fictícios. Expor `window.__mockDB` para inspeção.
- `run.mjs` (Playwright, Chrome em `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, `createRequire` de `inscricoes/package.json`, servidor `http://127.0.0.1:8766/` = raiz do repo): injeta o mock com `addInitScript`, abre `/admin/#page/taguatinga/home`, verifica pré-preenchimento com `SHALOM_HOME`, edita e salva → `__mockDB.settings` tem `home` de `taguatinga`; `#page/taguatinga/schedules` → pré-preenchido, salva → linha `schedules`; `#page/taguatinga/events` → 4 locais pendentes, "Trazer todos" → 4 linhas em `events` com `image_url` absoluta e `description` em HTML; repete para `santamaria` (2 eventos) e `asasul` (4 pendentes; capa pré-preenchida com a imagem da Asa Sul). Screenshots 1280 e 390 de cada editor em `scripts/qa/admin-mock/shots/` (gitignored? não — são pequenos; ok versionar apenas se ≤ 300 KB cada, senão só no scratchpad). Sem erros de console.
- `README.md` curto explicando como rodar: `cd ~/Documents/GitHub/Shalom && python3 -m http.server 8766` + `node scripts/qa/admin-mock/run.mjs`.

### 5.7 Documentação — `admin/ADMIN-SETUP.md`
Seção "Capa (topo da página)"; seção "Trazer dados do site para o painel" (o que é, quando aparece, o que acontece); **checklist pós-publicação** para o João: entrar como master → para cada página (Asa Sul, Taguatinga, Santa Maria): Capa → Salvar; Horários → Salvar; Eventos → Trazer todos; depois "Usuários e acessos" → conceder páginas aos editores; observação sobre `og:image` (D6).

## 6. QA — agente Q (Opus), depois de S e P
Servidores: `8765` (raiz `~/Documents/GitHub`, URLs `/Shalom/...`) e `8766` (raiz do repo, para URLs absolutas `/taguatinga/...`). Verificar: seção 8 da spec anterior nas três páginas (Asa Sul agora incluída) com `compare.mjs`/`shot.mjs`; D8 hover; D9 link; D5 com `page.route`; painel com o mock (`run.mjs`) + revisão adversarial do `admin.js` (RLS: nenhuma escrita fora do `site` atual; upload só em `<site>/`; nenhuma credencial; nenhum `innerHTML` com dado remoto sem `esc`); `node --check` em tudo; nenhum arquivo alheio tocado (`git status` limitado à lista da seção 8). Veredito por frente: `site: pass|revise`, `painel: pass|revise`.

## 7. Pendências (João)
- Pós-publicação: checklist da 5.7 (import por página e acessos dos editores).
- Continuam: validar QR Pix; foto de Santa Maria (agora pode ser enviada pelo painel, sem commit); WhatsApps; endereço "QC 1, Casa 7"; rótulo "10%".
- `og:image` só muda com commit (D6).

## 8. Arquivos desta sessão (e só estes) para a branch de publicação
`asasul/{index.html,evento.html,css/styles.css,js/data.js,js/main.js,js/evento.js,e/**}`, `taguatinga/**`, `santamaria/**`, `images/shalom-taguatinga.webp`, `js/store.js`, `admin/{index.html,admin.js,admin.css,ADMIN-SETUP.md}`, `scripts/qa/admin-mock/**`, `docs/decisoes/2026-09-07-cev-taguatinga-santamaria.md`, `docs/decisoes/2026-09-07-cev-capa-editavel-e-vinculo-ao-painel.md`, `docs/seeds/2026-09-07-seed-cev.sql`. `AGENTS.md` é gitignored.

## 9. Registro da execução (2026-09-07, segunda rodada)

**Topologia:** agente S (Sonnet) para as três páginas + `js/store.js` + seed SQL; agente P (Opus) para o painel + mock de testes; depois agente Q (Opus) adversarial. Correções pós-QA aplicadas pelo orquestrador. Sem commit na working tree principal; branch de publicação montada em worktree separada (D12).

**QA (Opus):** `repositorio: pass` (nenhum arquivo alheio tocado; nenhuma migration nova; `js/footer.js` intacto); `site: revise` → M1 (imagem removida caía no padrão local), M2 (imagem quebrada deixava o topo em branco), B1 (link do rodapé perdia especificidade), B2 (`HOME_KEY` com literal errado); `painel: revise` → B3 (`toPublicUrl` aceitava esquemas arbitrários), B4 (asserção vazia no `run.mjs`), B5 (snippet do ADMIN-SETUP sem `js/events.js`). **Todos corrigidos e reverificados** (D13–D15): teste de casos-limite da capa (imagem removida → gradiente nas três páginas; 404 → gradiente), hover do `.nav-cta` `rgb(32,79,140)`/branco nos dois estados do header, rodapé 5,26:1, screenshots sem erros, `run.mjs` 226/226 com screenshots em `$TMPDIR`.

**Verificações que já passavam (QA):** Asa Sul pixel-idêntica à referência anterior fora o link do rodapé; estrutura/estilos computados iguais entre as três páginas (exceções deliberadas: hero sem foto e controles do carrossel em Santa Maria); D5 (capa por `page.route`, cache aplicado antes do `main.js`, reconciliação e limpeza do cache, 1 única requisição da imagem do hero sem linha no banco); `e/` regenerado e idêntico à reconstrução em sandbox; seed SQL bate campo a campo com os `data.js`; revisão adversarial do `admin.js` (escopo por site, uploads só em `<site>/`, escape de HTML em todo dado local/remoto, 23505 tratado, rotas corretas, sem regressão em cardápio/usuários); UX do que é novo com estados, foco visível, sem `<select>` nativo.

**Observações do QA não tratadas (decisão do João):** prévia da capa vem antes dos campos no celular (escolha do agente P; QA preferiria depois); contexto repetido no topo dos editores; `imagem_alt` não editável; erro de RLS cru no salvar de Horários e escritas por `id` sem `.eq("site")` no editor de eventos (pré-existentes); `PANELS/.tab` morto no `admin.js` (pré-existente); seed grava `null` onde o painel grava `""` (equivalentes).

**Como publicar (ação do João):** a branch `feat/cev-editavel` (worktree `~/Documents/GitHub/Shalom-cev`) contém só os arquivos da seção 8. Opção A (revisão): `git push -u origin feat/cev-editavel` e abrir PR para `main`. Opção B (direto): `git -C ~/Documents/GitHub/Shalom-cev push origin feat/cev-editavel:main` (se `origin/main` tiver avançado — o workflow de notícias faz commits de hora em hora — rebase antes: `git -C ~/Documents/GitHub/Shalom-cev pull --rebase origin main`). O push na `main` publica no GitHub Pages em poucos minutos.

**Depois de publicar (checklist, também em `admin/ADMIN-SETUP.md` §2.2):** entrar em `/admin/` como master → para cada página (Asa Sul, Taguatinga, Santa Maria): Capa → Salvar capa; Horários → Salvar horários; Eventos → Trazer todos → depois "Usuários e acessos" para conceder as páginas aos editores. A partir daí o banco governa e o `data.js` é só reserva.
