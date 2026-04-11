# Melhorias e Refatoracao — Shalom Brasilia

Diagnostico tecnico do repositorio com proposta de melhorias organizadas por prioridade.
Cada item inclui: o problema, por que importa, onde esta, e como resolver.

**Legenda de esforco:** P = pequeno (< 1h) | M = medio (1-4h) | G = grande (4h+)

---

## 1. Seguranca (Critico)

### 1.1 Risco de XSS via innerHTML com dados externos
- [ ] **Esforco: M**

Dados do Google Sheets sao inseridos no DOM via `innerHTML` sem sanitizacao consistente. Se a planilha for comprometida ou editada com valores maliciosos, scripts podem ser injetados na pagina.

**Onde:**
- `adoracao/app.js` — todo o HTML da pagina e montado com template strings e injetado via `innerHTML`
- `25anos/js/main.js` — `renderEventos()` insere colunas da planilha (Evento, Descricao, Tag, Link) sem escape
- `taguatinga/js/main.js` — titulos de RSS inseridos via `li.innerHTML`
- `asasul/js/main.js` — mesmo padrao com feed ComShalom

**Referencia positiva:** `providencia/js/config.js` ja tem `escapeHTML()` e usa consistentemente.

**Como resolver:** Criar funcao `escapeHTML()` compartilhada em `js/utils.js` e usar em todos os pontos que inserem dados externos no DOM. Onde possivel, usar `textContent` em vez de `innerHTML`.

---

### 1.2 Numeros de telefone hardcoded no codigo-fonte
- [ ] **Esforco: M**

Numeros de WhatsApp de membros da comunidade estao expostos publicamente no codigo JavaScript e HTML.

**Onde:**
- `adoracao/app.js` linha 9 — `WHATSAPP_NUMERO = '5561982644432'`
- `providencia/js/config.js` linha 22 — `whatsappProvidencia: '5561982644432'`
- `asasul/salas.html` — quatro numeros hardcoded para responsaveis de salas
- `taguatinga/index.html` — numero no HTML
- `js/footer.js` — numero padrao no rodape

**Como resolver:** Centralizar em um unico arquivo de configuracao (`js/config.js`). Considerar mover para uma aba "config" na planilha Google Sheets, carregada dinamicamente.

---

### 1.3 URLs do Google Sheets espalhadas em multiplos arquivos
- [ ] **Esforco: P**

As URLs de CSV estao hardcoded em pelo menos 5 arquivos diferentes. Se a planilha mudar, cada arquivo precisa ser atualizado manualmente.

**Onde:**
- `adoracao/app.js` linha 16
- `25anos/js/main.js` linha 55
- `providencia/js/config.js` linhas 24-30
- `asasul/index.html` (script inline)
- `taguatinga/index.html` e `santamaria/index.html` (scripts inline)

**Como resolver:** Centralizar todas as URLs em `js/config.js` e importar onde necessario.

---

## 2. Duplicacao de Codigo (Alta Prioridade)

### 2.1 parseCSV() duplicada em 3 arquivos
- [ ] **Esforco: M**

Tres implementacoes diferentes de parsing CSV, cada uma com capacidades distintas. Bugs corrigidos em uma nao sao propagados para as outras.

**Onde:**
- `adoracao/app.js` linhas 28-51 — versao mais completa (trata campos entre aspas)
- `js/cev-data.js` linhas 30-47 — trata carriage returns mas nao aspas
- `25anos/js/main.js` linhas 67-81 — versao simplificada
- `providencia/` usa PapaParse (biblioteca externa) — abordagem diferente mas funcional

**Como resolver:** Extrair para `js/utils.js` uma versao unica e robusta baseada na implementacao do adoracao. Alternativa: adotar PapaParse globalmente.

---

### 2.2 escapeHTML() duplicada
- [ ] **Esforco: P**

**Onde:**
- `providencia/js/config.js` linhas 92-96 como `escapeHTML()`
- `js/cev-data.js` linhas 63-67 como `esc()` (mesma logica, nome diferente)

**Como resolver:** Extrair para `js/utils.js` com nome unico.

---

### 2.3 copyText() duplicada identica
- [ ] **Esforco: P**

**Onde:**
- `taguatinga/js/main.js` linhas 6-18
- `asasul/js/main.js` linhas 6-18 (identica)

Ambas usam `document.execCommand('copy')` que esta obsoleto.

**Como resolver:** Extrair para `js/utils.js` e modernizar para `navigator.clipboard.writeText()`.

---

### 2.4 carregarNoticiasComShalom() duplicada identica
- [ ] **Esforco: P**

**Onde:**
- `taguatinga/js/main.js` linhas 57-82
- `asasul/js/main.js` linhas 30-55

