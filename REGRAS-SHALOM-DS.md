# Shalom DS neste repositório

> Este arquivo fica na **raiz** do repositório de propósito: é a primeira coisa
> que uma pessoa, ou um agente de IA, precisa ler antes de escrever uma linha de
> interface aqui. É curto. Leia inteiro.

---

## 1. Onde o sistema está

O Shalom DS 2.0 vive em **`ds/v2/`** (no repositório do Portal: `public/ds/v2/`).

**Essa pasta é gerada. Não edite nada lá dentro.** A fonte da verdade é o
repositório canônico do DS, em `ShalomProject/design-system/`. Edição feita na
cópia é apagada sem aviso na próxima publicação, e `verificar-ds.sh` acusa antes
disso.

Precisa mudar o sistema? Muda no canônico e publica de novo. Precisa resolver
agora, em produção? Ver a regra 8.

---

## 2. Como incluir

Um `<link>` resolve tudo: camadas, tokens, fundações, componentes e as fontes
auto-hospedadas.

```html
<link rel="icon" type="image/svg+xml" href="/ds/v2/assets/brand/favicons/favicon-publico.svg">
<link rel="stylesheet" href="/ds/v2/shalom-ds.css">                 <!-- 1. o sistema, sempre primeiro -->
<link rel="stylesheet" href="/ds/v2/tokens/themes/jubileu-25.css">  <!-- 2. tema de evento, só se for do evento -->
<link rel="stylesheet" href="./css/desta-pagina.css">               <!-- 3. o CSS desta página, sempre por último -->
<script src="/ds/v2/js/shalom-ds.js" defer></script>                <!-- 4. comportamento, opcional -->
```

- No Portal, o favicon é `favicon-interno.svg`, não o público.
- **Nenhum `<link>` de fonte, nunca.** Nada de `fonts.googleapis.com`, nem em
  desenvolvimento. As fontes vêm dentro do DS.
- Tema de evento também exige o atributo: `<html data-sh-theme="jubileu-25">`.
- Claro e escuro funcionam sozinhos. Sem atributo, seguem o aparelho; com
  `data-theme="light"` ou `"dark"`, seguem a escolha da pessoa.

O bloco completo, comentado, está em `distribuicao/snippet-publico.html` e
`distribuicao/snippet-portal.html` no repositório do DS.

---

## 3. As regras invioláveis

Estas não se discutem por PR. Mudam só por decisão registrada.

1. **Só a camada semântica.** Componente lê `--sh-text-default`,
   `--sh-surface-default`, `--sh-action-primary-bg`. Nunca um primitivo
   (`--sh-navy-700`), nunca um hex cru. Se você quer "outra cor aqui", quase
   sempre falta um token, não uma exceção.
2. **Barra lateral é proibida no sistema inteiro.** Nada de borda vertical de um
   lado só como ênfase, em aviso, citação, item ativo ou card. Borda vertical
   estrutural (divisor de coluna, divisor entre itens) continua valendo.
3. **Vidro é disciplinado.** Superfície translúcida só onde o sistema já a
   define, com o fundo previsto por trás. Não invente `backdrop-filter` em cima
   de conteúdo arbitrário: texto sobre vidro sem contraste medido é reprovação
   de acessibilidade, não estilo.
4. **A pomba nunca gira, espelha ou inclina.** Nem em animação, nem em hover,
   nem "só um pouquinho". Também não muda de proporção nem ganha contorno.
5. **Tipografia oficial:** Montserrat (display, texto e interface), Fraunces
   (acento editorial, raro), JetBrains Mono (dado, código, credencial). Fonte de
   tema de evento só dentro do tema. Nenhuma outra família entra sem decisão
   registrada.
6. **Estado nunca é só cor**, e sai de atributo nativo ou ARIA, não de classe
   inventada.
7. **Contraste é medido, não estimado.** Texto e fundo em 4,5:1; limite e
   indicador em 3:1. Alvo interativo de 44x44 no mínimo.
8. **`!important` só em `@layer sh.overrides`**, com comentário e data. Fora de
   camada é dívida, e dívida sem comentário é bug futuro.
9. **Sem `<select>` nativo.** Use o componente de seleção do DS.
10. **`prefers-reduced-motion` é respeitado sempre.**
11. **Nenhum seletor de componente contém `[data-sh-theme="..."]`.** Se um
    componente precisou saber em que tema está, falta um token.

---

## 4. Como criar um tema de evento

Um tema é **um arquivo** em `tokens/themes/<slug>.css` no repositório canônico.
Nada além disso, e nunca aqui na cópia.

O caminho curto, em cinco pontos (o completo está em `docs/05-governanca.md` §4):

1. **Slug curto e estável**, sem ano: `acamps`, não `acamps-2026-2`.
2. **Levantar a identidade real antes de escrever CSS**: fundo dominante, cor de
   ação, acento, tinta de texto, fonte display, fonte de acento, raio,
   personalidade da sombra. Campo vazio significa que o tema ainda não existe.
3. **Todo hex do tema mora nos primitivos do tema**, com sigla própria
   (`--sh-jub-gold`), e em nenhum outro lugar do arquivo.
4. **Passar no portão de contraste antes de mapear a semântica.** Quando um valor
   da marca reprova, a saída é derivar um par (um claro para preenchimento, um
   escuro para texto), não abaixar a régua.
5. **Tema sem modo escuro não é aceito.** São três blocos: base, a media query
   `prefers-color-scheme`, e `[data-theme="dark"]`.

Depois: provar nos seis cenários e registrar a decisão. Tema é do evento; o
institucional é de todo mundo.

---

## 5. Onde ler o resto

Tudo no repositório canônico, `ShalomProject/design-system/docs/`:

| Documento | Responde |
|---|---|
| `01-identidade.md` | por que estas cores, esta pomba, esta tipografia |
| `02-arquitetura-tokens.md` | as três camadas de token e como escolher |
| `03-inventario-componentes.md` | que componente existe e qual é o substituto do padrão antigo |
| `04-guia-de-migracao.md` | como uma página legada vira página do sistema |
| `05-governanca.md` | quem decide o quê, como propor mudança, versionamento |
| `06-distribuicao.md` | por que o DS chega aqui assim, e como atualizar os dois repositórios |

Página de prova, com todos os tokens e componentes nos seis cenários:
`design-system/prova.html`, servida local.

---

## 6. Se você é um agente de IA lendo este repositório

- **Não crie token, componente, cor ou fonte.** Use o que existe. Se faltar,
  diga que falta e onde, em vez de inventar uma exceção local.
- **Não edite `ds/`.** É artefato gerado. Alterou ali, o trabalho se perde.
- **Não copie CSS de página antiga.** Boa parte do repositório ainda é legado em
  migração, e reproduzir aquilo é reintroduzir a dívida que o DS veio pagar.
- **Antes de escrever CSS novo**, procure a classe `sh-*` equivalente em
  `03-inventario-componentes.md`. Seis sistemas de botão coexistiram aqui por não
  se ter feito essa pergunta.
- **Contraste você calcula**, não estima, e mostra a conta.
- Em dúvida entre duas rotas, escolha a que **não** cria uma exceção, e registre
  a dúvida para decisão humana.
