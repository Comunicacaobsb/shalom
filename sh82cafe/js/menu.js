/* =====================================================================
   SH-82 Café — CARDÁPIO (camada de dados + render + carrinho)
   ---------------------------------------------------------------------
   Vanilla JS, sem jQuery/Bootstrap JS. Comentários em PT-BR.

   Fluxo:
     1. loadMenu() tenta o Supabase (menu_categories + menu_products +
        settings/cafe_info do site 'sh82cafe'). Sem Supabase configurado
        (anon key ainda "COLE_AQUI") ou em qualquer erro/timeout → cai
        silenciosamente para window.SH82_MOCK (js/data.js).
     2. Calcula a disponibilidade de HOJE no CLIENTE, com data no fuso
        America/Sao_Paulo (não usamos getDay()/getDate() puros, que seguem
        o fuso do aparelho — um celular configurado noutro fuso mostraria
        o dia errado).
     3. Renderiza só o que está disponível hoje; itens ativos indisponíveis
        hoje vão para a seção colapsada "Em outros dias".
     4. Carrinho em memória + localStorage ('sh82cafe_cart'), revalidado
        contra o cardápio carregado (item removido/indisponível sai).

   Regra de disponibilidade (fonte de verdade = migração / view
   menu_available_today), replicada em estaDisponivelHoje():
     active
     AND (weekdays IS NULL OR dow_hoje ∈ weekdays)
     AND (start_date IS NULL OR hoje >= start_date)
     AND (end_date   IS NULL OR hoje <= end_date)
   ===================================================================== */
