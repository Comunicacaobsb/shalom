# assets/brand

As duas peças **oficiais** da identidade da Comunidade Católica Shalom, prontas para o Shalom DS. São derivadas dos originais fornecidos pelo dono do projeto — mesma geometria, ponto a ponto — só com o mecanismo de cor trocado.

| Arquivo | O que é | viewBox |
|---|---|---|
| `logo-shalom.svg` | Logotipo completo: lettering "COMUNIDADE CATÓLICA" + wordmark SHALOM, com a pomba no lugar do "O" | `0 0 433.6 118.17` |
| `logo-shalom-icon.svg` | Só o ícone/emblema — a pomba isolada, sem lettering | `0 0 108.05 103.84` |

## Origem e o que mudou

Originais em `/Users/joaoroque/Documents/Pessoal/Shalom/` (intocados — não edite aqueles arquivos; qualquer atualização de traço vem de lá para cá, nunca o contrário). Lá, todo `<path>` pinta com `fill: #204f8c` fixo via uma classe `.cls-1` declarada num `<style>` interno.

Aqui, cada `<path>` tem `fill="currentColor"` direto no atributo, e o `<style>`/`<defs>` de cor saiu. Nada na geometria (nenhum atributo `d`) foi tocado. Também foi removido o `id="Layer_1"`/`data-name` que os dois originais compartilhavam (artefato de exportação do Illustrator) — se os dois SVGs forem inlinados na mesma página, um `id` fixo repetido é um documento HTML inválido; sem ele, os dois convivem sem colisão. Cada arquivo ganhou um `<title>` acessível (`role="img"` no `<svg>` raiz) — mas **nenhum `aria-hidden`**: essa decisão é de quem usa o arquivo, não do arquivo em si (ver `#como-usar` abaixo).

`#204f8c` não é um azul à parte: é o mesmo tom absorvido pelo token `--sh-navy-700` (`#184e7f`) do Shalom DS — ver `docs/01-identidade.md` §2.2. `currentColor` é o que deixa o logotipo herdar esse token (ou qualquer outro) de quem o envolve, em vez de carregar a própria cor.

## Como usar

**Inline, sempre.** Cole o conteúdo do arquivo direto no HTML (ou componha via template/include do seu stack). `currentColor` só recolore um SVG que está *no mesmo documento* de quem define a cor — é assim que a marca acompanha tema claro/escuro e os temas de evento sem precisar de uma segunda exportação.

Duas armadilhas que não funcionam aqui:

- **`<use href="logo-shalom.svg#…">` (referência externa) não funciona em `file://`** — só carrega via HTTP(S), e mesmo servido, currentColor por `<use>` cross-document tem suporte inconsistente entre navegadores. Não use.
- **`<img src="logo-shalom.svg">` não recolore.** Fora do documento, `currentColor` resolve para o valor inicial de `color` (preto) — sem contexto de quem o usa, o logotipo sai preto sempre, claro ou escuro. `<img>` serve só quando a cor fixa (preta) for aceitável, o que não é o uso normal aqui.

No Shalom DS, o jeito certo é dentro de `.sh-logo` / `.sh-dove` (`components/surface.css`), que dimensionam e pintam o que recebem por `currentColor` — ver `docs-site/componentes/logo.html` e `dove.html` para exemplos vivos com estes mesmos arquivos.

```html
<a class="sh-logo" href="/" aria-label="Comunidade Católica Shalom, página inicial">
  <svg viewBox="0 0 433.6 118.17" aria-hidden="true" focusable="false">
    <!-- cole aqui o conteúdo de logo-shalom.svg -->
  </svg>
</a>
```

## Marca reduzida — lockup completo × só o ícone × só texto

Em qualquer ponto pequeno da marca — menu, topo de painel, sidebar colapsada, selo de rodapé,
credencial, favicon, ícone de app — a decisão é sempre entre três respostas válidas, nunca uma
quarta:

| Resposta | Quando | Arquivo |
|---|---|---|
| Lockup completo | espaço confortável para emblema + lettering lado a lado, sem espremer nem truncar | `logo-shalom.svg` |
| Só o ícone | o espaço não cabe o lettering — o caso mais comum em interface, não a exceção. Piso de 16px: abaixo disso os 7 `<path>` viram mancha (`docs/01-identidade.md` §5) — aumente o contêiner, nunca distorça o ícone para caber | `logo-shalom-icon.svg` |
| Só texto | apenas quando o "texto" já É o lockup completo acima (sem separar emblema de lettering) — nunca uma palavra solta sem símbolo algum num ponto pequeno o bastante para exigir esta decisão | `logo-shalom.svg` |

**A quarta resposta, proibida:** uma inicial tipográfica ("S", "SH") desenhada ou digitada no
lugar do ícone. Se o espaço aperta a ponto de cogitar abreviar "Comunidade Católica Shalom" para
uma letra, a resposta certa continua sendo `logo-shalom-icon.svg` reduzido até o piso de 16px —
nunca um monograma inventado. Uma auditoria de agosto/2026 encontrou exatamente esse padrão em
três pontos do Shalom DS (a marca do painel administrativo e do login usando um ícone de contorno
reservado para outro uso, um avatar de prova com "SH" digitado, e a credencial de inscrição sem
nenhuma marca da Comunidade) — todos corrigidos para usar este mesmo arquivo.

O exemplo vivo completo — tabela de decisão, o caso canônico da sidebar que colapsa
(`sh-app-shell[data-collapsed]`) e o antes/depois da auditoria — está em
`docs-site/componentes/logo.html` → "Marca reduzida — quando usar o ícone".

## Regra de marca — a pomba nunca gira

Vale para `logo-shalom-icon.svg` e para o emblema dentro de `logo-shalom.svg`: **nunca rotacionar, espelhar ou inclinar**, em nenhum uso, decorativo ou não (`docs/01-identidade.md` §5). Escala uniforme e recoloração por `currentColor` são as únicas transformações permitidas.

## Saneamento aplicado (nota de proveniência)

Os dois originais fornecidos já vinham limpos — sem gradientes quebrados, sem paths órfãos, sem grupos vazios. As únicas irregularidades encontradas e corrigidas nesta cópia:

- `id="Layer_1"` e `data-name="Layer 1"` no `<svg>` raiz, idênticos nos dois arquivos (artefato padrão de exportação do Illustrator) — removidos, pelo motivo de colisão de `id` explicado acima. Nada no documento os referenciava.
- Nenhum `id` duplicado *dentro* de cada arquivo (gradientes, clip-paths, máscaras) foi encontrado — não havia o que sanear além da raiz.