**Como resolver:** Extrair para `js/feed-loader.js` compartilhado.

---

### 2.5 buildWhatsAppUrl() duplicada
- [ ] **Esforco: P**

**Onde:**
- `providencia/js/config.js` linhas 73-75 como `buildWhatsAppUrl()`
- `adoracao/app.js` linhas 122-127 como `whatsappURL()`

**Como resolver:** Extrair para `js/utils.js` com assinatura unificada.

---

### 2.6 SVG do WhatsApp duplicado
- [ ] **Esforco: P**

**Onde:**
- `adoracao/app.js` linha 26 — constante `WHATSAPP_SVG` (24 linhas de path SVG)
- `providencia/js/config.js` linhas 81-85 — funcao `whatsappIcon()` (paths diferentes)

**Como resolver:** Unificar em `js/utils.js` como constante unica.

---

### 2.7 Dark mode tokens duplicados no SCSS
- [ ] **Esforco: M**

Os overrides de variaveis para dark mode estao escritos duas vezes em `scss/_dark.scss`: uma dentro de `@media (prefers-color-scheme: dark)` e outra sob `[data-theme="dark"]`. O `providencia/css/style.css` tem sua propria duplicacao separada.

**Onde:**
- `scss/_dark.scss` / `scss/styles.css` linhas 62-113
- `providencia/css/style.css` linhas 43-86

**Como resolver:** Criar um mixin SCSS `@mixin dark-tokens` e incluir nos dois seletores.

---

## 3. Qualidade do CSS (Media Prioridade)

### 3.1 Uso excessivo de !important
- [ ] **Esforco: M**

69 ocorrencias de `!important` em `scss/styles.css`. Classes utilitarias de cor, fundo, borda, peso e tamanho de fonte todas usam `!important`. Os estilos de heading (h1-h6) tambem, impedindo que CSS de pagina sobrescreva tamanhos.

**Onde:** `scss/styles.css` — distribuido por todo o arquivo; concentracao nas linhas 172-230.

**Como resolver:** Remover `!important` de componentes e headings. Manter apenas em classes utilitarias de override (`.c-primary`, `.bg-brand`).

---

### 3.2 Variaveis CSS redefinidas por pagina de forma inconsistente
- [ ] **Esforco: G**

Cada secao define seu proprio sistema de tokens em vez de estender o compartilhado.

**Onde:**
- `scss/styles.css` — `:root` com `--brand`, `--bg`, `--text`
- `taguatinga/css/styles.css` — redefine `:root` com `--brand`, `--brand-2`, `--cev-radius`, `--cev-shadow`
- `providencia/css/style.css` — tokens separados `--prov-primary`, `--prov-light`, `--prov-dark`
- `25anos/css/styles.css` — outro conjunto `--cor-principal`, `--azul-claro`, `--bege`

**Como resolver:** Padronizar convenção de nomes. Paginas devem sobrescrever apenas `--brand` e adicionar tokens prefixados pelo nome da secao, herdando todos os tokens compartilhados.

---

### 3.3 Cores hardcoded fora das variaveis
- [ ] **Esforco: M**

**Onde:**
- `25anos/css/styles.css` — 76 valores hex brutos ao lado das variaveis CSS (ex: `color: #475569`)
- `taguatinga/css/styles.css` — `color: #fff`, `rgba(0,0,0,.15)` em vez de variaveis

**Como resolver:** Substituir cores brutas por variaveis do sistema de tokens.

---

### 3.4 Unidades mistas (px, rem, em)
- [ ] **Esforco: M**

**Onde:**
- `taguatinga/css/styles.css` — `px` para border-radius, `rem` para padding, `clamp()` para secoes
- `25anos/css/styles.css` — `px` para larguras, `rem` para padding

**Como resolver:** Padronizar: `rem` para espacamento/tamanho, `px` apenas para bordas e detalhes finos, `clamp()` para valores responsivos.

---

## 4. Qualidade do JavaScript (Media Prioridade)

### 4.1 Mistura de ES5 e ES6
- [ ] **Esforco: M**

229 ocorrencias de `var` em 16 arquivos. Alguns arquivos sao inteiramente ES5 (header.js, footer.js, centralScript.js, cev-data.js), outros misturam (25anos/js/main.js), e poucos sao ES6 consistente (adoracao/app.js).

**Como resolver:** Converter todos para ES6 (`const`/`let`, arrow functions, template literals). O site nao suporta IE11, entao e seguro.

---

### 4.2 Poluicao do escopo global
- [ ] **Esforco: M**

Funcoes e constantes ficam no objeto `window` sem protecao.

**Onde:**
- `adoracao/app.js` — todas as funcoes e constantes sao globais
- `taguatinga/js/main.js` — `copyText()`, `carregarAvisos()` sao globais
- `asasul/js/main.js` — mesmo padrao