(function () {
  "use strict";

  var SITE = window.SHALOM_SITE || "sh82cafe";
  var CHAVE_CARRINHO = "sh82cafe_cart";
  var TIMEOUT_SUPABASE = 6000; // ms — passou disso, usa o mock

  // Formatador de preço pt-BR / BRL.
  var moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  // Estado da aplicação.
  var estado = {
    categorias: [],   // [{ id, slug, name, position, active }]
    produtos: [],     // [{ ...colunas de menu_products }]
    cafeInfo: {},     // { nome, subtitulo, endereco, instagram, whatsapp, aviso }
    carrinho: {},     // { slug: quantidade }
    hoje: null,       // 'YYYY-MM-DD' em São Paulo
    dow: 0            // 0=domingo … 6=sábado em São Paulo
  };

  // ===================================================================
  //  DATA / FUSO — America/Sao_Paulo (independente do fuso do aparelho)
  // ===================================================================

  // Dia da semana (0=dom … 6=sáb) da data atual em São Paulo.
  // Usamos Intl com timeZone fixo em vez de Date#getDay(), que devolveria
  // o dia segundo o fuso configurado no celular do usuário.
  function diaSemanaSP(base) {
    var nome = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      weekday: "short"
    }).format(base || new Date());
    var mapa = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return mapa[nome];
  }

  // Data local de São Paulo no formato ISO 'YYYY-MM-DD' (en-CA já entrega
  // nesse formato). Comparar essas strings entre si equivale a comparar
  // datas cronologicamente.
  function hojeSP(base) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(base || new Date());
  }

  // ===================================================================
  //  DISPONIBILIDADE — regra única replicada da migração
  // ===================================================================
  function estaDisponivelHoje(p, hoje, dow) {
    if (!p.active) return false;
    // weekdays null → todos os dias. Se houver lista, o dia precisa estar
    // nela (lista vazia = nunca, igual ao "= any(array vazio)" do Postgres).
    if (p.weekdays != null && p.weekdays.indexOf(dow) === -1) return false;
    if (p.start_date && hoje < p.start_date) return false;
    if (p.end_date && hoje > p.end_date) return false;
    return true;
  }

  // ===================================================================
  //  RÓTULOS DE DISPONIBILIDADE (badges e texto de "quando volta")
  // ===================================================================
  var ABREV = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  var UM_DIA = [
    "Todo domingo", "Toda segunda", "Toda terça", "Toda quarta",
    "Toda quinta", "Toda sexta", "Todo sábado"
  ];

  function maiuscInicial(t) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  // 'YYYY-MM-DD' → 'dd/mm' (só string, sem Date, para não reintroduzir fuso).
  function ddmm(iso) {
    var partes = String(iso).split("-");
    return partes[2] + "/" + partes[1];
  }

  // Rótulo a partir do array weekdays.
  //   {1}        → "Toda segunda"
  //   {2,3,4}    → "Ter a qui"        (conjunto contíguo)
  //   {1,3,5}    → "Seg, qua e sex"   (não contíguo)
  function rotuloDias(dias) {
    var arr = dias.slice().sort(function (a, b) { return a - b; });
    arr = arr.filter(function (v, i) { return arr.indexOf(v) === i; }); // únicos

    if (arr.length === 0) return "";
    if (arr.length === 1) return UM_DIA[arr[0]];

    var contiguo = true;
    for (var i = 1; i < arr.length; i++) {
      if (arr[i] !== arr[i - 1] + 1) { contiguo = false; break; }
    }
    if (contiguo) {
      return maiuscInicial(ABREV[arr[0]] + " a " + ABREV[arr[arr.length - 1]]);
    }
    var partes = arr.map(function (d) { return ABREV[d]; });
    var ultimo = partes.pop();
    return maiuscInicial(partes.join(", ") + " e " + ultimo);
  }

  // Descreve QUANDO um produto está disponível — usado tanto como badge nos
  // cards disponíveis quanto como "quando volta" na seção "Em outros dias".
  // Retorna "" para itens perenes (sem restrição alguma).
  function descreverDisponibilidade(p, hoje) {
    // Caso especial "Só hoje": start=end=hoje.
    if (p.start_date && p.end_date && p.start_date === p.end_date) {
      if (p.start_date === hoje) return "Só hoje";
      return "Só dia " + ddmm(p.start_date);
    }

    var partes = [];
    if (p.weekdays != null && p.weekdays.length) {
      partes.push(rotuloDias(p.weekdays));
    }
    if (p.start_date && hoje < p.start_date) {
      partes.push("A partir de " + ddmm(p.start_date));
    }
    if (p.end_date && hoje <= p.end_date) {
      partes.push("Até " + ddmm(p.end_date));
    }
    return partes.join(" · ");
  }

  // ===================================================================
  //  CARREGAMENTO DE DADOS (Supabase → mock)
  // ===================================================================

  // O Supabase está utilizável? Mesma checagem de "COLE_AQUI" que js/store.js
  // faz, mais a presença do SDK (@supabase/supabase-js via CDN).
  function supabaseConfigurado() {
    var cfg = window.SHALOM_SUPABASE || {};
    return !!(
      cfg.url && cfg.anonKey &&
      cfg.url.indexOf("http") === 0 &&
      cfg.url.indexOf("COLE_AQUI") === -1 &&
      cfg.anonKey.indexOf("COLE_AQUI") === -1 &&
      window.supabase && window.supabase.createClient
    );
  }

  // Devolve uma cópia do mock (data.js) no shape normalizado.
  function dadosDoMock() {
    var m = window.SH82_MOCK || { categorias: [], produtos: [], cafe_info: {} };
    return {
      origem: "mock",
      categorias: (m.categorias || []).slice(),
      produtos: (m.produtos || []).slice(),
      cafeInfo: m.cafe_info || {}
    };
  }

  // Promise que rejeita depois de "ms" — usada para não travar em rede lenta.
  function comTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error("timeout")); }, ms);
      promise.then(
        function (v) { clearTimeout(t); resolve(v); },
        function (e) { clearTimeout(t); reject(e); }
      );
    });
  }

  // Busca do Supabase. anon lê só ativos (RLS), o que já serve para o front.
  function dadosDoSupabase() {
    var cfg = window.SHALOM_SUPABASE;
    var cli = window.supabase.createClient(cfg.url, cfg.anonKey);

    var pCat = cli.from("menu_categories").select("*")
      .eq("site", SITE).eq("active", true).order("position", { ascending: true });
    var pProd = cli.from("menu_products").select("*")
      .eq("site", SITE).order("position", { ascending: true });
    var pInfo = cli.from("settings").select("value")
      .eq("site", SITE).eq("key", "cafe_info").limit(1);

    return Promise.all([pCat, pProd, pInfo]).then(function (res) {
      var rc = res[0], rp = res[1], ri = res[2];
      if (rc.error || rp.error) throw (rc.error || rp.error);
      if (!rc.data || !rc.data.length || !rp.data) throw new Error("vazio");
      var info = (!ri.error && ri.data && ri.data[0] && ri.data[0].value) || {};
      return {
        origem: "supabase",
        categorias: rc.data,
        produtos: rp.data,
        cafeInfo: info
      };
    });
  }

  // Ponto único de entrada da camada de dados.
  function loadMenu() {
    if (!supabaseConfigurado()) return Promise.resolve(dadosDoMock());
    return comTimeout(dadosDoSupabase(), TIMEOUT_SUPABASE)
      .catch(function () { return dadosDoMock(); });
  }

  // ===================================================================
  //  HELPERS DE DOM
  // ===================================================================
  function el(id) { return document.getElementById(id); }

  // Escapa texto para uso seguro dentro de innerHTML.
  function esc(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Placeholder elegante quando image_url é null: cápsula com a inicial do
  // produto (ecoando a cápsula do logo). SVG inline, sem requisição externa.
  function molduraProduto(p) {
    if (p.image_url) {
      return '<div class="prod-img" style="background-image:url(' +
        esc(p.image_url).replace(/'/g, "%27") + ')"></div>';
    }
    var inicial = (p.name || "?").trim().charAt(0).toUpperCase();
    return '' +
      '<div class="prod-img prod-img--vazia" aria-hidden="true">' +
        '<svg viewBox="0 0 64 64" role="presentation" focusable="false">' +
          '<circle cx="32" cy="32" r="30" class="ph-anel"/>' +
          '<text x="32" y="41" text-anchor="middle" class="ph-inicial">' + esc(inicial) + '</text>' +
        '</svg>' +
      '</div>';
  }

  // Ícone de xícara (SVG inline) — usado como marca d'água no cabeçalho.
  function iconeXicara() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8z"/>' +
      '<path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/>' +
      '<path d="M7 3c-.5.7-.5 1.3 0 2M11 3c-.5.7-.5 1.3 0 2"/></svg>';
  }

  // ===================================================================
  //  RENDER
  // ===================================================================

  // Cabeçalho: marca (cápsula "SH 82 café") + subtítulo/aviso de cafe_info.
  function renderCabecalho() {
    var info = estado.cafeInfo || {};
    var sub = el("marcaSub");
    var linhas = [];
    if (info.subtitulo) linhas.push(esc(info.subtitulo));
    if (info.aviso) linhas.push('<span class="marca-aviso">' + esc(info.aviso) + "</span>");
    if (linhas.length) {
      sub.innerHTML = linhas.join("<br>");
      sub.hidden = false;
    } else {
      sub.hidden = true;
    }
  }

  // Chips de categoria (só categorias com item disponível hoje).
  function renderChips(categoriasVisiveis) {
    var nav = el("chips");
    if (!categoriasVisiveis.length) { nav.hidden = true; return; }
    nav.hidden = false;
    nav.innerHTML = categoriasVisiveis.map(function (c, i) {
      return '<button type="button" class="chip' + (i === 0 ? " chip--ativo" : "") +
        '" data-alvo="cat-' + esc(c.slug) + '">' + esc(c.name) + "</button>";
    }).join("");

    // Clique no chip → rola até a seção correspondente.
    nav.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var alvo = document.getElementById(chip.getAttribute("data-alvo"));
        if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  // Stepper de um card (modo "Adicionar" quando qtd 0, senão − qtd +).
  function htmlStepper(p) {
    var qtd = estado.carrinho[p.slug] || 0;
    if (qtd === 0) {
      return '<div class="stepper" data-slug="' + esc(p.slug) + '" data-qtd="0">' +
        '<button type="button" class="btn-add" data-acao="mais" ' +
        'aria-label="Adicionar ' + esc(p.name) + ' ao pedido">Adicionar</button></div>';
    }
    return htmlStepperAtivo(p.slug, p.name, qtd);
  }

  function htmlStepperAtivo(slug, nome, qtd) {
    return '<div class="stepper stepper--ativo" data-slug="' + esc(slug) + '" data-qtd="' + qtd + '">' +
      '<button type="button" class="passo" data-acao="menos" aria-label="Diminuir ' + esc(nome) + '">' +
        '<span aria-hidden="true">−</span></button>' +
      '<span class="qtd" aria-live="polite" aria-label="' + qtd + ' no pedido">' + qtd + '</span>' +
      '<button type="button" class="passo" data-acao="mais" aria-label="Aumentar ' + esc(nome) + '">' +
        '<span aria-hidden="true">+</span></button>' +
      '</div>';
  }

  // Card de produto disponível.
  function htmlCard(p) {
    var badge = descreverDisponibilidade(p, estado.hoje);
    var selo = p.badge || badge; // badge manual do produto tem prioridade visual
    return '' +
      '<article class="card" data-slug="' + esc(p.slug) + '">' +
        molduraProduto(p) +
        '<div class="card-corpo">' +
          (selo ? '<span class="selo">' + esc(selo) + "</span>" : "") +
          '<h3 class="card-nome">' + esc(p.name) + "</h3>" +
          (p.description ? '<p class="card-desc">' + esc(p.description) + "</p>" : "") +
          '<div class="card-rodape">' +
            '<span class="card-preco">' + moeda.format(p.price) + "</span>" +
            htmlStepper(p) +
          "</div>" +
        "</div>" +
      "</article>";
  }

  // Item da seção "Em outros dias" (sem stepper, com "quando volta").
  function htmlItemOutrosDias(p) {
    var quando = descreverDisponibilidade(p, estado.hoje) || "Indisponível hoje";
    return '' +
      '<li class="outro-item">' +
        '<div class="outro-info">' +
          '<span class="outro-nome">' + esc(p.name) + "</span>" +
          '<span class="outro-quando">' + esc(quando) + "</span>" +
        "</div>" +
        '<span class="outro-preco">' + moeda.format(p.price) + "</span>" +
      "</li>";
  }

  // Render principal do cardápio.
  function renderCardapio() {
    var main = el("conteudo");
    var categorias = estado.categorias
      .filter(function (c) { return c.active; })
      .sort(function (a, b) { return a.position - b.position; });

    var visiveis = [];    // categorias com ≥1 disponível hoje
    var outrosDias = [];  // produtos ativos indisponíveis hoje
    var html = "";

    categorias.forEach(function (cat) {
      var produtos = estado.produtos
        .filter(function (p) { return p.category_id === cat.id; })
        .sort(function (a, b) { return a.position - b.position; });

      var disponiveis = [];
      produtos.forEach(function (p) {
        if (estaDisponivelHoje(p, estado.hoje, estado.dow)) {
          disponiveis.push(p);
        } else if (p.active) {
          // Ativo mas fora do dia → entra em "Em outros dias".
          outrosDias.push(p);
        }
        // active=false não aparece em lugar nenhum (ex.: empada de palmito).
      });

      if (!disponiveis.length) return; // categoria vazia hoje fica oculta
      visiveis.push(cat);
      html += '' +
        '<section class="secao" id="cat-' + esc(cat.slug) + '" data-cat="' + esc(cat.slug) + '">' +
          '<h2 class="secao-titulo">' + esc(cat.name) + "</h2>" +
          '<div class="grade">' + disponiveis.map(htmlCard).join("") + "</div>" +
        "</section>";
    });

    // Seção colapsada "Em outros dias".
    if (outrosDias.length) {
      html += '' +
        '<details class="outros-dias">' +
          '<summary class="outros-cab">' +
            '<span>Em outros dias</span>' +
            '<span class="outros-cont">' + outrosDias.length + "</span>" +
          "</summary>" +
          '<ul class="outros-lista">' + outrosDias.map(htmlItemOutrosDias).join("") + "</ul>" +
        "</details>";
    }

    if (!visiveis.length && !outrosDias.length) {
      html = '<p class="vazio">Nenhum item disponível no momento.</p>';
    }

    main.innerHTML = html;
    renderChips(visiveis);
    observarSecoes(visiveis);
  }

  // Destaca o chip da categoria visível conforme o scroll.
  function observarSecoes(categoriasVisiveis) {
    if (!("IntersectionObserver" in window) || !categoriasVisiveis.length) return;
    var chipsPorSlug = {};
    el("chips").querySelectorAll(".chip").forEach(function (chip) {
      chipsPorSlug[chip.getAttribute("data-alvo")] = chip;
    });

    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        var chip = chipsPorSlug["cat-" + e.target.getAttribute("data-cat")];
        if (!chip) return;
        el("chips").querySelectorAll(".chip--ativo").forEach(function (c) {
          c.classList.remove("chip--ativo");
        });
        chip.classList.add("chip--ativo");
        chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });

    document.querySelectorAll(".secao").forEach(function (s) { obs.observe(s); });
  }

  // ===================================================================
  //  CARRINHO
  // ===================================================================

  // Carrega o carrinho do localStorage e REVALIDA contra o cardápio:
  // só permanece o que existe, está ativo e disponível hoje.
  function carregarCarrinho() {
    var salvo = {};
    try {
      salvo = JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || "{}") || {};
    } catch (e) { salvo = {}; }

    var limpo = {};
    Object.keys(salvo).forEach(function (slug) {
      var qtd = parseInt(salvo[slug], 10);
      if (!qtd || qtd < 1) return;
      var p = produtoPorSlug(slug);
      if (p && estaDisponivelHoje(p, estado.hoje, estado.dow)) {
        limpo[slug] = qtd;
      }
    });
    estado.carrinho = limpo;
    persistirCarrinho();
  }

  function persistirCarrinho() {
    try {
      localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(estado.carrinho));
    } catch (e) { /* modo privado / cota — ignora, segue em memória */ }
  }

  function produtoPorSlug(slug) {
    for (var i = 0; i < estado.produtos.length; i++) {
      if (estado.produtos[i].slug === slug) return estado.produtos[i];
    }
    return null;
  }

  function alterarQtd(slug, delta) {
    var atual = estado.carrinho[slug] || 0;
    var nova = atual + delta;
    if (nova <= 0) delete estado.carrinho[slug];
    else estado.carrinho[slug] = nova;
    persistirCarrinho();
    sincronizarUI();
  }

  function removerItem(slug) {
    delete estado.carrinho[slug];
    persistirCarrinho();
    sincronizarUI();
  }

  function limparCarrinho() {
    estado.carrinho = {};
    persistirCarrinho();
    sincronizarUI();
  }

  function totaisCarrinho() {
    var itens = 0, total = 0;
    Object.keys(estado.carrinho).forEach(function (slug) {
      var qtd = estado.carrinho[slug];
      var p = produtoPorSlug(slug);
      if (!p) return;
      itens += qtd;
      total += qtd * Number(p.price);
    });
    return { itens: itens, total: total };
  }

  // Reflete o estado do carrinho em toda a UI (steppers dos cards, barra
  // inferior e — se aberto — o bottom-sheet).
  function sincronizarUI() {
    // Steppers dos cards.
    document.querySelectorAll(".stepper[data-slug]").forEach(function (st) {
      var slug = st.getAttribute("data-slug");
      var qtd = estado.carrinho[slug] || 0;
      var atualQtd = parseInt(st.getAttribute("data-qtd"), 10) || 0;
      if (qtd === atualQtd) return; // nada mudou para este card
      var p = produtoPorSlug(slug);
      if (qtd === 0) {
        st.outerHTML = '<div class="stepper" data-slug="' + esc(slug) + '" data-qtd="0">' +
          '<button type="button" class="btn-add" data-acao="mais" ' +
          'aria-label="Adicionar ' + esc(p ? p.name : "") + ' ao pedido">Adicionar</button></div>';
      } else {
        st.outerHTML = htmlStepperAtivo(slug, p ? p.name : "", qtd);
      }
    });

    atualizarBarra();
    if (el("folha").classList.contains("aberta")) renderFolha();
  }

  // Barra inferior fixa: "N itens · R$ X · Ver pedido". Some com 0 itens.
  function atualizarBarra() {
    var barra = el("barraCarrinho");
    var t = totaisCarrinho();
    if (t.itens === 0) {
      barra.classList.remove("visivel");
      document.body.classList.remove("com-barra");
      return;
    }
    barra.classList.add("visivel");
    document.body.classList.add("com-barra");
    el("barraItens").textContent = t.itens + (t.itens === 1 ? " item" : " itens");
    el("barraTotal").textContent = moeda.format(t.total);
  }

  // Conteúdo do bottom-sheet (lista editável + total + avisos).
  function renderFolha() {
    var corpo = el("folhaCorpo");
    var slugs = Object.keys(estado.carrinho);
    if (!slugs.length) { fecharFolha(); return; }

    var linhas = slugs.map(function (slug) {
      var p = produtoPorSlug(slug);
      if (!p) return "";
      var qtd = estado.carrinho[slug];
      return '' +
        '<li class="folha-item" data-slug="' + esc(slug) + '">' +
          '<div class="folha-item-info">' +
            '<span class="folha-item-nome">' + esc(p.name) + "</span>" +
            '<span class="folha-item-preco">' + moeda.format(p.price) + "</span>" +
          "</div>" +
          htmlStepperAtivo(slug, p.name, qtd) +
          '<button type="button" class="folha-remover" data-acao="remover" ' +
            'aria-label="Remover ' + esc(p.name) + ' do pedido">' +
            '<span aria-hidden="true">Remover</span></button>' +
        "</li>";
    }).join("");

    var t = totaisCarrinho();
    corpo.innerHTML = '<ul class="folha-lista">' + linhas + "</ul>";
    el("folhaTotal").textContent = moeda.format(t.total);
  }

  function abrirFolha() {
    if (!Object.keys(estado.carrinho).length) return;
    renderFolha();
    el("folha").classList.add("aberta");
    el("folhaOverlay").classList.add("visivel");
    el("folha").setAttribute("aria-hidden", "false");
    document.body.classList.add("sem-scroll");
  }

  function fecharFolha() {
    el("folha").classList.remove("aberta");
    el("folhaOverlay").classList.remove("visivel");
    el("folha").setAttribute("aria-hidden", "true");
    document.body.classList.remove("sem-scroll");
  }

  // ===================================================================
  //  EVENTOS (delegação)
  // ===================================================================
  function ligarEventos() {
    // Steppers dentro do #conteudo (cards) e da folha.
    document.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-acao]");
      if (!btn) return;
      var acao = btn.getAttribute("data-acao");
      var wrap = btn.closest("[data-slug]");
      var slug = wrap ? wrap.getAttribute("data-slug") : null;

      if (acao === "mais" && slug) alterarQtd(slug, +1);
      else if (acao === "menos" && slug) alterarQtd(slug, -1);
      else if (acao === "remover" && slug) removerItem(slug);
    });

    // Abrir/fechar bottom-sheet.
    el("barraVerPedido").addEventListener("click", abrirFolha);
    el("folhaOverlay").addEventListener("click", fecharFolha);
    el("folhaFechar").addEventListener("click", fecharFolha);
    el("folhaLimpar").addEventListener("click", limparCarrinho);

    // Esc fecha a folha.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && el("folha").classList.contains("aberta")) fecharFolha();
    });
  }

  // ===================================================================
  //  BOOT
  // ===================================================================
  function iniciar() {
    estado.hoje = hojeSP();
    estado.dow = diaSemanaSP();
    ligarEventos();

    loadMenu().then(function (dados) {
      estado.categorias = dados.categorias || [];
      estado.produtos = dados.produtos || [];
      estado.cafeInfo = dados.cafeInfo || {};

      renderCabecalho();
      renderCardapio();
      carregarCarrinho();  // revalida contra o cardápio já carregado
      sincronizarUI();     // aplica quantidades nos steppers + barra
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  // Exposto para depuração/uso externo eventual.
  window.SH82_MENU = {
    loadMenu: loadMenu,
    estaDisponivelHoje: estaDisponivelHoje,
    descreverDisponibilidade: descreverDisponibilidade
  };
})();
