# Shalom Santa Maria

Réplica pixel-perfect da página nova da Asa Sul (`../asasul/`), com dados, contatos e
Pix do Centro de Evangelização Shalom Santa Maria. Mesmo HTML/CSS/JS, mesmas seções,
ids e classes; só o conteúdo muda. Origem: `docs/decisoes/2026-09-07-cev-taguatinga-santamaria.md`.

## Seções da página (`index.html`)

Header/nav, hero (sem foto — ver abaixo), `#horarios` (6 cards: Funcionamento, Missas,
Grupos de Oração, Adoração, Serviços, Oração e Aconselhamento), `#eventos` (carrossel),
`#mapa`, `#noticias`, `#calendario`, `#instagram`, `#doacoes` (comunhão de bens — Pix
10% e 5%), footer, botão flutuante de WhatsApp, toast de "Copiado!".

## Arquivos

- `index.html` — página principal.
- `evento.html` — molde da página de detalhe de um evento (usa `?id=<slug>`).
- `css/styles.css` — cópia verbatim de `asasul/css/styles.css` (mesmos tokens, mesmo
  layout) + bloco final "Ajustes locais" (dois blocos de chave Pix + gradiente do hero
  sem foto).
- `js/events.js` — adaptador de eventos — só a tabela `events` do Supabase (site
  `santamaria`), sem fallback local.
- `js/evento.js` — monta a página de detalhe do evento a partir do slug.
- `js/main.js` — interações da página (menu, copiar Pix, horários, carrossel, notícias).
- `scripts/build-event-pages.mjs` — gera `e/<slug>/index.html` a partir do banco (ou de
  um JSON equivalente ao seed, com `--from-json`) e de `evento.html`, com a `og:image`
  de cada evento "assada" no HTML.
- `e/grupo-de-adultos/`, `e/grupo-de-jovens/` — páginas estáticas geradas (ver abaixo).
- `images/pix-qr.png` — QR Pix já verificado (decodifica para
  `economatosantamaria@comshalom.org`). Não regerar.

Compartilhados com o resto do site (não ficam dentro de `santamaria/`):
`../js/config.js` (Supabase), `../js/store.js` (camada de dados), `../js/share.js`
(compartilhar evento), `../favicon/`, `../images/logo-shlaom.svg`,
`../images/shalom-brasilia.jpg`.

## Onde estão os dados

Capa, horários e eventos não têm mais nenhuma cópia editável no código: a única fonte é o
banco (Supabase, `site = "santamaria"`) e quem edita é o painel `/admin/`.

- **Capa** — `settings` (`key = "home"`): título, frase de apoio e imagem de fundo do hero.
- **Horários** — `settings` (`key = "schedules"`): um array de textos por categoria
  (`funcionamento`, `missa`, `grupos`, `adoracao`, `servicos`, `aconselhamento`). Categoria sem
  linha ou com lista vazia mostra "A confirmar" (é o caso de `missa`, fiel ao horário oficial do
  centro); se a consulta falhar, os cartões mostram "Não foi possível carregar agora".
- **Eventos** — tabela `events` (`site = "santamaria"`), a mesma usada pelo carrossel e por
  `e/<slug>/`. Sem eventos publicados (ou em erro), a seção "Eventos & encontros" fica
  escondida — não existe mais pôster de reserva local.
- **Imagens** — enviadas pelo painel, com compressão automática até 300 KB por arquivo.

`e/<slug>/index.html` continua gerado por `node scripts/build-event-pages.mjs` (veja "Como
regerar `e/`" abaixo), mas a fonte agora é o banco (ou um JSON equivalente ao seed, com
`--from-json`) — nunca um arquivo dentro desta pasta.

**Ordem de publicação:** o seed (`docs/seeds/2026-09-07-seed-cev.sql` ou `.json`) precisa ser
aplicado em produção **antes** do push desta branch. Se a branch subir sem o seed, esta página
mostra "A confirmar" nos horários e fica sem a seção de eventos até alguém salvar pelo painel.

## Capa editável

