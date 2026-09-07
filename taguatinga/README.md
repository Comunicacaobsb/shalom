# Shalom Taguatinga — Documentação

Página pública do Centro de Evangelização Shalom Taguatinga, réplica estrutural da página nova
`asasul/` (mesmo HTML/CSS/JS, mesmas seções e ids), com dados, contatos e imagens do próprio
centro. Site estático (HTML/CSS/JS puro), publicado em `brasilia.comshalom.org/taguatinga/`.

## Seções da página (`index.html`)

Na ordem em que aparecem, todas com os mesmos ids/classes da Asa Sul:

1. `header` — navegação fixa + menu mobile
2. `hero` — imagem de capa, título e ações rápidas
3. `#horarios` — seis cards: Funcionamento, Missas, Grupos de Oração, Adoração, Serviços
   (`id="field-servicos"`), Oração e Aconselhamento
4. `#eventos` — carrossel dos grupos de oração e da Missa Jovem
5. `#mapa` — endereço e iframe do Google Maps
6. `#noticias` — grade de notícias (feed compartilhado, ver abaixo)
7. `#calendario` — iframe do Google Calendar da missão
8. `#instagram` — chamada + embed do perfil @shalomtaguatinga
9. `#doacoes` — comunhão de bens (Pix 10% e 5%, QR Code)
10. `footer` — navegação, contato, WhatsApp flutuante (`.fab`) e toast de cópia (`#toast`)

## Arquivos

```
taguatinga/
├── index.html                    Página principal
├── evento.html                   Molde da página de detalhe de um evento
├── css/styles.css                Cópia verbatim de asasul/css/styles.css + bloco
│                                  "Ajustes locais" no fim (chave Pix dupla, hero sem foto)
├── js/data.js                    SHALOM_SCHEDULES (horários) e SHALOM_EVENTOS (carrossel)
├── js/events.js                  Adaptador de eventos (Supabase com fallback local)
├── js/evento.js                  Lógica da página de detalhe do evento
├── js/main.js                    Interações da página (menu, carrossel, Pix, notícias)
├── scripts/build-event-pages.mjs Gera taguatinga/e/<slug>/index.html a partir de js/data.js
├── e/<slug>/index.html           Páginas de evento geradas (não editar à mão)
├── images/pix-qr.png             QR Pix (10%, economatotaguatinga@comshalom.org)
├── images/eventos/grupo-aberto.webp  Arte do evento "Grupo de Oração Aberto"
├── images/hero.jpg               Fachada original — fonte de referência, não usada no site
└── images/grupos-oracao.jpg      Ícone original — fonte de referência, não usada no site
```

O hero e o `og:image` usam `../images/shalom-taguatinga.webp` (raiz do repositório, 1600×900,
gerada a partir de `images/hero.jpg`). `images/hero.jpg` e `images/grupos-oracao.jpg` ficam no
lugar como fonte das artes, mas nenhuma página referencia esses dois arquivos diretamente.

## Como editar os dados

**Horários e eventos fixos** — `js/data.js`:
- `window.SHALOM_SCHEDULES` tem uma lista de textos por categoria (`funcionamento`, `missa`,
  `grupos`, `adoracao`, `servicos`, `aconselhamento`). Cada linha vira um `<li>`.
- `window.SHALOM_EVENTOS` é a lista de eventos do carrossel, na ordem em que devem aparecer.
  Os quatro eventos atuais (grupos de oração e Missa Jovem) têm `featuredLocal: true` — eles só
  somem do carrossel quando existir, no Supabase, um evento remoto com o mesmo `id` (slug).
- Depois de editar `js/data.js`, rode `node scripts/build-event-pages.mjs` (a partir desta
  pasta) para regerar as páginas de `e/`.

**Fonte oficial depois de publicado** — o painel `/admin/` (Supabase) passa a valer sobre
`js/data.js` assim que alguém salvar Horários ou Eventos pelo painel. No primeiro salvamento de
Horários, preencha todas as categorias de uma vez (o painel substitui o bloco inteiro, não
mescla com o fallback local). Enquanto o Supabase não tiver linhas para `site = "taguatinga"`,
`js/store.js`/`js/events.js` caem de volta para os dados deste arquivo.

## Capa editável

O topo da página (imagem de fundo, título e frase de apoio do hero) vem de `settings` no
Supabase (`site = "taguatinga"`, `key = "home"`). Sem essa linha, a página usa o padrão local
`window.SHALOM_HOME`, no topo de `js/data.js`. A última capa aplicada fica em cache
(`localStorage["shalom:home:taguatinga"]`): um script inline logo após a `section.hero` aplica
esse cache de imediato (sem esperar rede), e `js/main.js` busca o Supabase em seguida e
reconcilia — com troca suave da imagem (`.hero__bg img.is-swapping`) quando ela muda. A
`og:image`/`twitter:image` do `<head>` continuam estáticas (o WhatsApp não executa JavaScript):
trocar a imagem de preview do link exige editar o HTML e publicar.

## Painel `/admin/`

Taguatinga é uma página editável no painel (módulos Horários e Eventos), com os quatro eventos
locais listados como filhos apontando para `e/grupo-aberto/`, `e/grupo-de-casais/`,
`e/grupo-jovem/` e `e/missa-jovem/`. O catálogo do painel (`admin/admin.js`) é mantido fora
desta pasta — qualquer mudança nele é responsabilidade de quem edita `admin/`.

## Feed de notícias compartilhado

`#noticias` lê `../asasul/data/noticias.json` (ver `js/main.js`) — o mesmo feed usado pela
página da Asa Sul, gerado a cada hora pelo workflow `asasul-news.yml` a partir dos três
primeiros cards de `comshalom.org/brasilia`. As notícias são da missão, não de um centro
específico; por isso Taguatinga não tem `data/noticias.json` próprio. Se o feed falhar (rede
ou formato inválido), a seção cai para um cartão de fallback com link para o portal.

## Regerar as páginas de evento

```bash
cd taguatinga
node scripts/build-event-pages.mjs
```

Gera (ou regrava) `e/<slug>/index.html` para cada entrada de `window.SHALOM_EVENTOS` em
`js/data.js`, com a `og:image`/`twitter:image` do próprio evento "assada" no HTML — necessário
para o WhatsApp e o Facebook mostrarem a arte certa na prévia do link compartilhado. Rode o
script sempre que um evento local for criado, renomeado ou tiver a imagem trocada.

## Pendências (não bloqueiam o funcionamento da página)

- Validar com o economato o QR Pix gerado (`images/pix-qr.png`, chave
  `economatotaguatinga@comshalom.org`) antes de divulgar o link amplamente.
- Confirmar o número de WhatsApp: a página usa (61) 98488-8904 (`wa.me/5561984888904`, formato
  antigo da página normalizado com o 9º dígito); o site comshalom.org lista (61) 98315-0222 para
  Taguatinga. As duas fontes discordam e nenhuma foi confirmada diretamente com o centro.
