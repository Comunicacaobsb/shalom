# Réplica da página nova da Asa Sul para Taguatinga e Santa Maria

**Data:** 2026-09-07 · **Repo:** `~/Documents/GitHub/Shalom` (site público brasilia.comshalom.org) · **Branch de trabalho:** `main` (working tree). Commit **não** foi feito nesta sessão (não foi pedido); comandos sugeridos na seção 10. **Nunca dar push sem decisão do João** (push na `main` = deploy no GitHub Pages).
**Pedido do João:** replicar, pixel-perfect, o layout/estrutura/atualizações da página `asasul/` nas páginas `taguatinga/` e `santamaria/`, respeitando dados e imagens de cada centro, e refletir isso na página logada (painel `/admin/`).

Este arquivo é a **especificação fechada** lida pelos agentes executores e o registro de decisões da sessão. Classificação: **Fato** (verificado), **Decisão** (aprovado nesta sessão), **Pendente** (depende do João).

---

## 1. Fatos verificados (estado antes da mudança)

- `asasul/` é a referência: página self-contained (não usa `js/header.js`, `js/footer.js`, `js/centralScript.js`, Bootstrap nem `js/cev-data.js`). Fonte Montserrat via Google Fonts no próprio `<head>`, GA inline, favicons em `../favicon/`. Arquivos: `index.html`, `evento.html`, `css/styles.css`, `js/{data,events,evento,main}.js`, `scripts/build-event-pages.mjs`, `e/<slug>/index.html` (gerados), `data/noticias.json`, `images/pix-qr.png`, `images/eventos/*`.
- Scripts compartilhados usados pela Asa Sul: `js/config.js` (Supabase anon), `js/store.js` (camada de dados por `window.SHALOM_SITE`), `js/share.js`. Não mudam.
- `taguatinga/` e `santamaria/` estão no template antigo "link-in-bio" (Bootstrap + `header.js` + `cev-data.js` lendo CSV do Google Sheets). `santamaria/` reaproveita `../taguatinga/css/styles.css` e `../taguatinga/js/main.js`.
- Supabase (leitura pública via anon, verificada em 2026-09-07): `sites` contém `asasul`, `taguatinga`, `santamaria`, `sh82cafe`. **Não há** `events` nem `settings.schedules` para `taguatinga`/`santamaria`. Para esses sites, `store.js`/`events.js` caem no fallback local (`js/data.js`).
- Painel `admin/admin.js`: `SITE_CATALOG` tem `taguatinga` e `santamaria` como `type:"readonly", modules:[]` — por isso não aparecem como editáveis. O RLS já permite edição por `can_edit(site)`; só falta o catálogo do painel.
- Dados oficiais do CSV (Google Sheets publicado, lido em 2026-09-07):
  - Taguatinga (gid 1544384770): funcionamento "Seg a sab: 14h às 22h"; missa "Segunda às 18h30", "Domingo às 10h", "Missa Jovem no 2º sábado as 17h"; adoração "Seg a sex: 14h30 às 21h"; aconselhamento "Seg a sex: 14h30 às 21h"; grupos "Grupo de casais: sábado às 17h", "Grupo aberto: quinta às 19h30", "Grupo jovem: sábado às 14h30"; serviços "Bazar/Livraria/Lanchonete: seg a sáb 14h às 21h"; comunhão 10% `economatotaguatinga@comshalom.org`; 5% `secomunitariabrasilia@comshalom.org` (comprovantes nos mesmos e-mails).
  - Santa Maria (gid 2112708025): funcionamento "Seg a sab: 14h às 22h"; missa "a confirmar"; adoração "Quinta: 14h às 18h"; aconselhamento "Seg a sex: 14h às 18h"; grupos "Grupo de adultos: terça às 19h30", "Grupo de adultos: quinta às 19h30", "Grupo de jovens: sábado às 17h"; serviços "Livraria: seg a sáb 14h às 21h"; comunhão 10% `economatosantamaria@comshalom.org`; 5% `secomunitariabrasilia@comshalom.org`.
- Endereços e contatos (comshalom.org/brasilia + ficha do Google Maps, 2026-09-07):
  - Taguatinga: **QNA 26, Setor A Norte — Taguatinga/DF** (CEP 72010-110). comshalom.org lista (61) 3264-6459 / (61) 98315-0222. A página antiga usava WhatsApp `wa.me/556184888904` "(61) 8488-8904" (formato anterior ao 9º dígito).
  - Santa Maria: **QC 1, Casa 7 — Santa Maria/DF** (CEP 72509-500; "Casa 7" só na ficha do Google). comshalom.org lista **(61) 99311-6530**.
  - Instagram: `@shalomtaguatinga` e `@shalomsantamariabsb` (perfis respondem 200).
  - Calendário Google: ambos já usavam o mesmo ID da Asa Sul (`n9c03lrse3tl4uvt381d3is5jo@group.calendar.google.com`).
