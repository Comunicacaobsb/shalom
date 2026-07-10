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
   A ordem aqui é a ordem no carrossel.
   ===================================================================== */

/* Horários/serviços de reserva — usados enquanto o Supabase não estiver
   configurado. Depois de configurado, o painel /admin é a fonte oficial. */
window.SHALOM_SCHEDULES = {
  funcionamento: ["Segunda a sábado: 14h às 22h"],
  missa:         ["Segunda e sexta: 18h", "Sábado e domingo: 17h", "2ª terça: Missa pelas Famílias", "4ª quinta: Missa da Misericórdia"],
  grupos:        ["Casais: terça às 20h", "Amare (aberto): quinta às 19h30", "Kyrios (16 a 23 anos): sábado às 15h"],
  adoracao:      ["Capela Kyrios — Santíssimo exposto 24 horas"],
  servicos:      ["Quarta: 19h30 às 21h", "Sexta: 17h", "Sábado: 16h", "Domingo: após a missa das 17h"],
  aconselhamento:["Quinta: 14h30 às 21h", "Ou agende pelo link: https://forms.gle/fnbLoKrEtNMw5D5y8"]
};

window.SHALOM_EVENTOS = [
  {
    id: "vida-plena",
    titulo: "Encontro Vida Plena",
    badge: "Seminário",
    data: "29 e 30 de agosto",
    local: "San Marco Brasília Hotel",
    imagem: "images/eventos/vida-plena.jpeg",
    resumo: "Liderança, crescimento, resultados… Onde encontrar propósito e plenitude em meio a tantos desafios?",
    descricao:
`💼✨ Liderança, crescimento, resultados… Onde encontrar propósito e plenitude em meio a tantos desafios?

🌿 O Encontro Vida Plena é uma experiência com o Amor de Deus, promovido pelo Projeto Mundo Novo da Comunidade Católica Shalom, para profissionais e líderes que desejam integrar fé, vida e missão.

💫 Dois dias para aprofundar a experiência com Deus, redescobrir a vocação e encontrar um sentido mais profundo para a vida, a família e o trabalho.

🎤 Carmadélio Sousa (Fortaleza/CE) – Missionário e especialista em relações interpessoais.

🗓️ 29 e 30 de agosto
📍 San Marco Brasília Hotel
📲 Informações: (61) 99687-7406
👉 Inscrições: https://forms.gle/y8RxBSaj2KEAuqFNA

📖 "Conhecereis também o amor de Cristo, que ultrapassa todo conhecimento, para que sejais repletos de toda a plenitude de Deus." (Ef 3,19)`,
    link: { texto: "Inscrições", url: "https://forms.gle/y8RxBSaj2KEAuqFNA" },
    acao: "Saiba mais"
  },
  {
    id: "kyrios",
    titulo: "Grupo de Oração Kyrios",
    badge: "Grupo de oração",
    data: "Todo sábado às 15h",
    local: "Shalom Asa Sul (507 Sul)",
    imagem: "images/eventos/kyrios.jpeg",
    resumo: "Um grupo de oração para jovens de 16 a 23 anos que querem viver a fé com intensidade.",
    descricao:
`Kyrios é o grupo de oração da juventude no Shalom Asa Sul. Um espaço para louvar, rezar e caminhar em comunidade.

Para quem é: jovens de 16 a 23 anos.
Quando: todo sábado, às 15h.
Onde: Shalom Asa Sul — 507 Sul.

Uma iniciativa do Projeto Juventude para Jesus • Comunidade Católica Shalom. Venha e traga um amigo.`,
    link: null,
    acao: "Saiba mais"
  },
  {
    id: "amare",
    titulo: "Grupo de Oração Aberto — Amare",
    badge: "Grupo de oração",
    data: "Toda quinta-feira às 19h30",
    local: "Shalom Asa Sul, 507 Sul",
    imagem: "images/eventos/amare.jpeg",
    resumo: "Um grupo de oração aberto a todos. Venha amar e ser amado na presença de Deus.",
    descricao:
`Amare é o grupo de oração aberto do Shalom Asa Sul — todos são bem-vindos, sem exceção.

Quando: toda quinta-feira, às 19h30.
Onde: Shalom Asa Sul, 507 Sul.
Contato: (61) 98210-8676.

Entre no grupo do WhatsApp para receber os avisos e caminhar conosco.`,
    link: { texto: "Entrar no grupo do WhatsApp", url: "https://wa.me/5561982108676" },
    acao: "Saiba mais"
  },
  {
    id: "missa-misericordia",
    titulo: "Missa da Misericórdia",
    badge: "Missa especial",
    data: "Quinta-feira, 30/07",
    local: "Shalom Asa Sul",
    imagem: "images/eventos/missa-misericordia.jpeg",
    resumo: "Uma tarde inteira de oração, aconselhamento, confissão e Santa Missa no Shalom Asa Sul.",
    descricao:
`A Missa da Misericórdia é um dia dedicado a reencontrar o amor misericordioso de Deus.

Programação — quinta-feira, 30/07:
• 14h30 — Oração e aconselhamento
• 18h00 — Confissão
• 19h30 — Santa Missa

Onde: Shalom Asa Sul. Traga suas intenções e viva esse encontro com a Misericórdia.`,
    link: null,
    acao: "Ver programação"
  }
];
