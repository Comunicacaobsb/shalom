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
├── js/events.js                  Adaptador de eventos — só Supabase, sem fallback local
├── js/evento.js                  Lógica da página de detalhe do evento
├── js/main.js                    Interações da página (menu, carrossel, Pix, notícias)
├── scripts/build-event-pages.mjs Gera e/<slug>/index.html a partir do banco (ou de um
│                                  JSON --from-json)
├── e/<slug>/index.html           Páginas de evento geradas (não editar à mão)
├── images/pix-qr.png             QR Pix (10%, economatotaguatinga@comshalom.org)
└── images/eventos/grupo-aberto.webp  Arte do evento "Grupo de Oração Aberto"
```

O hero e o `og:image` usam `../images/shalom-taguatinga.webp` (raiz do repositório, 1600×900).

## Onde estão os dados

Capa, horários e eventos não têm mais nenhuma cópia editável no código: a única fonte é o
banco (Supabase, `site = "taguatinga"`) e quem edita é o painel `/admin/`.

- **Capa** — `settings` (`key = "home"`): título, frase de apoio e imagem de fundo do hero.
- **Horários** — `settings` (`key = "schedules"`): um array de textos por categoria
  (`funcionamento`, `missa`, `grupos`, `adoracao`, `servicos`, `aconselhamento`). Categoria sem
  linha ou com lista vazia mostra "A confirmar"; se a consulta falhar (sem conexão, erro do
  Supabase), os cartões mostram "Não foi possível carregar agora" — a página nunca inventa dado.
- **Eventos** — tabela `events` (`site = "taguatinga"`), a mesma usada pelo carrossel e por
  `e/<slug>/`. Sem eventos publicados (ou em erro), a seção "Eventos & encontros" fica
  escondida — não existe mais pôster de reserva local.
- **Imagens** — enviadas pelo painel, com compressão automática até 300 KB por arquivo.

`e/<slug>/index.html` continua sendo gerado por `node scripts/build-event-pages.mjs` (seção
abaixo), mas a fonte agora é o banco (ou um JSON equivalente ao seed, com `--from-json`) —
nunca um arquivo dentro desta pasta.

**Ordem de publicação:** o seed (`docs/seeds/2026-09-07-seed-cev.sql` ou `.json`) precisa ser
aplicado em produção **antes** do push desta branch. Se a branch subir sem o seed, esta página
mostra "A confirmar" nos horários e fica sem a seção de eventos até alguém salvar pelo painel.

## Capa editável

O topo da página (imagem de fundo, título e frase de apoio do hero) vem de `settings` no
Supabase (`site = "taguatinga"`, `key = "home"`). Sem essa linha (erro de consulta), a página
mantém o que já está no HTML/no cache, sem mexer. A última capa aplicada fica em cache
(`localStorage["shalom:home:taguatinga"]`): um script inline logo após a `section.hero` aplica
esse cache de imediato (sem esperar rede), e `js/main.js` busca o Supabase em seguida e
reconcilia — com troca suave da imagem (`.hero__bg img.is-swapping`) quando ela muda. A
`og:image`/`twitter:image` do `<head>` continuam estáticas (o WhatsApp não executa JavaScript):
trocar a imagem de preview do link exige editar o HTML e publicar.

## Painel `/admin/`

Taguatinga é uma página editável no painel (módulos Horários e Eventos), com os quatro eventos
listados como filhos apontando para `e/grupo-aberto/`, `e/grupo-de-casais/`,
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
# ou, offline, a partir de um JSON no formato do seed:
node scripts/build-event-pages.mjs --from-json ../docs/seeds/2026-09-07-seed-cev.json
```

Sem `--from-json`, o script busca os eventos publicados direto no Supabase (REST, com a chave
anônima de `../js/config.js`). Gera (ou regrava) `e/<slug>/index.html` para cada evento, com a
`og:image`/`twitter:image` "assada" no HTML — necessário para o WhatsApp e o Facebook mostrarem
a arte certa na prévia do link compartilhado — e apaga as pastas de `e/` cujo slug não existe
mais na fonte. Rode o script sempre que um evento for criado, renomeado, tiver a imagem trocada
ou for despublicado.

## Pendências (não bloqueiam o funcionamento da página)

- Validar com o economato o QR Pix gerado (`images/pix-qr.png`, chave
  `economatotaguatinga@comshalom.org`) antes de divulgar o link amplamente.
- Confirmar o número de WhatsApp: a página usa (61) 98488-8904 (`wa.me/5561984888904`, formato
  antigo da página normalizado com o 9º dígito); o site comshalom.org lista (61) 98315-0222 para
  Taguatinga. As duas fontes discordam e nenhuma foi confirmada diretamente com o centro.