- Blog de avisos de Taguatinga (`shalomtaguatinga.blogspot.com`): 2 posts, ambos de 2025-11-05, um deles "teste de avisos" → morto.
- QR Pix da Asa Sul (`asasul/images/pix-qr.png`) decodificado: BR Code estático (`br.gov.bcb.pix`, chave e-mail, nome "COMUNIDADE CATOLICA SHALO", cidade "BRASILIA", CRC16 válido).
- Imagens disponíveis: `taguatinga/images/hero.jpg` (fachada com logo, 5184×3456, 4,8 MB) e `taguatinga/images/grupos-oracao.jpg` (ícone de Maria, 5 MB). **Santa Maria não tem nenhuma foto** no repo nem no disco.

## 2. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | Réplica **por cópia** dos arquivos da Asa Sul em cada pasta (mesmo padrão documentado em `admin/ADMIN-SETUP.md`), com substituição controlada das strings do centro. CSS copiado **verbatim** + bloco "Ajustes locais" no fim. | Pixel-perfect e zero risco para a Asa Sul. Consolidar num template compartilhado fica como sugestão futura. |
| D2 | Trabalho em pastas disjuntas na mesma working tree (sem worktree). Agentes não fazem commit. | O cwd da sessão não é o repo; pastas são disjuntas; o QA precisa ver tudo junto no mesmo servidor. |
| D3 | Feed de notícias: as novas páginas leem `../asasul/data/noticias.json` (mesmo feed da página Brasília, atualizado a cada hora pelo workflow `asasul-news.yml`). | Notícias são da missão, não do centro; evita mexer no workflow/Asa Sul. Acoplamento documentado. |
| D4 | Avisos do Blogger (Taguatinga) são **removidos**. | Feed morto; a estrutura nova cobre avisos via Eventos (painel). |
| D5 | Google Sheets/`cev-data.js` deixam de ser usados nas duas páginas; os dados do CSV viram `js/data.js` (`SHALOM_SCHEDULES`) e, depois de publicado, o painel `/admin/` passa a ser a fonte (ao salvar Horários pela primeira vez, preencher **todas** as categorias). | Mesma arquitetura da Asa Sul. |
| D6 | Grupos de oração e a Missa Jovem viram **eventos locais `featuredLocal`** em `data.js` (pôster de reserva quando não há arte), como Kyrios/Amare na Asa Sul. Slugs fixos (seção 5). Painel pode sobrepor criando um evento com o mesmo slug. | Mantém o carrossel populado com informação verificada do próprio CSV. |
| D7 | Carrossel sem nenhum evento: `main.js` esconde a seção `#eventos` e os links `a[href="#eventos"]`. | Degradação honesta caso os locais sejam removidos. |
| D8 | Comunhão de bens mostra **10% e 5%** (dois blocos `.pix-key`), sem agência/conta (desconhecidas), sem WhatsApp do economato (desconhecido). QR = chave do 10%. | Respeita os dados de cada centro; não inventa dados bancários. |
| D9 | QR Pix gerado localmente (BR Code estático, txid `***`, nome "COMUNIDADE CATOLICA SHALO", cidade "BRASILIA"), verificado por decodificação. **Pendente: validação do economato antes de publicar.** | Sem QR o painel perde a coluna direita da referência. Chave é o que define o destinatário. |
| D10 | Hero de Taguatinga: `images/shalom-taguatinga.webp` (1600×900, gerado da fachada). Hero de Santa Maria: **sem foto** → `div.hero__bg.hero__bg--nophoto` com gradiente institucional; `og:image` = `images/shalom-brasilia.jpg`. **Pendente: foto do centro.** | Não usar foto de outro centro nem placeholder sintético. |
| D11 | WhatsApp: Taguatinga (61) 98488-8904 (`wa.me/5561984888904` — número da página antiga normalizado com o 9º dígito obrigatório desde 2016); Santa Maria (61) 99311-6530 (`wa.me/5561993116530`, fonte comshalom.org). **Pendente: confirmar os números.** | Melhor evidência disponível, rastreável. |
| D12 | Painel: `taguatinga` e `santamaria` passam a `type:"editable", modules:["events","schedules"]` com `children` apontando para as páginas `e/<slug>/`. Nenhuma migration, nenhum `db push`, nenhuma escrita no Supabase. | É o que falta para a "página logada" editar os dois centros. |
| D13 | Arquivos antigos `taguatinga/images/hero.jpg` e `grupos-oracao.jpg` ficam no lugar (fontes das artes); README documenta. `taguatinga/css/styles.css` e `js/main.js` antigos são substituídos (histórico no git). | Não destrutivo nesta rodada. |
| D14 | Carrossel: loop infinito (clones + autoplay) só quando há mais eventos do que cabem na tela (`visibleNow()` espelha os breakpoints 640/980 do CSS); com poucos eventos a fita fica estática, sem repetir card, controles ocultos, teclado/swipe travados nos limites. Só nas duas páginas novas (`main.js`); Asa Sul intocada. | QA confirmou que Santa Maria (2 eventos) mostrava o mesmo card duas vezes em ≥980px. |
| D15 | Pôster de reserva: `<h4>` → `<h3>` no carrossel (ordem h2 > h3) e `<strong>` na página de evento (evita h2 antes do h1), com CSS local reproduzindo o visual do h4 da Asa Sul. | Critério 8.6 (ordem de títulos); a Asa Sul não expõe o problema porque todos os eventos têm arte. |
| D16 | Comentários de código podem citar o centro certo e não citar `cev-data.js`; `twitter:image` adicionada nas duas páginas. "Verbatim" (D1) vale para regras/seletores/valores, não para comentários. | Critério 8.3 e consistência entre as páginas irmãs. |

