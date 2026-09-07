/* =====================================================================
   DADOS DOS EVENTOS  —  Shalom Taguatinga
   edite este arquivo para atualizar o carrossel.
   ---------------------------------------------------------------------
   id        -> identificador único usado na URL (evento.html?id=...)
   titulo    -> nome do evento
   badge     -> etiqueta curta (ex.: "Encontro", "Grupo de oração")
   data      -> texto livre de data/frequência
   local     -> onde acontece
   imagem    -> caminho da arte (coloque o arquivo em images/eventos/)
                Se o arquivo não existir, aparece um pôster de reserva.
   resumo    -> 1–2 linhas no card do carrossel
   descricao -> texto completo (várias linhas) para a página do evento
   link      -> { texto, url } botão externo (inscrição/WhatsApp) — destino do QR. null se não houver
   acao      -> rótulo do botão que abre a página interna
   featuredLocal -> true para os eventos fixos abaixo (grupos de oração e a
                Missa Jovem). Eventos marcados com featuredLocal aparecem
                mesmo com o Supabase ativo, até existir um evento remoto
                com o mesmo slug — nesse caso o remoto assume o slug.
   A ordem aqui é a ordem no carrossel.
   ===================================================================== */

/* Capa (padrão local; usado quando não há settings.home no painel) */
window.SHALOM_HOME = {
  titulo:     "Um lugar para\nencontrar Deus\nem Taguatinga",
  subtitulo:  "Missas, adoração, grupos de oração e formação. Toda a vida do Centro de Evangelização, num só lugar.",
  imagem:     "../images/shalom-taguatinga.webp",
  imagem_alt: "Centro de Evangelização Shalom Taguatinga"
};

/* Horários/serviços de reserva — usados enquanto o Supabase não estiver
   configurado. Depois de configurado, o painel /admin é a fonte oficial. */
window.SHALOM_SCHEDULES = {
  funcionamento: ["Segunda a sábado: 14h às 22h"],
  missa:         ["Segunda: 18h30", "Domingo: 10h", "Missa Jovem: 2º sábado do mês, às 17h"],
  grupos:        ["Grupo de casais: sábado às 17h", "Grupo aberto: quinta às 19h30", "Grupo jovem: sábado às 14h30"],
  adoracao:      ["Segunda a sexta: 14h30 às 21h"],
  servicos:      ["Bazar: segunda a sábado, 14h às 21h", "Livraria: segunda a sábado, 14h às 21h", "Lanchonete: segunda a sábado, 14h às 21h"],
  aconselhamento:["Segunda a sexta: 14h30 às 21h"]
};

window.SHALOM_EVENTOS = [
  {
    id: "grupo-aberto",
    titulo: "Grupo de Oração Aberto",
    badge: "Grupo de oração",
    data: "Toda quinta-feira às 19h30",
    local: "Shalom Taguatinga — QNA 26, Taguatinga",
    imagem: "images/eventos/grupo-aberto.webp",
    resumo: "Um grupo de oração aberto a todos. Venha rezar, louvar e caminhar em comunidade.",
    descricao:
`O Grupo de Oração Aberto do Shalom Taguatinga acolhe todas as pessoas que desejam rezar e louvar em comunidade. Não é preciso ser membro: basta chegar.

Quando: toda quinta-feira, às 19h30.
Onde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF.

Venha e traga um amigo.`,
    link: null,
    acao: "Saiba mais",
    featuredLocal: true
  },
  {
    id: "grupo-de-casais",
    titulo: "Grupo de Oração de Casais",
    badge: "Grupo de oração",
    data: "Todo sábado às 17h",
    local: "Shalom Taguatinga — QNA 26, Taguatinga",
    imagem: "",
    resumo: "Um espaço para os casais rezarem juntos e fortalecerem a vida a dois em Deus.",
    descricao:
`O Grupo de Oração de Casais do Shalom Taguatinga reúne casais para rezar, partilhar e crescer juntos na fé.

Quando: todo sábado, às 17h.
Onde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF.`,
    link: null,
    acao: "Saiba mais",
    featuredLocal: true
  },
  {
    id: "grupo-jovem",
    titulo: "Grupo de Oração Jovem",
    badge: "Grupo de oração",
    data: "Todo sábado às 14h30",
    local: "Shalom Taguatinga — QNA 26, Taguatinga",
    imagem: "",
    resumo: "Um grupo de oração para jovens que querem viver a fé com alegria e intensidade.",
    descricao:
`O Grupo de Oração Jovem do Shalom Taguatinga é um espaço para a juventude louvar, rezar e caminhar em comunidade.

Quando: todo sábado, às 14h30.
Onde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF.

Venha e traga um amigo.`,
    link: null,
    acao: "Saiba mais",
    featuredLocal: true
  },
  {
    id: "missa-jovem",
    titulo: "Missa Jovem",
    badge: "Missa especial",
    data: "2º sábado do mês, às 17h",
    local: "Shalom Taguatinga — QNA 26, Taguatinga",
    imagem: "",
    resumo: "Uma Santa Missa celebrada com a juventude, todo segundo sábado do mês.",
    descricao:
`A Missa Jovem é a Santa Missa celebrada com a juventude do Shalom Taguatinga.

Quando: todo segundo sábado do mês, às 17h.
Onde: Shalom Taguatinga — QNA 26, Setor A Norte, Taguatinga/DF.

Todos são bem-vindos.`,
    link: null,
    acao: "Ver programação",
    featuredLocal: true
  }
];