**Referencia positiva:** `providencia/js/*.js`, `js/cev-data.js`, `js/header.js`, `js/footer.js` usam IIFEs corretamente.

**Como resolver:** Envolver todos os scripts em IIFEs. Com sistema de build futuro, converter para ES modules.

---

### 4.3 Codigo morto comentado
- [ ] **Esforco: P**

**Onde:** `js/centralScript.js` linhas 21-48 — implementacao alternativa inteira comentada.

**Como resolver:** Remover. O historico esta no git.

---

### 4.4 Manipulacao direta de style em vez de classes CSS
- [ ] **Esforco: M**

27+ ocorrencias de `element.style.display = ...` e `element.style.opacity = ...`.

**Onde:**
- `adoracao/app.js` — `style.display = 'block'/'none'` para filtrar dias
- `25anos/js/main.js` — `style.opacity` e `style.pointerEvents` para scroll indicator
- `providencia/js/necessidades.js` — `style.display = 'none'` para loader

**Como resolver:** Usar classes CSS como `.hidden { display: none }` e alternar com `classList.add/remove`.

---

### 4.5 API obsoleta: document.execCommand('copy')
- [ ] **Esforco: P**

**Onde:** `taguatinga/js/main.js` linha 11 e `asasul/js/main.js` linha 11.

**Como resolver:** Substituir por `navigator.clipboard.writeText()`.

---

### 4.6 Tratamento de erros inconsistente
- [ ] **Esforco: P**

Algumas paginas mostram mensagem de erro ao usuario (adoracao), outras falham silenciosamente (taguatinga RSS, asasul RSS), e outras mostram erro diferente (cev-data).

**Como resolver:** Criar padrao compartilhado de exibicao de erro em `js/utils.js`.

---

## 5. Acessibilidade (Media Prioridade)

### 5.1 Tag `<main>` ausente em varias paginas
- [ ] **Esforco: P**

Leitores de tela usam `<main>` para pular navegacao e ir direto ao conteudo.

**Presente em:** adoracao, providencia (hub, habilidades, necessidades).
**Ausente em:** 25anos, taguatinga, asasul, santamaria, index.html, 404.html.

---

### 5.2 Inputs de busca sem labels
- [ ] **Esforco: P**

**Onde:** `providencia/habilidades/index.html` linha 86 — `<input id="skills-search">` sem `<label>` associado.

**Como resolver:** Adicionar `<label for="skills-search" class="visually-hidden">Buscar</label>` ou `aria-label`.

---

### 5.3 Event handlers inline no HTML
- [ ] **Esforco: P**

**Onde:**
- `taguatinga/index.html` linha 47 — `onload="this.parentElement.querySelector('.skeleton')..."`
- `asasul/index.html` — mesmo padrao
- `adoracao/app.js` — gera `onclick="window.open(...)"` via template string

**Como resolver:** Mover para `addEventListener` nos arquivos JS.

---

### 5.4 Chave do localStorage para tema inconsistente
- [ ] **Esforco: P**

Um usuario que troca o tema em uma pagina nao ve a mesma preferencia na secao providencia.

**Onde:**
- `js/header.js` — usa `'shalom-theme'`
- `providencia/js/config.js` — usa `'prov-theme'`

**Como resolver:** Unificar em uma unica chave e remover a duplicacao do toggle em `providencia/js/config.js`.

---

## 6. Performance (Media-Alta Prioridade)

### 6.1 Imagens nao otimizadas (21MB em 25anos/)
- [ ] **Esforco: M**

**Arquivos criticos:**
| Arquivo | Tamanho |
|---------|---------|
| `25anos/images/BG2.png` | 8.3 MB |
| `taguatinga/images/hero.jpg` | 4.6 MB |
| `taguatinga/images/grupos-oracao.jpg` | 4.8 MB |
| `25anos/images/EusouKyrios.png` | 2.9 MB |
| `25anos/images/i-vocacional.png` | 2.8 MB |
| `25anos/images/missionarios.png` | 2.5 MB |
| `25anos/images/inauguracao.png` | 1.9 MB |

**Como resolver:** Converter para WebP (qualidade 80), redimensionar para dimensoes maximas de exibicao, usar `<picture>` com fallback. Meta: cada imagem abaixo de 200KB.

---

### 6.2 Sem lazy loading em imagens pesadas
- [ ] **Esforco: P**

**Onde:** `25anos/index.html` — imagens como `coracao.png` (351KB), `EusouKyrios.png` (2.9MB) e galeria carregam sem `loading="lazy"`.

**Como resolver:** Adicionar `loading="lazy"` em todas as imagens abaixo da dobra. Manter hero com `loading="eager"`.

---