## 3. Ativos já gerados e verificados (não regerar)

- `images/shalom-taguatinga.webp` — 1600×900, 52 KB (hero + `og:image` de Taguatinga).
- `taguatinga/images/eventos/grupo-aberto.webp` — 800×1000 (4:5), arte do evento `grupo-aberto`.
- `taguatinga/images/pix-qr.png` — decodifica para a chave `economatotaguatinga@comshalom.org` (CRC `EB89`).
- `santamaria/images/pix-qr.png` — decodifica para `economatosantamaria@comshalom.org` (CRC `D238`).

## 4. Estrutura-alvo de cada pasta (`<slug>` = `taguatinga` | `santamaria`)

```
<slug>/
├── index.html                  ← cópia de asasul/index.html com as substituições da seção 5
├── evento.html                 ← cópia de asasul/evento.html (strings do centro)
├── css/styles.css              ← cópia VERBATIM de asasul/css/styles.css + bloco final "Ajustes locais" (seção 6)
├── js/data.js                  ← SHALOM_SCHEDULES + SHALOM_EVENTOS do centro (seção 5)
├── js/events.js                ← cópia; default do site = "<slug>"; comentário de cabeçalho ajustado
├── js/evento.js                ← cópia; "Shalom Asa Sul" → nome do centro
├── js/main.js                  ← cópia + 3 ajustes da seção 6
├── scripts/build-event-pages.mjs ← cópia; SITE/BASE/og:site_name/título/imagem padrão do centro
├── e/<slug-evento>/index.html  ← GERADOS por `node scripts/build-event-pages.mjs` (rodar dentro da pasta)
├── images/pix-qr.png           ← já existe
├── images/eventos/             ← Taguatinga: grupo-aberto.webp (já existe). Santa Maria: pasta não é necessária.
└── README.md                   ← documentação da página (Taguatinga: reescrever; Santa Maria: criar)
```

Arquivos antigos que **deixam de existir/ser usados**: `taguatinga/js/main.js` (substituído), `taguatinga/css/styles.css` (substituído), referências a `../js/header.js`, `../js/centralScript.js`, `../js/cev-data.js`, `../js/footer.js`, `window.cevCsvUrl`, `.toast` do Bootstrap, JSON-LD antigo.

Ordem de scripts no fim do `index.html` (idêntica à Asa Sul, trocando o site):
```html
<script>window.SHALOM_SITE = "<slug>";</script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/config.js"></script>
<script src="js/data.js"></script>
<script src="../js/store.js"></script>
<script src="js/events.js"></script>
<script src="../js/share.js"></script>
<script src="js/main.js"></script>
```

## 5. Substituições por centro

### 5.1 Tabela de strings (aplicar em `index.html`, `evento.html`, `js/evento.js`, `js/main.js`, `scripts/build-event-pages.mjs`, `js/events.js`)

