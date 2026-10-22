# SH82 · Avaliação do cardápio da Asa Sul

**Data:** 21/10/2026 · **Situação:** avaliação concluída, aguardando decisões do PO antes do protótipo.

Insumos avaliados: a arte "Lanchonete Shalom · Cardápio semanal" enviada pelo João, a página publicada em
`https://brasilia.comshalom.org/sh82cafe/` (este repositório, pasta `sh82cafe/`), os dados públicos no Supabase
(`menu_categories`, `menu_products`, `settings/cafe_info` do site `sh82cafe`) e o editor do Portal
(`shalom-brasilia-sistemas/src/features/site/EditorDoSite.tsx`, módulo Cardápio).

## 1. Achado principal

O cardápio publicado **não é o da Asa Sul**. As 11 categorias e produtos no banco são o mock de julho
(Espresso R$ 6, Cappuccino R$ 12, Cheesecake R$ 15, Quiche às segundas por R$ 16, "Torta de limão só hoje"
em 18/07). Nada disso aparece na arte. Hoje um cliente pode ver no celular preço e produto que não existem.
`cafe_info` também está vazio (sem endereço, horário, Instagram ou aviso).

A boa notícia: o modelo de dados já sustenta a lógica da arte. "Menu padrão" é disponibilidade *Sempre*, e
cada especial do dia é *Dias da semana* com um dia marcado. O que falta é conteúdo real, identidade visual,
uma organização da página que siga o jeito que a lanchonete funciona e alguns ajustes no editor.

## 2. A arte

### Estilo

| Funciona | Atrapalha |
|---|---|
| Amarelo sobre carvão é forte, legível e conversa com o logo SH82 (cápsula de contorno amarelo). Cores amostradas: amarelo ≈ `#FDD720`, fundo ≈ `#1F1F1F` com textura. | Três famílias tipográficas disputando (slab pesado no título, slab espaçado nos dias, sans fina e muito espaçada nos itens). Parece modelo pronto adaptado. |
| A organização por dia da semana é memorável e fácil de explicar no balcão. | O espaçamento entre letras dos itens é exagerado: lê-se devagar, e no celular vira linha quebrada. |
| O círculo amarelo dá personalidade e ponto de entrada. | Alinhamento solto: preços em colunas diferentes, linha da Quinta mais curta e recuada, item da Quinta em corpo menor que os outros. |
| | Duas marcas na mesma peça: "Lanchonete Shalom" grande e o logo "SH 82" pequeno no canto. Não fica claro qual é o nome. |
| | Hierarquia invertida: o Menu padrão, que vale todo dia e concentra a maior parte das vendas, está no canto inferior direito; Terça ocupa um bloco inteiro para dizer "Menu Padrão". |
| | Por ser imagem fixa, não sabe que dia é hoje: o cliente precisa achar o dia sozinho. |

### Texto (correções objetivas)

- "Refigerantes" → **Refrigerantes**.
- "Àgua" e "Àgua com Gás" → **Água** e **Água com gás** (não há crase).
- Caixa mista: "Sanduíche Natural", "Salgados Variados", "Pão de Queijo" em maiúsculas iniciais, e "Empada de palmito", "Pão com ovo" em minúsculas. Padrão recomendado: só a primeira letra maiúscula ("Sanduíche natural", "Pão de queijo na chapa").
- Preços sem "R$". No impresso passa; no digital entram sempre como "R$ 6,90".
- "Terça · Menu Padrão" não precisa existir como item: no digital, dia sem especial simplesmente mostra o menu padrão.

### Informação que falta ou está ambígua

| Item | Dúvida |
|---|---|
| Tapioca · "A partir de 5,00" | Quais sabores e quanto custa cada um? |
| Salgados variados · 6,90 | Quais salgados? Lista fixa ou "consulte no balcão"? |
| Pão de queijo na chapa · 15,00 | Por que custa mais de quatro vezes o pão de queijo comum? Recheio, tamanho, acompanhamento? Precisa de descrição. |
| Milkshake · 15,00 | Sabores? |
| Domingo · "Sobremesas após a Santa Missa" | Quais sobremesas, quanto custam, depois de qual Missa (horário)? |
| Menu padrão | Vale todos os dias, inclusive domingo? |
| Funcionamento | Horário de abertura por dia, formas de pagamento (Pix, cartão), localização exata, Instagram ou WhatsApp. |
| Especiais | São "enquanto durar"? Se sim, o digital precisa de um "acabou hoje". |
| Nome | "Lanchonete Shalom", "SH82 Café" ou os dois? E a grafia: SH82, SH 82 ou SH-82 (o site usa SH-82)? |

## 3. A página publicada

