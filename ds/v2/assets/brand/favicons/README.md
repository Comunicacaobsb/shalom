# Favicons do ecossistema Shalom

**Última atualização:** 17 de agosto de 2026

Um favicon padrão para todas as páginas dos dois repositórios, com claro e
escuro no mesmo arquivo, e **cores diferentes para público e interno**, para que
a aba do site institucional não se confunda com a aba do Portal.

---

## 1. Qual arquivo em qual lugar

| Arquivo | Onde | Cor | Por quê |
|---|---|---|---|
| `favicon-publico.svg` | site público, todas as páginas (`Comunicacaobsb/shalom`) | família **navy** | é a cor do emblema e a do site que qualquer pessoa acessa |
| `favicon-interno.svg` | Portal, todas as rotas (`Comunicacaobsb/shalom-brasilia-sistemas`) | família **ember** | a aba do sistema interno precisa se distinguir da institucional na barra do navegador |
| `favicon-jubileu-25.svg` | só as páginas do Jubileu de 25 anos, no site público | dourado do jubileu | tema de evento, com data para sair de cena |

O do jubileu **nasceu** em `docs-site/assets/favicon-jubileu-25.svg`, antes de esta
pasta existir, e foi **movido para cá em 18/08/2026** (DEC-036, que encerrou a
pendência P-02 do `docs/06-distribuicao.md`). O `publicar-ds.sh` não tem mais
exceção de origem: os três favicons viajam juntos, por `assets/brand/`.

Existe ainda `docs-site/assets/favicon.svg`, do site de documentação do DS. Ele é
navy também, com `#204f8c` e `#a9c0dd`, valores anteriores à calibragem da rampa.
O `favicon-publico.svg` usa os tokens atuais. Alinhar os dois é ajuste pendente,
sem urgência: o docs-site tem publicação própria.

---

## 2. Como incluir

```html
<!-- Site público -->
<link rel="icon" type="image/svg+xml" href="/ds/v2/assets/brand/favicons/favicon-publico.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">

<!-- Portal -->
<link rel="icon" type="image/svg+xml" href="/ds/v2/assets/brand/favicons/favicon-interno.svg">

<!-- Página do Jubileu, no site público -->
<link rel="icon" type="image/svg+xml" href="/ds/v2/assets/brand/favicons/favicon-jubileu-25.svg">
```

Os dois PNGs continuam por enquanto como reserva para navegador antigo, que não
lê favicon SVG. Quando o legado sair, sai a reserva junto. O `<link>` do SVG vem
primeiro: navegador que entende SVG usa o primeiro que reconhece.

### No repositório público, o certo é injetar por `js/header.js`

`js/header.js` já injeta os favicons em runtime para as páginas que o carregam,
hoje apontando para `basePath + 'favicon/'`. Na migração, ele passa a injetar
primeiro o SVG:

```js
var favicons = [
  { rel: 'icon', type: 'image/svg+xml', href: '/ds/v2/assets/brand/favicons/favicon-publico.svg' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: basePath + 'favicon/apple-touch-icon.png' },
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: basePath + 'favicon/favicon-32x32.png' },
  { rel: 'icon', type: 'image/png', sizes: '16x16', href: basePath + 'favicon/favicon-16x16.png' }
];
```

Uma edição, e as 12 páginas que carregam o `header.js` mudam juntas. Página que
declara o favicon estaticamente no `<head>` continua valendo: a estática vence,
porque o navegador usa a última declaração válida e a injeção não remove nada.
Página de tema (Jubileu) declara o dela no HTML.

---

## 3. Por que estas cores

### Público: navy, a cor do emblema

Sem novidade nenhuma, de propósito. `--sh-navy-700` é o azul da base do gradiente
do emblema oficial. Na barra escura, o navy escuro sumiria, então o arquivo troca
para `--sh-navy-200`, que é a mesma família, clara o bastante para ler.

### Interno: ember, e não outro qualquer

Três candidatos foram considerados:

| Candidato | Veredito |
|---|---|
| Dourado do jubileu | **descartado.** É tema de evento, com data de aposentadoria. O Portal é permanente; herdar identidade temporária cria um favicon que envelhece sozinho |
| Um verde ou roxo novo | **descartado.** Seria cor inventada, fora da paleta oficial, contra a regra 1 do sistema |
| **Ember** | **escolhido.** É família oficial do DS, tirada do próprio emblema (a luz e o corpo da pomba), com rampa completa e uso semântico já definido em acento e ação |

E é a escolha que mais se distingue: azul contra laranja é o par que sobrevive às
deficiências de visão de cor mais comuns, porque não depende do eixo
vermelho-verde. Na barra de abas, medido em CIELAB, a distância entre os dois
favicons é **dE76 84 no esquema claro e 92 no escuro** (o limiar de percepção
fica perto de 2,3), com matizes praticamente opostas: 272° contra 49° no claro,
261° contra 71° no escuro.