| Onde (Asa Sul) | Taguatinga | Santa Maria |
|---|---|---|
| `<title>Shalom Asa Sul</title>`, `og:site_name`, `og:title` | Shalom Taguatinga | Shalom Santa Maria |
| `meta description` | Horários, missas, grupos de oração, eventos, localização e comunhão de bens do Centro de Evangelização Shalom Taguatinga. | idem com "Shalom Santa Maria" |
| `og:description` | Centro de Evangelização Shalom Taguatinga — horários, eventos e comunidade. | idem |
| `og:url` / `canonical` | https://brasilia.comshalom.org/taguatinga/ | https://brasilia.comshalom.org/santamaria/ |
| `og:image` | https://brasilia.comshalom.org/images/shalom-taguatinga.webp | https://brasilia.comshalom.org/images/shalom-brasilia.jpg |
| `.brand` aria-label / `.brand-txt` | "Shalom Taguatinga — início" / `Taguatinga<small>Centro de Evangelização</small>` | "Shalom Santa Maria — início" / `Santa Maria<small>…</small>` |
| Hero `<img>` | `<img src="../images/shalom-taguatinga.webp" alt="Centro de Evangelização Shalom Taguatinga" fetchpriority="high" />` | **sem `<img>`**: `<div class="hero__bg hero__bg--nophoto"></div>` + comentário HTML explicando como colocar a foto |
| Hero `h1` | `Um lugar para<br>encontrar Deus<br>em Taguatinga` | `Um lugar para<br>encontrar Deus<br>em Santa Maria` |
| Hero eyebrow / sub / botões | iguais à Asa Sul | iguais |
| `#horarios` `.section-head p` | Missas, adoração, grupos de oração e serviços. Todos são bem-vindos. | idem |
| Card 4 `h3` | `Adoração` (sem "— Capela Kyrios") | `Adoração` |
| Card 5 `h3` + ícone | `Serviços` com o ícone de sacola da seção 6 (id continua `field-servicos`) | idem |
| Carrossel `aria-label` | Eventos do Shalom Taguatinga | Eventos do Shalom Santa Maria |
| `#mapa` `.section-head p` | Centro de Evangelização Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF. | Centro de Evangelização Shalom Santa Maria — QC 1, Casa 7, Santa Maria/DF. |
| iframe mapa `title` / `src` | "Mapa do Shalom Taguatinga" / `https://www.google.com/maps?q=Shalom+Taguatinga&output=embed` | "Mapa do Shalom Santa Maria" / `https://www.google.com/maps?q=Shalom+Santa+Maria+DF&output=embed` |
| Botão "Abrir no Google Maps" | `https://maps.google.com/?q=Shalom+Taguatinga` | `https://maps.google.com/?q=Shalom+Santa+Maria+DF` |
| `#noticias` | idêntico à Asa Sul | idêntico |
| iframe calendário `title` | Calendário do Shalom Taguatinga (mesmo `src`) | Calendário do Shalom Santa Maria |
| `#instagram` kicker / links / iframe | `@shalomtaguatinga` · `https://instagram.com/shalomtaguatinga` · `https://www.instagram.com/shalomtaguatinga/embed` · title "Instagram do Shalom Taguatinga" | `@shalomsantamariabsb` · `https://instagram.com/shalomsantamariabsb` · `https://www.instagram.com/shalomsantamariabsb/embed` |
| `#doacoes` `h2` | Comunhão de bens — Obra Taguatinga | Comunhão de bens — Obra Santa Maria |
| `.tithe__lead` | igual à Asa Sul | igual |
| Painel Pix | ver 5.2 | ver 5.2 |
| `.tithe__qr` | `<img src="images/pix-qr.png" alt="QR Code do Pix — economatotaguatinga@comshalom.org" width="220" height="220" />` + `<span>Pix • Obra Taguatinga</span>` | alt com `economatosantamaria@comshalom.org` + `Pix • Obra Santa Maria` |
| Footer `.footer-brand p` | Comunidade Católica Shalom — Brasília. Um lar de oração, comunhão e missão em Taguatinga. | … em Santa Maria. |
| Footer "Contato" | Instagram @shalomtaguatinga · comshalom.org/brasilia · WhatsApp (61) 98488-8904 → `https://wa.me/5561984888904` · "QNA 26, Setor A Norte — Taguatinga/DF" → link do Maps | Instagram @shalomsantamariabsb · comshalom.org/brasilia · WhatsApp (61) 99311-6530 → `https://wa.me/5561993116530` · "QC 1, Casa 7 — Santa Maria/DF" → link do Maps |
| Footer bottom | © <year> Centro de Evangelização Shalom Taguatinga. | … Shalom Santa Maria. |
| FAB WhatsApp `href` | `https://wa.me/5561984888904` | `https://wa.me/5561993116530` |
| `evento.html` `<title>` / footer / brand | "Evento — Shalom Taguatinga" / "© <year> Centro de Evangelização Shalom Taguatinga." | idem Santa Maria |
| `js/evento.js` sufixos " — Shalom Asa Sul" e "Evento não encontrado — Shalom Asa Sul" | " — Shalom Taguatinga" | " — Shalom Santa Maria" |
| `js/main.js` `esc(ev.badge \|\| "Shalom Asa Sul")` | "Shalom Taguatinga" | "Shalom Santa Maria" |
| `js/events.js` `\|\| "asasul"` e comentário "Fonte de eventos da Asa Sul" | "taguatinga" / "de Taguatinga" | "santamaria" / "de Santa Maria" |
| `build-event-pages.mjs` `BASE`, `og:site_name`, sufixo do título, imagem padrão | `SITE + "/taguatinga"`, "Shalom Taguatinga", " — Shalom Taguatinga", `SITE + "/images/shalom-taguatinga.webp"` | `SITE + "/santamaria"`, "Shalom Santa Maria", " — Shalom Santa Maria", `SITE + "/images/shalom-brasilia.jpg"` |

Manter também (herdado das páginas antigas, invisível): metas `twitter:*` e um JSON-LD `Organization` com `name`, `url`, `sameAs` (Instagram) e `address` (`PostalAddress` com `streetAddress`, `addressLocality` "Brasília", `addressRegion` "DF", `postalCode`). Sem `contactPoint`.

### 5.2 Painel de Pix (substitui o bloco `.tithe__info` interno da Asa Sul; classes existentes, sem CSS novo além do da seção 6)