### 6.3 Google Fonts carregando pesos desnecessarios
- [ ] **Esforco: P**

**Onde:** `js/header.js` — carrega Montserrat com 18 pesos (100-900 normal + italico). Apenas 400, 600, 700 e 800 sao efetivamente usados.

**Como resolver:** Reduzir a requisicao para `wght@400;600;700;800`.

---

### 6.4 Sem cache para dados do Google Sheets
- [ ] **Esforco: M**

Cada carregamento de pagina faz fetch da planilha. Navegando entre paginas, os mesmos dados sao re-buscados.

**Como resolver:** Usar `sessionStorage` com TTL (ex: 5 minutos) para cache das respostas CSV.

---

## 7. Arquitetura (Baixa-Media Prioridade)

### 7.1 Sem sistema de build
- [ ] **Esforco: G**

Nao ha minificacao, bundling, linting ou formatacao automatica. SCSS e compilado manualmente via extensao do VS Code.

**Como resolver:** Introduzir build minimo:
- **Opcao A (minima):** npm scripts com `sass` + `esbuild` + `prettier`
- **Opcao B (zero-config):** Vite com configuracao multi-pagina
- Adicionar `.prettierrc` e `.eslintrc`

---

### 7.2 Sem sistema de modulos
- [ ] **Esforco: G** (depende de 7.1)

Scripts carregados via `<script>` em ordem especifica. Funcoes compartilhadas precisam ser globais.

**Como resolver:** Com build system, converter para ES modules (`import`/`export`).

---

### 7.3 Pasta _archive/ no repositorio ativo
- [ ] **Esforco: P**

`_archive/` tem 3.9MB de codigo inativo (futsh, kyrios, semanasanta, sh82) que e servido pelo GitHub Pages.

**Como resolver:** Mover para branch `archive` ou deletar. O codigo esta preservado no historico do git.

---

### 7.4 index.html raiz com 100 linhas de CSS inline para redirect
- [ ] **Esforco: P**

O `index.html` raiz tem 100 linhas de CSS inline que redefinem cores do design system, tudo para uma pagina que redireciona imediatamente via `window.location.href`.

**Como resolver:** Simplificar para redirect minimo (meta refresh + JS fallback, sem estilos).

---

## Refatoracao Proposta: Novos Arquivos Compartilhados

### js/utils.js
```
parseCSV(text)          — consolidada de 3 implementacoes
escapeHTML(str)         — consolidada de 2 implementacoes
buildWhatsAppUrl(phone, msg) — consolidada de 2 implementacoes
copyToClipboard(text)   — modernizada de 2 implementacoes
WHATSAPP_SVG            — constante SVG unica
showError(container, msg) — padrao de exibicao de erro
```

### js/config.js
```
SHEETS_URLS             — todas as URLs do Google Sheets
WHATSAPP_NUMBERS        — numeros centralizados
SITE_CONSTANTS          — meta adoradores, etc.
```

### js/feed-loader.js
```
carregarNoticiasComShalom(listId) — extraida de taguatinga e asasul
```

### scss/_dark.scss (refatorado)
```
@mixin dark-tokens { ... }  — tokens definidos uma unica vez
```

---

## Ordem de Execucao Sugerida

### Fase 1 — Quick wins (1-2 dias)
- [ ] Corrigir XSS em adoracao/app.js e 25anos/js/main.js
- [ ] Remover codigo morto de centralScript.js
- [ ] Adicionar `<main>` e labels nas paginas HTML
- [ ] Comprimir as 7 imagens maiores para WebP
- [ ] Remover ou mover `_archive/`

### Fase 2 — Utilitarios compartilhados (2-3 dias)
- [ ] Criar `js/utils.js` e `js/config.js`
- [ ] Eliminar todas as duplicacoes de funcoes
- [ ] Unificar chave do localStorage para tema
- [ ] Adicionar lazy loading nas imagens abaixo da dobra

### Fase 3 — Consolidacao CSS (2-3 dias)
- [ ] Criar mixin dark mode para eliminar duplicacao
- [ ] Remover `!important` desnecessarios
- [ ] Substituir cores hardcoded por variaveis CSS
- [ ] Padronizar unidades

### Fase 4 — Modernizacao JS (3-5 dias)
- [ ] Converter todo JS para ES6
- [ ] Envolver scripts em IIFEs / modulos
- [ ] Substituir handlers inline por addEventListener
- [ ] Substituir manipulacao de style por classes CSS
- [ ] Adicionar cache com sessionStorage para Google Sheets

### Fase 5 — Build system (3-5 dias)
- [ ] Adicionar package.json com npm scripts
- [ ] Configurar compilacao SCSS
- [ ] Configurar bundling JS
- [ ] Adicionar prettier + eslint
- [ ] Adicionar pre-commit hooks
