/* =====================================================================
   DADOS DOS EVENTOS  —  edite este arquivo para atualizar o carrossel.
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
   featuredLocal -> eventos marcados com featuredLocal aparecem mesmo com o
                Supabase ativo, até existir um evento remoto com o mesmo slug
   A ordem aqui é a ordem no carrossel.
   ===================================================================== */

/* Capa (padrão local; usado quando não há settings.home no painel) */
window.SHALOM_HOME = {
  titulo:     "Um lugar para\nencontrar Deus\nem Santa Maria",
  subtitulo:  "Missas, adoração, grupos de oração e formação. Toda a vida do Centro de Evangelização, num só lugar.",
  imagem:     "",
  imagem_alt: "Centro de Evangelização Shalom Santa Maria"
};

/* Horários/serviços de reserva — usados enquanto o Supabase não estiver
   configurado. Depois de configurado, o painel /admin é a fonte oficial. */
window.SHALOM_SCHEDULES = {
  funcionamento: ["Segunda a sábado: 14h às 22h"],
  missa:         [],
  grupos:        ["Grupo de adultos: terça às 19h30", "Grupo de adultos: quinta às 19h30", "Grupo de jovens: sábado às 17h"],
  adoracao:      ["Quinta: 14h às 18h"],
  servicos:      ["Livraria: segunda a sábado, 14h às 21h"],
  aconselhamento:["Segunda a sexta: 14h às 18h"]
};

window.SHALOM_EVENTOS = [
  {
    id: "grupo-de-adultos",
    titulo: "Grupo de Oração de Adultos",
    badge: "Grupo de oração",
    data: "Terças e quintas às 19h30",
    local: "Shalom Santa Maria — QC 1, Santa Maria",
    imagem: "",
    resumo: "Um grupo de oração para adultos rezarem, louvarem e caminharem juntos em comunidade.",
    descricao:
`O Grupo de Oração de Adultos do Shalom Santa Maria reúne a comunidade para rezar, louvar e partilhar a fé.

Quando: terças e quintas-feiras, às 19h30.
Onde: Shalom Santa Maria — QC 1, Casa 7, Santa Maria/DF.

Venha e traga um amigo.`,
    link: null,
    acao: "Saiba mais",
    featuredLocal: true
  },
  {
    id: "grupo-de-jovens",
    titulo: "Grupo de Oração de Jovens",
    badge: "Grupo de oração",
    data: "Todo sábado às 17h",
    local: "Shalom Santa Maria — QC 1, Santa Maria",
    imagem: "",
    resumo: "Um grupo de oração para jovens que querem viver a fé com alegria e intensidade.",
    descricao:
`O Grupo de Oração de Jovens do Shalom Santa Maria é um espaço para a juventude louvar, rezar e caminhar em comunidade.

Quando: todo sábado, às 17h.
Onde: Shalom Santa Maria — QC 1, Casa 7, Santa Maria/DF.

Venha e traga um amigo.`,
    link: null,
    acao: "Saiba mais",
    featuredLocal: true
  }
];