```html
<div class="tithe__info">
  <div class="pct">10%</div>
  <h3>Como contribuir pelo Pix</h3>
  <p class="tithe__note">Aponte a câmera para o QR Code ou copie a chave abaixo.</p>

  <div class="pix-key">
    <div class="pix-key__label">Chave Pix — 10% (e-mail)</div>
    <div class="pix-key__row">
      <code id="pixKey">economatotaguatinga@comshalom.org</code>
      <button class="pix-copy" id="pixCopy" data-copy="economatotaguatinga@comshalom.org" aria-label="Copiar chave Pix do 10%">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
        Copiar
      </button>
    </div>
  </div>

  <div class="pix-key">
    <div class="pix-key__label">Chave Pix — 5% (e-mail)</div>
    <div class="pix-key__row">
      <code id="pixKey5">secomunitariabrasilia@comshalom.org</code>
      <button class="pix-copy" id="pixCopy5" data-copy="secomunitariabrasilia@comshalom.org" aria-label="Copiar chave Pix do 5%">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
        Copiar
      </button>
    </div>
  </div>

  <div id="field-comunhao10" hidden></div>

  <p class="tithe__note tithe__note--sm">
    Envie seu comprovante para <a href="mailto:economatotaguatinga@comshalom.org">economatotaguatinga@comshalom.org</a> (10%)
    ou <a href="mailto:secomunitariabrasilia@comshalom.org">secomunitariabrasilia@comshalom.org</a> (5%).
  </p>
</div>
```
Santa Maria: trocar `economatotaguatinga@` por `economatosantamaria@`. **Não** incluir `<dl class="pix-bank">`.

### 5.3 `js/data.js` — Taguatinga

```js
window.SHALOM_SCHEDULES = {
  funcionamento: ["Segunda a sábado: 14h às 22h"],
  missa:         ["Segunda: 18h30", "Domingo: 10h", "Missa Jovem: 2º sábado do mês, às 17h"],
  grupos:        ["Grupo de casais: sábado às 17h", "Grupo aberto: quinta às 19h30", "Grupo jovem: sábado às 14h30"],
  adoracao:      ["Segunda a sexta: 14h30 às 21h"],
  servicos:      ["Bazar: segunda a sábado, 14h às 21h", "Livraria: segunda a sábado, 14h às 21h", "Lanchonete: segunda a sábado, 14h às 21h"],
  aconselhamento:["Segunda a sexta: 14h30 às 21h"]
};
```
Eventos (ordem = ordem no carrossel; todos `featuredLocal: true`, `link: null`):

| id | titulo | badge | data | local | imagem | acao |
|---|---|---|---|---|---|---|
| `grupo-aberto` | Grupo de Oração Aberto | Grupo de oração | Toda quinta-feira às 19h30 | Shalom Taguatinga — QNA 26, Taguatinga | `images/eventos/grupo-aberto.webp` | Saiba mais |
| `grupo-de-casais` | Grupo de Oração de Casais | Grupo de oração | Todo sábado às 17h | idem | `""` (pôster de reserva) | Saiba mais |
| `grupo-jovem` | Grupo de Oração Jovem | Grupo de oração | Todo sábado às 14h30 | idem | `""` | Saiba mais |
| `missa-jovem` | Missa Jovem | Missa especial | 2º sábado do mês, às 17h | idem | `""` | Ver programação |

Textos (resumo / descricao, texto simples com quebras como na Asa Sul):
- grupo-aberto — resumo: "Um grupo de oração aberto a todos. Venha rezar, louvar e caminhar em comunidade." · descricao: "O Grupo de Oração Aberto do Shalom Taguatinga acolhe todas as pessoas que desejam rezar e louvar em comunidade. Não é preciso ser membro: basta chegar.\n\nQuando: toda quinta-feira, às 19h30.\nOnde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF.\n\nVenha e traga um amigo."
- grupo-de-casais — resumo: "Um espaço para os casais rezarem juntos e fortalecerem a vida a dois em Deus." · descricao: "O Grupo de Oração de Casais do Shalom Taguatinga reúne casais para rezar, partilhar e crescer juntos na fé.\n\nQuando: todo sábado, às 17h.\nOnde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF."
- grupo-jovem — resumo: "Um grupo de oração para jovens que querem viver a fé com alegria e intensidade." · descricao: "O Grupo de Oração Jovem do Shalom Taguatinga é um espaço para a juventude louvar, rezar e caminhar em comunidade.\n\nQuando: todo sábado, às 14h30.\nOnde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF.\n\nVenha e traga um amigo."
- missa-jovem — resumo: "Uma Santa Missa celebrada com a juventude, todo segundo sábado do mês." · descricao: "A Missa Jovem é a Santa Missa celebrada com a juventude do Shalom Taguatinga.\n\nQuando: todo segundo sábado do mês, às 17h.\nOnde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF.\n\nTodos são bem-vindos."

### 5.4 `js/data.js` — Santa Maria

```js
window.SHALOM_SCHEDULES = {
  funcionamento: ["Segunda a sábado: 14h às 22h"],
  missa:         [],
  grupos:        ["Grupo de adultos: terça às 19h30", "Grupo de adultos: quinta às 19h30", "Grupo de jovens: sábado às 17h"],
  adoracao:      ["Quinta: 14h às 18h"],
  servicos:      ["Livraria: segunda a sábado, 14h às 21h"],
  aconselhamento:["Segunda a sexta: 14h às 18h"]
};
```
(`missa: []` renderiza "A confirmar", fiel ao CSV.)