O topo da página (imagem de fundo, título e frase de apoio do hero) vem de `settings` no
Supabase (`site = "santamaria"`, `key = "home"`). Sem essa linha (erro de consulta), a página
mantém o que já está no HTML/no cache, sem mexer — hoje isso é o gradiente descrito em "Hero sem
foto" abaixo, já que não há `<img>` no hero estático. A última capa aplicada fica em cache
(`localStorage["shalom:home:santamaria"]`): um script inline logo após a `section.hero` aplica
esse cache de imediato (sem esperar rede), e `js/main.js` busca o Supabase em seguida e
reconcilia — com troca suave da imagem (`.hero__bg img.is-swapping`) quando ela muda. Assim, uma
foto do centro enviada pelo painel aparece sem precisar de commit. A `og:image`/`twitter:image`
do `<head>` continuam estáticas (o WhatsApp não executa JavaScript): trocar a imagem de preview
do link exige editar o HTML e publicar.

## Painel `/admin/`

Santa Maria já é uma página editável no painel (módulos Horários e Eventos): o catálogo
(`admin/admin.js`, `SITE_CATALOG`) marca `santamaria` como `type: "editable"`, com
`modules: ["events", "schedules"]` e `children` apontando para `e/grupo-de-adultos/` e
`e/grupo-de-jovens/`. Ao salvar Horários pela primeira vez pelo painel, preencha **todas**
as categorias — o painel substitui o bloco inteiro, não mescla com o que já está salvo.

## Feed de notícias (compartilhado)

`js/main.js` busca `../asasul/data/noticias.json` — o mesmo feed usado pela página da
Asa Sul, gerado a cada hora pelo workflow `asasul-news.yml` a partir do portal
comshalom.org/brasilia. As notícias são da missão, não de um centro específico, por
isso não há `data/noticias.json` próprio aqui. Se o feed falhar ou a rede local
bloquear a chamada, a seção mostra um card de fallback com link para o portal.

## Como regerar `e/`

```
cd santamaria
node scripts/build-event-pages.mjs
# ou, offline, a partir de um JSON no formato do seed:
node scripts/build-event-pages.mjs --from-json ../docs/seeds/2026-09-07-seed-cev.json
```

Rode sempre que os eventos publicados mudarem. Sem `--from-json`, o script busca os eventos
direto no Supabase (REST, com a chave anônima de `../js/config.js`); usa `evento.html` como
molde e escreve `e/<slug>/index.html` com meta tags Open Graph/Twitter e
`window.__EVENT_ID__` fixados por evento (para a prévia do link no WhatsApp mostrar a arte
certa mesmo sem JavaScript rodar a busca por slug), apagando as pastas de `e/` cujo slug não
existe mais na fonte.

## Hero sem foto

Santa Maria não tem foto do centro disponível no repositório. O hero usa
`<div class="hero__bg hero__bg--nophoto"></div>`, com um gradiente institucional
definido no bloco "Ajustes locais" do CSS (mesma linguagem visual da seção de
comunhão de bens). A `og:image` da página usa `images/shalom-brasilia.jpg`
(imagem genérica da missão) até que exista uma foto própria.

Quando houver uma foto do centro: salve-a como `../images/shalom-santa-maria.webp`,
troque a `div` do hero em `index.html` por
`<div class="hero__bg"><img src="../images/shalom-santa-maria.webp" alt="Centro de Evangelização Shalom Santa Maria" fetchpriority="high" /></div>`
(instrução também deixada em comentário HTML antes da `section.hero`) e atualize a
`og:image` no `<head>` para o mesmo arquivo. Ou envie a foto pelo painel (módulo Capa) —
nesse caso não precisa editar o HTML: a imagem passa a vir do banco.

## Pendências (spec, seção 9 — não bloqueiam esta implementação)

- Validar com o economato o QR Pix gerado (`economatosantamaria@comshalom.org`) antes
  de publicar.
- Obter uma foto do CEV Santa Maria para o hero (ver acima).
- Confirmar o WhatsApp (61) 99311-6530 (fonte: comshalom.org/brasilia).
- Confirmar o endereço "QC 1, Casa 7" (só aparece na ficha do Google Maps) e revisar os
  textos de apoio dos dois eventos locais, redigidos nesta sessão a partir do CSV
  oficial de horários.
