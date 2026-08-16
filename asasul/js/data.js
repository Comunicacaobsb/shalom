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
  },
  {
    id: "beraka-casais",
    titulo: "Beraká — Retiro para casais",
    badge: "Retiro para casais",
    data: "26 e 27 de setembro de 2026",
    local: "SGAS 606, Bloco D, Lote 42 — Brasília/DF",
    imagem: "images/eventos/beraka-casais.webp",
    resumo: "Um retiro para casais fortalecerem a vida a dois sobre a rocha que é Jesus.",
    descricao:
`BERAKÁ — Retiro para casais

Jesus é a rocha onde edifico a minha casa. (Mateus 7,24)

Quando: 26 e 27 de setembro de 2026.
Onde: SGAS 606, Bloco D, Lote 42 — Brasília/DF.
Público: casais.

Enquanto os casais vivem o retiro, o Beraká Kids oferece uma programação própria e simultânea para crianças de 5 a 10 anos.

Informações:
William: (21) 98875-0530
Viviane: (61) 99399-0480
Instagram: @shalombrasilia
Instagram: https://www.instagram.com/shalombrasilia/

Realização: Projeto Família Shalom, Comunidade Católica Shalom e Shalom Brasília — 25 anos.

Inscrições e informações: https://comshalom.org/beraka/`,
    link: { texto: "Saiba mais e inscreva-se", url: "https://comshalom.org/beraka/" },
    acao: "Ver detalhes",
    featuredLocal: true
  },
  {
    id: "beraka-kids",
    titulo: "Beraká Kids",
    badge: "Crianças de 5 a 10 anos",
    data: "26 e 27 de setembro de 2026",
    local: "SGAS 606, Bloco D, Lote 42 — Brasília/DF",
    imagem: "images/eventos/beraka-kids.webp",
    resumo: "Uma programação própria para crianças de 5 a 10 anos durante o retiro Beraká.",
    descricao:
`BERAKÁ KIDS — para crianças de 5 a 10 anos

Jesus é a rocha onde edifico a minha casa. (Mateus 7,24)

Quando: 26 e 27 de setembro de 2026.
Onde: SGAS 606, Bloco D, Lote 42 — Brasília/DF.
Público: crianças de 5 a 10 anos.

O Beraká Kids acontece simultaneamente ao Beraká para casais, com programação própria, preparada para as crianças enquanto seus pais vivem o retiro.

Informações:
William: (21) 98875-0530
Viviane: (61) 99399-0480
Instagram: @shalombrasilia
Instagram: https://www.instagram.com/shalombrasilia/

Realização: Projeto Família Shalom, Comunidade Católica Shalom e Shalom Brasília — 25 anos.

Inscrições e informações: https://comshalom.org/beraka/`,
    link: { texto: "Saiba mais e inscreva-se", url: "https://comshalom.org/beraka/" },
    acao: "Ver detalhes",
    featuredLocal: true
  },
  {
    id: "curada-historia-de-vida",
    titulo: "Retiro Curada — História de Vida",
    badge: "Retiro",
    data: "04 a 07 de setembro",
    local: "Retiro Santo Antônio",
    imagem: "images/eventos/curada-historia-de-vida.webp",
    resumo: "Um retiro para encontrar cura e um novo olhar para a própria história de vida.",
    descricao:
`RETIRO CURADA — história de vida

Quando: 04 a 07 de setembro.
Onde: Retiro Santo Antônio.
Valor: R$ 550,00.

Mais informações:
Islane: (61) 98274-8634

Realização: Shalom Brasília — 25 anos e Comunidade Católica Shalom.

WhatsApp: https://wa.me/556182748634`,
    link: { texto: "Mais informações", url: "https://wa.me/556182748634" },
    acao: "Ver detalhes",
    featuredLocal: true
  },
  {
    id: "es-precioso",
    titulo: "Curso És Precioso",
    badge: "Curso",
    data: "15 a 17 de setembro, às 19h30",
    local: "Shalom Asa Sul — Auditório Kyrios",
    imagem: "images/eventos/es-precioso.webp",
    resumo: "Curso És Precioso no Shalom Asa Sul, com opção de inscrição com livro.",
    descricao:
`CURSO ÉS PRECIOSO

Data: 15 a 17 de setembro.
Horário: às 19h30.
Local: Shalom Asa Sul — Auditório Kyrios.

Inscrição: R$ 30,00.
Inscrição + livro: R$ 65,00.

Mais informações: (61) 98274-8634
Realização: Shalom Asa Sul e Comunidade Católica Shalom.
WhatsApp: https://wa.me/556182748634`,
    link: { texto: "Mais informações", url: "https://wa.me/556182748634" },
    acao: "Ver detalhes",
    featuredLocal: true
  }
];
