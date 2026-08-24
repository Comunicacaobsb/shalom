# assets/brand/jubileu-25

As oito peças da identidade do **Jubileu de 25 anos da Missão Shalom Brasília**, prontas para
o Shalom DS. Derivadas dos originais fornecidos pelo dono do projeto — mesma geometria, ponto a
ponto — só com o mecanismo de cor tratado.

Esta é uma **sub-marca de evento**. A Comunidade Católica Shalom (`assets/brand/logo-shalom.svg`
e `logo-shalom-icon.svg`) continua sendo a marca-mãe — ver
[Relação com a marca institucional](#relação-com-a-marca-institucional) mais abaixo.

## Os 8 arquivos

| Arquivo | O que é | viewBox | Quando usar |
|---|---|---|---|
| `logo-completa.svg` | Lockup horizontal: emblema "25 com ramo de oliveira" + lettering manuscrito "SHALOM BRASÍLIA". Sem o mote. | `0 0 1609.99 536.91` | Cabeçalho e papelaria do jubileu onde há largura disponível (proporção ~3:1) e o mote não precisa aparecer. |
| `logo-completa-tema.svg` | O mesmo lockup de `logo-completa.svg`, com o mote **"Fecundos pelo Coração do Kyrios"** acrescido abaixo. | `0 0 1609.99 670.01` | Abertura de página, capa de programação, primeira dobra de site — qualquer peça onde a marca e o mote do ano precisam aparecer juntos, com espaço vertical de sobra. |
| `logo-icon.svg` | Só o emblema: o número "25" em traço manuscrito, cruzado por um ramo de oliveira com folhas e frutos. Sem lettering. Traço fino, cheio de detalhe (270 comandos de curva). | `0 0 1181.78 694.49` | Tamanho médio/grande — hero, capa, cabeçalho com espaço próprio para o emblema sozinho, ao lado de lettering vindo por outro arquivo (`logo-nome.svg`) ou por texto vivo. **Não usar pequeno** (ver `logo-small.svg`). |
| `logo-icon-tema.svg` | O mesmo emblema, com "ANOS" ao lado do ramo e o mote em três linhas abaixo. Proporção quase quadrada. | `0 0 1000 832.75` | Selo, carimbo, capa de post quadrado (rede social) — quando cabe emblema + mote mas não cabe o lockup horizontal completo. |
| `logo-nome.svg` | Lettering manuscrito empilhado em três linhas: "SHALOM" / "BRASÍLIA" / "25 ANOS". Sem o emblema, sem o mote. | `0 0 1000 698.9` | Formatos estreitos ou quase quadrados sem espaço para o emblema ao lado — rodapé, assinatura, redes sociais. |
| `logo-nome-tema.svg` | O mesmo lettering, reordenado ("25 ANOS" no topo) e com o mote em três linhas abaixo. | `0 0 1000 868.89` | Peça editorial/impressa vertical onde o mote precisa estar presente mas o emblema "25 com ramo" já aparece em outro elemento da página (ex.: ao lado, isolado). |
| `logo-shalom-25.svg` | **O único dos 8 que contém a pomba**: a marca institucional completa (bloco "SHALOM" com a pomba no lugar do "O", "COMUNIDADE CATÓLICA" acima) ao lado do emblema "25 com ramo". | `0 0 1609.99 408.85` | Peças que precisam deixar explícita a relação "a Comunidade Shalom celebrando 25 anos" para quem não necessariamente conhece o jubileu — convite oficial, assinatura de e-mail institucional, material para imprensa/parceiros externos. |
| `logo-small.svg` | O mesmo emblema de `logo-icon.svg` (mesma composição, mesmo viewBox), com uma segunda passada de vetorização: curvas mais lisas e só 102 comandos de curva contra 270 — menos "ruído" de traço à mão. | `0 0 1181.78 694.49` | Reprodução em tamanho reduzido: favicon, ícone de app, selo pequeno, impressão em escala pequena — onde o detalhe fino de `logo-icon.svg` viraria mancha. |

## Mecanismo de cor: só `currentColor`, sem mapa de variáveis

A tarefa original presumia que este lote teria arquivos multicolor precisando de um mapa
cor→variável (ex. `fill="var(--sh-jub-logo-gold, #c3a236)"`). **Isso foi verificado no código-fonte
dos 8 originais e não se confirmou:**

- Nenhum dos 8 arquivos tinha **qualquer** atributo de cor em **qualquer** `<path>` — nem `fill`,
  nem `style`, nem `class`, nem gradiente, nem `<defs>`. São desenhos puros, preenchidos pelo preto
  padrão implícito do SVG (o comportamento do `fill` quando o atributo simplesmente não existe).
- Ou seja: as 8 peças são **monocromáticas por natureza**, não por escolha de exportação. Não há
  "uma versão de cor fixa e outra pronta para currentColor" — todas chegaram como silhueta preta
  pura, sem exceção.

Por isso, **todas as 8** receberam o mesmo tratamento simples: `fill="currentColor"` em cada
`<path>`, igual ao que `assets/brand/logo-shalom.svg` já faz. Nenhum arquivo desta pasta usa custom
property de cor — a cor vem inteiramente de quem envolve o SVG.

Isso inclui `logo-shalom-25.svg`, mesmo contendo a pomba: a versão aqui é uma silhueta preta única
do lockup institucional (sem o gradiente azul/laranja que o emblema oficial carrega — ver
`docs/01-identidade.md` §1), preparada assim para esta peça do jubileu especificamente.

## Origem e o que mudou

Originais em `/Users/joaoroque/Documents/Pessoal/25anos Brasilia/Identidade/Logo/SVG/` (intocados —
não edite aqueles arquivos; qualquer atualização de traço vem de lá para cá, nunca o contrário).

Em cada um dos 8, a única mudança de conteúdo foi `fill="currentColor"` em todo `<path>` — nenhum
atributo `d` (geometria) foi tocado, verificado byte a byte por script contra o original.

Também foram removidos `id="Camada_1"` e `data-name="Camada 1"`, presentes idênticos nos 8
originais (artefato de exportação do Illustrator em localização pt-BR — o equivalente do
`id="Layer_1"` inglês que os dois SVGs institucionais já tinham antes de serem processados). Um
`id` fixo repetido em vários arquivos inlinados na mesma página é um documento HTML inválido; sem
ele, os 8 (e os 2 institucionais) convivem sem colisão.

Cada arquivo ganhou um `<title>` acessível descritivo e `role="img"` no `<svg>` raiz — sem
`aria-hidden`: essa decisão é de quem usa o arquivo, não do arquivo em si (ver
[Como usar](#como-usar)).

Nenhum dos 8 tinha `<style>` interno, então nenhum foi introduzido.

### Sobre o sufixo `-tema`

Nos 4 pares que o têm (`logo-completa`/`-tema`, `logo-nome`/`-tema`, `logo-icon`/`-tema`), o
sufixo **não é um mecanismo de cor** — nenhum arquivo tinha cor fixa para começar. Confirmado
comparando o desenho de cada par lado a lado: a versão `-tema` é a mesma arte com o **mote do ano**
("Fecundos pelo Coração do Kyrios") acrescido, e no caso de `logo-icon-tema.svg` também a palavra
"ANOS" ao lado do ramo. "Tema" aqui quer dizer "o tema/mote do jubileu daquele ano", não "tema de
cor" ou "tema claro/escuro".

## Como usar

**Inline, sempre.** Cole o conteúdo do arquivo direto no HTML (ou componha via template/include do
seu stack). `currentColor` só recolore um SVG que está *no mesmo documento* de quem define a cor.

Duas armadilhas que não funcionam aqui (mesmas de `assets/brand/`):

- **`<use href="logo-icon.svg#…">` (referência externa) não funciona em `file://`** — só carrega
  via HTTP(S), e mesmo servido, `currentColor` por `<use>` cross-document tem suporte inconsistente
  entre navegadores. Não use.
- **`<img src="logo-icon.svg">` não recolore.** Fora do documento, `currentColor` resolve para o
  valor inicial de `color` (preto) — o logotipo sai preto sempre, claro ou escuro, jubileu ou não.
  Exceção deliberada: um favicon (que roda fora de qualquer árvore de documento) precisa de hex fixo
  num `<style>` interno com `@media (prefers-color-scheme: dark)` — ver
  `docs-site/assets/favicon.svg` para o padrão institucional equivalente. Nenhum dos 8 arquivos
  desta pasta está preparado dessa forma, e nem deve estar: o favicon do tema já foi **gerado à
  parte**, em `assets/brand/favicons/favicon-jubileu-25.svg`, a partir de `logo-small.svg` (geometria
  idêntica) com dourado escuro `#8d7300` no claro — 4,58:1 contra barra de abas branca — e dourado
  claro `#f8e995` no escuro — 17,08:1 contra preto. Trocar o `<link rel="icon">` é decisão da
  página, igual a trocar o SVG do `sh-logo`.

## Regras de uso

- **Não distorcer.** Escala uniforme (mesma proporção nos dois eixos) é a única transformação de
  tamanho aceitável. Nenhum dos 8 deve esticar para caber num espaço com outra proporção — troque de
  arquivo (ex.: `logo-nome.svg` em vez de espremer `logo-completa.svg`) em vez de forçar o viewBox.
- **Não recolorir arbitrariamente.** `currentColor` deve resolver para um token do Shalom DS (a
  paleta do tema `jubileu-25` — dourado, vermelho/coral, bege — ou a rampa `--sh-navy-*`/`--sh-ember-*`
  institucional quando a peça pede o vínculo com a marca-mãe), nunca para uma cor solta escolhida no
  componente.
- **Área de respiro.** Nenhum destes SVGs embute margem — o viewBox é o desenho, colado nas bordas.
  Quem usar precisa reservar espaço ao redor (o padrão do Shalom DS para `sh-logo`/`sh-hero` já
  cuida disso; não cole o emblema rente a uma borda ou a outro elemento).
- **O mote não é texto vivo.** Nos 4 arquivos `-tema`, "Fecundos pelo Coração do Kyrios" é
  geometria vetorizada (traço manuscrito), não `<text>` — não há como truncar, selecionar ou
  traduzir essa frase sem trocar de arquivo. Se a página precisa do mote como texto de verdade
  (selecionável, com HTML semântico), escreva-o à parte e use a versão sem `-tema`.
- **A pomba, em `logo-shalom-25.svg`, segue a regra da marca institucional**
  (`docs/01-identidade.md` §5): nunca gira, espelha ou inclina, em nenhum uso.

## Como isto entra no Shalom DS

O componente `sh-logo` **não troca de desenho por seletor de tema** — nenhum seletor de componente
cita `[data-sh-theme]`. A troca é feita em duas metades: a **página** cola outro SVG dentro do mesmo
`<a class="sh-logo">` (e troca o `aria-label` junto), e o **tema** ajusta a medida por token —
`tokens/themes/jubileu-25.css` sobe `--sh-logo-size`, `--sh-logo-full-size` e `--sh-logo-mark-size`
de 2rem para 3rem, porque no padrão o lockup de ~3:1 fecha demais e o ramo de oliveira vira mancha.

Tabela de qual arquivo usar em cada lugar, com o exemplo vivo:
`docs-site/componentes/logo.html` → "A marca por tema", e `docs-site/arquitetura/temas.html` →
"A marca de um tema de evento". Demonstração dos dois cabeçalhos lado a lado:
`prova-navegacao.html` → "Como o jubileu vira a marca do site".

## Relação com a marca institucional

O jubileu de 25 anos é um **evento**; a Comunidade Católica Shalom é a **marca-mãe**, permanente.
Nenhuma peça desta pasta substitui `assets/brand/logo-shalom.svg` como identidade da instituição —
elas convivem com ela pelo tempo do jubileu.

Só `logo-shalom-25.svg` mostra as duas marcas juntas na mesma arte. Os outros 7 arquivos são só o
jubileu: em contextos onde a origem institucional precisa ficar explícita e nenhum desses 7 estiver
em uso, combine com `assets/brand/logo-shalom.svg` (ou o `sh-dove` de selo) por composição — nunca
redesenhando ou recompondo o emblema institucional dentro de um arquivo do jubileu.