| id | titulo | badge | data | local | imagem | acao |
|---|---|---|---|---|---|---|
| `grupo-de-adultos` | Grupo de Oração de Adultos | Grupo de oração | Terças e quintas às 19h30 | Shalom Santa Maria — QC 1, Santa Maria | `""` | Saiba mais |
| `grupo-de-jovens` | Grupo de Oração de Jovens | Grupo de oração | Todo sábado às 17h | idem | `""` | Saiba mais |

- grupo-de-adultos — resumo: "Um grupo de oração para adultos rezarem, louvarem e caminharem juntos em comunidade." · descricao: "O Grupo de Oração de Adultos do Shalom Santa Maria reúne a comunidade para rezar, louvar e partilhar a fé.\n\nQuando: terças e quintas-feiras, às 19h30.\nOnde: Shalom Santa Maria — QC 1, Casa 7, Santa Maria/DF.\n\nVenha e traga um amigo."
- grupo-de-jovens — resumo: "Um grupo de oração para jovens que querem viver a fé com alegria e intensidade." · descricao: "O Grupo de Oração de Jovens do Shalom Santa Maria é um espaço para a juventude louvar, rezar e caminhar em comunidade.\n\nQuando: todo sábado, às 17h.\nOnde: Shalom Santa Maria — QC 1, Casa 7, Santa Maria/DF.\n\nVenha e traga um amigo."

Cabeçalho de comentário do `data.js`: manter o da Asa Sul (explica os campos), trocando "Asa Sul" pelo centro e a frase sobre `featuredLocal` ("Eventos marcados com featuredLocal aparecem mesmo com o Supabase ativo, até existir um evento remoto com o mesmo slug").

## 6. Ajustes de código permitidos (e só estes)

### 6.1 `css/styles.css` — bloco final, depois da última regra da Asa Sul
```css
/* ---------- Ajustes locais (Taguatinga / Santa Maria) ---------- */
/* Dois blocos de chave Pix (10% e 5%) no painel de comunhão de bens */
.pix-key + .pix-key { margin-top: .8rem; }
/* Hero sem foto do centro (Santa Maria, até haver imagem): fundo institucional na mesma linguagem da seção de comunhão */
.hero__bg--nophoto { background:
  radial-gradient(70% 60% at 85% 10%, rgba(201,162,74,.18), transparent 60%),
  radial-gradient(70% 70% at 10% 90%, rgba(37,96,168,.55), transparent 60%),
  linear-gradient(160deg, #12345F 0%, #0a1f3d 100%); }
```
Os dois arquivos CSS recebem o mesmo bloco (Taguatinga não usa `--nophoto`, mas fica pronta para o mesmo caso).

### 6.2 `js/main.js` — exatamente três mudanças
1. Pôster de reserva: `esc(ev.badge || "Shalom Asa Sul")` → nome do centro.
2. Feed: `var API = "data/noticias.json?cb=" + …` → `var API = "../asasul/data/noticias.json?cb=" + …`, com comentário: `// Feed compartilhado da missão (gerado em asasul/data pelo workflow asasul-news.yml)`.
3. Carrossel vazio, no início de `initCarousel`:
```js
    var track = $("#carTrack");
    if (!track) return;
    if (!eventos.length) {
      var sec = document.getElementById("eventos"); if (sec) sec.hidden = true;
      $$('a[href="#eventos"]').forEach(function (a) { a.hidden = true; });
      return;
    }
```
(substitui `if (!track || !eventos.length) return;`).

### 6.3 Ícone do card "Serviços" (card 5)
```html
<div class="info-card__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/></svg></div>
```
Os outros cinco ícones são os mesmos SVGs da Asa Sul, na mesma ordem.

### 6.4 Hero de Santa Maria (`index.html`)
```html
  <section class="hero">
    <!-- Sem foto do centro por enquanto. Quando houver, substitua a div abaixo por:
         <div class="hero__bg"><img src="../images/shalom-santa-maria.webp" alt="Centro de Evangelização Shalom Santa Maria" fetchpriority="high" /></div>
         e troque a og:image no <head>. -->
    <div class="hero__bg hero__bg--nophoto"></div>
    <div class="hero__scrim"></div>
```

## 7. Painel logado (`admin/`) — agente C

- `admin/admin.js` `SITE_CATALOG`:
  - `taguatinga` → `type:"editable", modules:["events","schedules"], children:[{name:"Grupo de Oração Aberto",path:"../taguatinga/e/grupo-aberto/"},{name:"Grupo de Oração de Casais",path:"../taguatinga/e/grupo-de-casais/"},{name:"Grupo de Oração Jovem",path:"../taguatinga/e/grupo-jovem/"},{name:"Missa Jovem",path:"../taguatinga/e/missa-jovem/"}]`
  - `santamaria` → `type:"editable", modules:["events","schedules"], children:[{name:"Grupo de Oração de Adultos",path:"../santamaria/e/grupo-de-adultos/"},{name:"Grupo de Oração de Jovens",path:"../santamaria/e/grupo-de-jovens/"}]`
  - Nada mais muda no painel (o default `asasul` do seletor continua).
