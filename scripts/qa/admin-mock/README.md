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
# screenshots em outra pasta:
node scripts/qa/admin-mock/run.mjs --shots /tmp/shots-admin
```

O script imprime uma linha `PASS`/`FAIL` por verificação, um resumo no fim e sai
com código `1` se algo falhar. Servidor em outra porta: `ADMIN_MOCK_BASE=http://127.0.0.1:9000`.

Requisitos: Google Chrome em `/Applications/Google Chrome.app` e o Playwright já
instalado em `inscricoes/node_modules` (o script o carrega de lá).

## O que é verificado

Para **Asa Sul, Taguatinga e Santa Maria**:

- os cards de módulo trazem rótulo, descrição e a miniatura da página, na ordem
  Capa → Horários → Eventos;
- a faixa "Você está editando" nomeia a página e o módulo, mostra a miniatura e o
  botão "Ver no site" com a âncora certa (`#horarios`, `#eventos`);
- **Capa**: pré-preenchimento com o `window.SHALOM_HOME` do `js/data.js` da página,
  imagem convertida para endereço absoluto de produção, aviso de dados locais,
  prévia ao vivo (título, frase, foto ou gradiente) e gravação em `settings.home`;
- **Horários**: pré-preenchimento com `window.SHALOM_SCHEDULES` quando não há linha
  no banco (e ausência do aviso quando já há, como na Asa Sul), gravação das seis
  categorias em `settings.schedules`;
- **Eventos**: a seção "No site, mas ainda não no painel" lista os eventos
  `featuredLocal` que faltam, "Trazer todos" grava cada um com `image_url`
  absoluta, descrição convertida em HTML (parágrafos, `<br>` e links) e posição na
  sequência dos que já existiam;
- nada é escrito fora da página aberta e nenhum upload sai da pasta `<site>/`;
- o cardápio do SH-82 e a tela de Usuários continuam abrindo sem erro de console;
- do campo Título dá para chegar ao botão **Salvar capa** só com Tab, com foco visível;
- nenhum erro de console durante todo o percurso.

Screenshots de cada editor em 1280 px e 390 px ficam na pasta de saída.

## Como o mock funciona

`run.mjs` intercepta a URL do bundle `@supabase/supabase-js@2` e devolve
`mock-supabase.js` no lugar dela. Como isso acontece antes de `admin.js` rodar, o
painel usa o cliente falso sem saber. As tabelas (`sites`, `profiles`,
`page_permissions`, `settings`, `events`, `menu_categories`, `menu_products`) e o
storage vivem em memória e ficam visíveis em `window.__mockDB` — é assim que o
teste confere **o que seria gravado**. O usuário do mock é um master fictício
(`editor@example.test`).

O estado inicial imita o banco real antes desta rodada: as quatro páginas em
`sites`, os horários da Asa Sul em `settings` e os quatro eventos da Asa Sul que já
existem no banco (os outros quatro do `data.js` são `featuredLocal` e aparecem como
pendentes). Quill, Google Fonts e as imagens externas também são interceptados,
então o teste roda offline.