- **Dados fictícios** (ver achado principal).
- **Identidade provisória** preto e branco com "café" em letra cursiva; não usa o amarelo nem o logo da arte. O plano de julho já previa trocar quando a identidade chegasse: a arte é essa identidade.
- **Organização por categoria** (Bebidas, Salgados, Doces), enquanto a lanchonete funciona por "menu padrão + especial do dia". O especial de hoje não ganha destaque.
- **Cartões grandes demais:** cada produto ocupa quase meia tela, com um círculo de inicial no lugar da foto. Cabem 2 itens e meio por tela; a arte inteira, com 15 itens, caberia em uma tela e meia como lista "nome ······ preço".
- **Botão redondo de início** sobrepõe os chips de categoria quando a página rola.
- **Sem cabeçalho útil:** só o logo; nenhum horário, endereço ou aviso.
- **Preço só numérico:** não aceita "a partir de" nem sabores com preços diferentes (tapioca, milkshake).
- **Pedido para mostrar no balcão** funciona, mas o botão "Adicionar" em cada cartão pesa a tela. Vale manter só se a equipe do balcão de fato usar.
- **Cópia local quebrada:** no checkout local, `sh82cafe/index.html` tem uma alteração não publicada que apagou a linha das fontes e deixou uma tag `<link>` aberta. Produção está íntegra; essa alteração não deve ser publicada.

## 4. O editor (Portal)

Pontos fortes: disponibilidade com quatro opções claras (Sempre, Dias da semana, Período, Só hoje), aviso
"aparece hoje / não aparece hoje", foto comprimida automaticamente, ocultar categoria, confirmação ao excluir.

| Problema | Proposta |
|---|---|
| Campo "Endereço curto (slug)" exposto para quem cuida da lanchonete. | Gerar sozinho e esconder. |
| O voluntário pensa por dia ("o que tem na quinta?"), o editor só lista por categoria. | Visão **Semana**, igual à arte: Seg a Dom com o especial de cada dia, mais o Menu padrão. |
| Acabou o especial, só existe "Inativo", que some até alguém religar. | **Esgotado hoje**: some ou aparece riscado só hoje e volta sozinho amanhã. |
| Trocar preço exige abrir a folha inteira. | Preço editável direto na lista. |
| Reordenar é seta para cima ou para baixo, um passo e uma gravação por vez. | Arrastar e soltar, com seta mantida para teclado. |
| Sem prévia. | "Ver como fica hoje" e "ver outro dia" abrindo a página pública naquele dia. |
| Preço único. | Opções com preço (sabores da tapioca e do milkshake) e "a partir de" calculado da menor opção. |
| Sem informações da lanchonete na mesma tela. | Horário, pagamento, endereço e observações por dia ("Domingo: depois da Missa das 10h") no módulo de informações. |
| Dois lugares editam o mesmo cardápio (admin externo `/admin/` e Portal). | Portal como único editor; aba Cardápio do admin externo vira só leitura ou sai. |

Evolução natural: **gerar a arte da semana a partir dos mesmos dados** (imagem para story/WhatsApp e PDF para
imprimir), para o impresso e o digital nunca mais divergirem.

## 5. Proposta de página pública

1. **Topo:** logo SH82 real (arquivo), nome definido, "Asa Sul" e situação "Aberto agora · até 20h".
2. **Hoje · Terça-feira:** bloco amarelo com o especial do dia; sem especial, "Hoje vale o menu padrão".
3. **Menu padrão:** lista compacta nome ······ preço, agrupada (Salgados, Bebidas), com foto opcional.
4. **Na semana:** faixa Seg a Dom com o especial de cada dia; tocar num dia mostra o que tem.
5. **Rodapé:** horário, pagamento, endereço, Instagram.
6. **Pedido para o balcão:** opcional, com botão "+" discreto.

Tipografia sugerida: uma slab forte só para títulos e dias (no espírito da arte) e uma sans legível sem
espaçamento exagerado para itens e preços, com preços em algarismos tabulares alinhados.

## 6. Decisões do PO (21/10/2026)

1. **Nome:** "Lanchonete Shalom | SH82".
2. **Identidade:** adotar o amarelo e o carvão da arte. O arquivo do logo SH82 ainda precisa ser enviado.
3. **Informações que faltam:** o painel precisa permitir preencher tudo o que falta (sabores e preços, descrições, horário, pagamento, contatos, observação por dia), sem depender de desenvolvedor.
4. **Pedido:** passa a ser enviado de verdade. O cliente informa nome e telefone, o pedido aparece no painel e só vale depois de confirmado no balcão.
5. **Editor:** o Portal é o único editor. O acesso é liberado pelo João para pessoas específicas. O painel precisa ser leve, agradável e fácil para editar o cardápio e acompanhar os pedidos.
6. **Dados reais:** feito em 21/10/2026 pelo SQL Editor do Supabase (projeto Brasilia Comshalom, produção), com o script `docs/seeds/2026-10-21-sh82-cardapio-real.sql` e a cópia do estado anterior ao lado. Conferido: 3 categorias (Especial do dia, Salgados, Bebidas), 14 itens com os preços da arte, subtítulo "Lanchonete Shalom · Asa Sul" e aviso de domingo. A página no ar já mostra o cardápio real. O nome no banco segue "SH-82 Café" até a construção da página nova.
7. **Endereço final:** a página pública passa a ser `/asasul/sh82` (pedido do PO em 21/10). O endereço atual `/sh82cafe/` deve redirecionar para o novo quando a página nova for publicada.

Próximo passo pela regra do Portal: protótipo navegável da página pública com pedido e do painel da lanchonete, antes de qualquer código.