- `admin/ADMIN-SETUP.md`: na seção 3 registrar que Taguatinga e Santa Maria já estão ligadas (mesmo padrão), a regra "primeiro salvamento de Horários preenche todas as categorias", o feed compartilhado (D3) e o fallback `featuredLocal` (D6).
- `AGENTS.md` (raiz; gitignored, só local): atualizar "Paginas ativas" (asasul não é mais iframe do bento; taguatinga/santamaria no template da Asa Sul; santamaria/ existe) e "Proximos passos" (remover itens já feitos: página própria da Asa Sul, Santa Maria, planilha Google Sheets).
- Grafo do ecossistema (`~/Documents/ShalomProject/knowledge-graph/`): seguir o README; fazer backup de `data/curated.json` antes de editar; adicionar as duas páginas/rotas espelhando como `asasul` está representado; `build_graph.py && render_artifacts.py && validate_graph.py`; se a validação falhar, restaurar o backup e reportar. `detect_drift.py` é somente leitura (não usar `--update-baseline`).

## 8. Critérios de aceite (QA — agente D, adversarial, não corrige)

Servidor local já em execução: `http://127.0.0.1:8765/Shalom/` (raiz = `~/Documents/GitHub`). Script de screenshot: `node /private/tmp/claude-503/-Users-joaoroque-Documents-GitHub/b84be49f-e238-43a4-af99-72d5fcfaa516/scratchpad/shot.mjs <url> <png> <w> <h> [fullPage=1]` (imprime erros de console/página/rede local).

1. **Estrutura**: `index.html` das duas páginas tem exatamente as mesmas `section`s, na mesma ordem e com os mesmos `id`s/classes da Asa Sul (`hero`, `#horarios`, `#eventos`, `#mapa`, `#noticias`, `#calendario`, `#instagram`, `#doacoes`, footer, `.fab`, `#toast`). Mesmos seis `id="field-*"`.
2. **Pixel-perfect**: em 390×844, 768×1024 e 1280×800, estilos computados iguais aos da Asa Sul para `.nav`, `.hero h1`, `.hero__sub`, `.btn--primary`, `.section-head h2`, `.info-card`, `.event-card__media`, `.news-card`, `.map-wrap iframe`, `.calendar-wrap iframe`, `.ig__embed`, `.tithe__panel`, `.pix-key`, `.site-footer` (font-size, padding, border-radius, background, box-shadow, grid-template-columns). Diferenças só de conteúdo/altura de texto.
3. **Sem regressão de dependências**: nenhum `header.js`, `footer.js`, `centralScript.js`, `cev-data.js`, Bootstrap, `cevCsvUrl` nas novas páginas; `grep -rn "Asa Sul\|asasul" taguatinga santamaria` só encontra o caminho do feed compartilhado (`../asasul/data/noticias.json`) e seu comentário.
4. **Dados**: todas as chaves Pix, telefones, endereços, handles e URLs conferem com a seção 5; `zbarimg --raw -q <slug>/images/pix-qr.png` contém a chave 10% do centro; Santa Maria mostra "A confirmar" em Missas.
5. **Funcional**: sem erros de console/página (exceto embeds externos de Instagram/Google que falhem por rede); `node --check` em todos os `.js`; `node scripts/build-event-pages.mjs` gerou `e/<slug>/index.html` para todos os slugs da seção 5; `evento.html?id=<slug>` renderiza cada evento; `e/<slug>/` renderiza com `og:image` correta; carrossel com N slides reais e dots = N; botão Copiar mostra "Copiado!"; menu mobile abre/fecha; links `#` apontam para ids existentes.
6. **A11y básica**: `alt`/`aria-label` preservados, títulos h1→h2→h3 em ordem, `lang="pt-br"`, foco visível igual à Asa Sul.
7. **Painel**: `admin/admin.js` passa em `node --check`; catálogo com as duas páginas editáveis e children corretos.

Resultado esperado do QA: por página, `pass` ou `revise` com lista `arquivo:linha → problema → correção esperada`. Teto: 2 rodadas de correção; depois escalar ao João.

## 9. Pendências para o João (não bloqueiam a implementação)

- P1 Validar com os economatos os **QR Pix gerados** (Taguatinga e Santa Maria) antes de publicar.
- P2 Fornecer uma **foto do CEV Santa Maria** para o hero (e trocar a `og:image`).
- P3 Confirmar **WhatsApp** de Taguatinga ((61) 98488-8904 vs (61) 98315-0222 do comshalom.org) e de Santa Maria ((61) 99311-6530).
- P4 Confirmar o endereço "QC 1, Casa 7" de Santa Maria e revisar os textos de apoio dos eventos locais (redigidos nesta sessão a partir do CSV).
- P5 Depois do deploy: no painel, salvar os Horários das duas páginas (todas as categorias) para que o Supabase vire a fonte; opcionalmente cadastrar os grupos como eventos remotos (mesmo slug) para substituir os locais.
- P6 Sugestão futura: mover o feed de notícias para `data/noticias.json` na raiz (workflow + 3 páginas) e consolidar CSS/JS dos três centros num template único.

