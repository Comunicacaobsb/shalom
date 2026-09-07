# Teste do painel `/admin/` com Supabase falso

Roda o painel inteiro em um Chrome automatizado, com um **mock do Supabase em
memória** no lugar do banco real. Nenhuma credencial é usada, nada é gravado no
Supabase de produção e nenhum login real acontece.

## Como rodar

Em um terminal, sirva a **raiz do repositório**:

```bash
cd ~/Documents/GitHub/Shalom && python3 -m http.server 8766
```

Em outro:

```bash
cd ~/Documents/GitHub/Shalom
node scripts/qa/admin-mock/run.mjs
# servidor em outra porta:
node scripts/qa/admin-mock/run.mjs --base http://127.0.0.1:8768
# screenshots em outra pasta:
node scripts/qa/admin-mock/run.mjs --shots /tmp/shots-admin
```

O script imprime uma linha `PASS`/`FAIL` por verificação, um resumo no fim e sai
com código `1` se algo falhar. `--base` também pode vir da variável
`ADMIN_MOCK_BASE`; o padrão é `http://127.0.0.1:8766`.

Requisitos: Google Chrome em `/Applications/Google Chrome.app` e o Playwright já
instalado em `inscricoes/node_modules` (o script o carrega de lá).

## O que é verificado

Estado inicial do banco (deve bater com produção depois do seed):

- as linhas que já existiam antes do seed continuam intactas (os horários da Asa
  Sul mantêm a data de atualização antiga) e o seed acrescenta o resto;
- 14 eventos no total: os 4 originais da Asa Sul + os 14 do (10 novos + 4 que já existiam) —
  `docs/seeds/2026-09-07-seed-cev.json`.

Para **Asa Sul, Taguatinga e Santa Maria**:

- os cards de módulo trazem rótulo, descrição e a miniatura da página, na ordem
  Capa → Horários → Eventos;
- a faixa "Você está editando" nomeia a página e o módulo, mostra a miniatura e o
  botão "Ver no site" com a âncora certa (`#horarios`, `#eventos`);
- **Capa**: carrega do banco (título, frase e imagem), prévia ao vivo (título,
  frase, foto ou gradiente), edição e gravação em `settings.home`;
- **Horários**: carregam do banco, aceitam uma linha nova e gravam as seis
  categorias em `settings.schedules`;
- **Eventos**: a lista mostra exatamente os eventos daquela página, editar um
  evento grava a alteração sem criar linha nova nem perder a descrição em HTML.

Imagens (decisão D6 — teto de 300 KB):

- foto de 4000×2500 na capa → sobe comprimida, **≤ 300 KB**, em
  `<site>/capa-<data>.webp` (ou `.jpg`), com `contentType` igual à extensão e ao
  tipo do blob, e o status mostrando o tamanho final em KB;
- imagem detalhada de 2400×1600 → também cabe no limite (a escada desce degraus);
- ruído incompressível (2000×2000, blocos aleatórios de 3 px) → **recusado** com
  "Não foi possível deixar a imagem abaixo de 300 KB…", sem gravar nada;
- arquivo que não é imagem → recusado, sem gravar nada;
- a arte de **evento** (`<site>/<slug>-<data>.webp`, bucket `eventos`) e a foto de
  **produto do cardápio** (`sh82cafe/<uuid>.webp`, bucket `cardapio`) passam pela
  mesma compressão.

E ainda:

- nenhum upload sai da pasta `<site>/` e nada é escrito fora da página aberta;
- **nenhuma requisição a `js/data.js`** durante todo o percurso (o painel não lê
  mais o arquivo do site);
- o bloco "Trazer para o painel" (`#eventImport`) e os avisos de dados locais
  (`#capaNotice`/`#schedNotice`) não existem mais no HTML;
- o cardápio do SH-82 e a tela de Usuários continuam abrindo sem erro de console;
- do campo Título dá para chegar ao botão **Salvar capa** só com Tab, com foco visível;
- nenhum erro de console durante todo o percurso.

Screenshots de cada editor em 1280 px e 390 px ficam na pasta de saída
(`$TMPDIR/shalom-admin-mock-shots` por padrão). As imagens de teste também são
geradas em `$TMPDIR` — nada é lido do repositório.

## Como o mock funciona

`run.mjs` intercepta a URL do bundle `@supabase/supabase-js@2` e devolve
`mock-supabase.js` no lugar dela. Como isso acontece antes de `admin.js` rodar, o
painel usa o cliente falso sem saber. As tabelas (`sites`, `profiles`,
`page_permissions`, `settings`, `events`, `menu_categories`, `menu_products`) e o
storage vivem em memória e ficam visíveis em `window.__mockDB` — é assim que o
teste confere **o que seria gravado**. O usuário do mock é um master fictício
(`editor@example.test`).

O estado inicial imita o banco real **depois do seed**: o `run.mjs` lê
`docs/seeds/2026-09-07-seed-cev.json` e o injeta em `window.__MOCK_SEED`; o mock
aplica esse JSON sobre as linhas que já existiam com a mesma regra do SQL
(`on conflict do nothing` em `settings(site,key)` e em `events(site,slug)`).
Quill (substituído por um esboço mínimo), Google Fonts e as imagens externas
também são interceptados, então o teste roda offline.