---

## 4. Contraste medido

Calculado por WCAG 2.x e **conferido no navegador**, lendo com
`getComputedStyle` a cor que a media query resolveu de fato em cada esquema. As
duas implementações, o cálculo em Python e a leitura no Chrome, deram o mesmo
número.

### `favicon-publico.svg`

| Esquema | Cor | Token | vs `#ffffff` | vs `#f6f6f6` (Safari) | vs `#202124` (Chrome) | vs `#2f3033` |
|---|---|---|---|---|---|---|
| claro | `#184e7f` | `--sh-navy-700` | **8,62:1** | **7,98:1** | 1,87:1 | 1,53:1 |
| escuro | `#c3defb` | `--sh-navy-200` | 1,39:1 | 1,28:1 | **11,62:1** | **9,53:1** |

### `favicon-interno.svg`

| Esquema | Cor | Token | vs `#ffffff` | vs `#f6f6f6` (Safari) | vs `#202124` (Chrome) | vs `#2f3033` |
|---|---|---|---|---|---|---|
| claro | `#ab4b20` | `--sh-ember-700` | **5,59:1** | **5,17:1** | 2,88:1 | 2,36:1 |
| escuro | `#fba32b` | `--sh-ember-400` | 2,02:1 | 1,87:1 | **7,95:1** | **6,52:1** |

### `favicon-jubileu-25.svg` (herdado, medido para registro)

| Esquema | Cor | vs `#ffffff` | vs `#f6f6f6` (Safari) | vs `#202124` (Chrome) | vs `#2f3033` |
|---|---|---|---|---|---|
| claro | `#8d7300` | **4,58:1** | 4,23:1 | 3,51:1 | 2,88:1 |
| escuro | `#f8e995` | 1,26:1 | 1,16:1 | **13,09:1** | **10,73:1** |

Passa, com folga pequena no claro (4,58:1 contra o mínimo de 4,5:1). Como é tema
de evento, com data para sair, fica como está. Se um dia o dourado do jubileu for
reaproveitado fora do evento, o valor claro precisa de um degrau a mais de tinta.

Os números em negrito são os que valem: a cor do esquema claro só aparece em
barra clara, e a do escuro só em barra escura. Todos passam de 4,5:1 no par que
importa.

Por que `--sh-ember-700` e não um ember mais vivo: `--sh-ember-500` (`#f27c23`,
o laranja do corpo da pomba) dá só 2,73:1 sobre branco, e `--sh-ember-600` dá
3,78:1. Os dois reprovariam. O 700 é o degrau mais claro da rampa que passa em
barra clara sem deixar de ser laranja.

---

## 5. Regras destes arquivos

- **A geometria é a do emblema oficial, ponto a ponto.** Os sete atributos `d`
  são cópia literal de `assets/brand/logo-shalom-icon.svg`. Conferido por
  comparação de string. Nenhum foi tocado, e nenhum deve ser.
- **A pomba nunca gira, espelha ou inclina** (`docs/01-identidade.md` §5).
- **Hex fixo aqui é correto, e é a única saída.** Favicon é renderizado fora de
  qualquer árvore de documento: não há elemento pai de quem herdar cor, e as
  custom properties do DS não existem nesse contexto. `currentColor` cairia em
  preto e a troca de esquema nunca aconteceria. Por isso cada arquivo traz um
  bloco `<style>` interno com a media query, e os hex são cópia literal de
  tokens primitivos.
- **Se a rampa mudar, estes arquivos mudam junto.** É a contrapartida do hex
  fixo, e está registrada aqui para não virar divergência silenciosa.
- **Sem caixa colorida atrás da pomba.** A marca é a silhueta; o fundo é a barra
  do navegador. Se um dia 16px se mostrar ilegível em algum aparelho, a saída é
  engrossar a silhueta, não enfiar o emblema num quadrado.
- Os arquivos são XML válido, verificado com `xmllint`. Atenção ao editar
  comentários: **XML proíbe hífen duplo dentro de comentário**, então nome de
  token aparece ali como `sh-navy-700`, sem os dois hifens iniciais.

---

## 6. Como conferir depois de mexer

```bash
xmllint --noout favicon-publico.svg favicon-interno.svg
```

E no navegador, com o esquema do sistema alternado entre claro e escuro: abrir a
página, olhar a aba, e ler a cor resolvida com

```js
getComputedStyle(document.querySelector('svg .fi')).fill
```

sobre o SVG inlinado. O procedimento completo, com a tabela de contraste gerada,
está descrito em `docs/06-distribuicao.md` §9.