## 10. Registro da execução (2026-09-07)

**Topologia:** 3 executores Sonnet em paralelo (Taguatinga; Santa Maria; painel + docs + grafo), pastas disjuntas na mesma working tree, sem commit; depois 1 verificador Opus adversarial (não corrige). Correções pós-QA aplicadas pelo orquestrador (edições pequenas e determinísticas). Ativos determinísticos (WebP, QR) gerados antes pelo orquestrador e verificados por decodificação.

**Resultado do QA (Opus):** `taguatinga: pass`, `admin: pass`, `santamaria: revise` (card duplicado no carrossel em ≥980px; README do painel desatualizado) + 4 itens cosméticos/a11y. Todos corrigidos e re-verificados:

| Verificação | Resultado final |
|---|---|
| Estrutura (seções/ids/classes/`field-*`) | idêntica à Asa Sul nas duas páginas |
| Estilos computados (72 seletores × 34 propriedades, 390/768/1280) | Taguatinga: zero diferenças. Santa Maria: só `.hero__bg` (D10) e controles do carrossel ocultos em ≥640px (D14) |
| Slides duplicados visíveis (390/768/1024/1280/1440) | nenhum, nas três páginas |
| Ordem de títulos | 0 saltos nas três páginas (antes: 1 salto h2→h4 em cada página nova) |
| Suíte funcional do QA (`func.mjs`) | Taguatinga 50/50 (1280) e 52/52 (390); Santa Maria 41/41 (390). Em 1280 a suíte aborta ao clicar em `#carNext` oculto — comportamento esperado do modo estático (D14), coberto por `static-check.mjs` |
| Erros de console/página/rede local | zero (filtro do `shot.mjs` corrigido para `127.0.0.1`) |
| `node --check` (11 arquivos) e `build-event-pages.mjs` | OK; `e/` regerado após D15 |
| QR Pix | decodificam para a chave 10% de cada centro, CRC recalculado (EB89 / D238) |
| Painel | catálogo conforme seção 7; `node --check` OK; 26 caminhos do catálogo existem em disco |

**Arquivos da sessão (para o commit):** `taguatinga/**` (index, evento, css, js/{data,events,evento,main}, scripts, e/, README, images/pix-qr.png, images/eventos/grupo-aberto.webp), `santamaria/**` (idem, sem images/eventos), `images/shalom-taguatinga.webp`, `admin/admin.js`, `admin/ADMIN-SETUP.md`, `docs/decisoes/2026-09-07-cev-taguatinga-santamaria.md`. `AGENTS.md` (raiz) foi atualizado, mas é gitignored. **Não tocar** nas mudanças alheias já presentes na working tree (`.gitignore`, `providencia/**`, `sh82cafe/**`, `inscricoes/`, `eventos/`, `docs/council/`, etc.).

**Grafo do ecossistema:** não alterado. `validate_graph.py` já falhava antes desta sessão (nó `portal_prototype_fluid_20260829` aponta para `shalom-brasilia-sistemas/docs/prototipo-portal-fluido.html`, movido hoje pela sessão do Portal para `docs/_arquivo/`). O agente restaurou o backup; as adições de Taguatinga/Santa Maria ficam para depois que o Portal corrigir o `source_file` desse nó.

**Observações do QA não tratadas (decisão do João):** o rótulo grande "10%" encima um painel que agora tem 10% e 5%; o recorte do hero de Taguatinga mostra a placa, não o prédio (a foto original não mostra o prédio inteiro); `taguatinga/images/hero.jpg` + `grupos-oracao.jpg` (9,4 MB) continuam publicados sem uso (D13); `js/cev-data.js` ficou órfão; o texto "Deslize para conhecer" aparece mesmo quando o carrossel está estático no desktop.

**Como ver localmente** (o servidor desta sessão pode não estar mais de pé):
```
cd ~/Documents/GitHub && python3 -m http.server 8765
# http://127.0.0.1:8765/Shalom/taguatinga/  ·  http://127.0.0.1:8765/Shalom/santamaria/  ·  http://127.0.0.1:8765/Shalom/asasul/
```

**Atualização (segunda rodada, mesmo dia):** ver `2026-09-07-cev-capa-editavel-e-vinculo-ao-painel.md` — capa editável, vínculo completo ao painel e branch de publicação `feat/cev-editavel` já montada em worktree separada; o commit sugerido abaixo foi substituído por esse fluxo.

**Commit sugerido originalmente (superado):**
```
cd ~/Documents/GitHub/Shalom
git checkout -b feat/cev-taguatinga-santamaria
git add taguatinga santamaria images/shalom-taguatinga.webp admin/admin.js admin/ADMIN-SETUP.md docs/decisoes/2026-09-07-cev-taguatinga-santamaria.md
git commit -m "Replica a página da Asa Sul em Taguatinga e Santa Maria e libera edição no painel"
```
