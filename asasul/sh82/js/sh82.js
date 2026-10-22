/* =====================================================================
   Lanchonete Shalom | SH82 · página pública (cardápio + pedido pelo celular)
   ---------------------------------------------------------------------
   Toda regra mora no servidor (Supabase, esquema "lanchonete"). Esta página
   só chama três funções públicas com a chave anon:
     lanchonete_cardapio(p_unidade)      -> cardápio, horários e situação
     lanchonete_criar_pedido(p)          -> cria ou junta um pedido
     lanchonete_meus_pedidos(p_tokens)   -> acompanha os pedidos do aparelho
   Contrato: shalom-brasilia-sistemas/docs/decisoes/2026-10-21-sh82-contrato-funcoes.md
   Valores em centavos. Todo texto vindo do banco passa por esc() antes de
   entrar no HTML.

   Desenvolvimento local: só quando a página roda em localhost/127.0.0.1,
   localStorage.sh82_supabase_dev = '{"url":"http://127.0.0.1:54321","anonKey":"..."}'
   aponta para o Supabase local sem mexer em js/config.js (que é de produção).
   ===================================================================== */
(function () {
  "use strict";

  var UNIDADE = document.body.getAttribute("data-unidade") || "asasul";
  var CHAVE = { carrinho: "sh82_carrinho", cliente: "sh82_cliente", pedidos: "sh82_pedidos" };
  var MAX_TOKENS = 10, MAX_LINHA = 20, MAX_TOTAL = 50;
  var ACOMPANHAR_MS = 8000, RECARREGAR_MS = 60000;

  var DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  var DIAS_C = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  var ESTADO_TXT = { recebido: "Recebido · confirme no balcão", confirmado: "Confirmado · já vai sair", entregue: "Entregue", cancelado: "Cancelado", juntado: "Juntado a outro pedido" };
  var FALHA_REDE = "Não conseguimos enviar agora. Seu pedido continua aqui; tente de novo.";

  /* ---------------- utilidades ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function BRL(c) { return fmtBRL.format((Number(c) || 0) / 100); }
  function dt(s) { return new Date(String(s).slice(0, 10) + "T12:00:00Z"); }
  function dow(s) { return dt(s).getUTCDay(); }
  function ddmm(s) { s = String(s); return s.slice(8, 10) + "/" + s.slice(5, 7); }
  function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : ""; }
  function hora(h) { if (!h) return ""; var p = String(h).split(":"); return Number(p[0]) + "h" + (p[1] && p[1] !== "00" ? p[1] : ""); }
  function hojeSP() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
  function horaSP(iso) { if (!iso) return ""; var d = new Date(iso); if (!isFinite(d.getTime())) return ""; return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(d).replace(":", "h"); }
  function ic(id, cls) { return '<svg class="' + (cls || "ic") + '" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>'; }
  function fmtTel(v) {
    var d = String(v || "").replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4);
  }
  function chaveAleatoria() {
    var a = new Uint8Array(18);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return "sh82-" + Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  function ler(k, padrao) { try { var v = localStorage.getItem(k); return v == null ? padrao : JSON.parse(v); } catch (e) { return padrao; } }
  function gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* aparelho sem armazenamento: segue sem lembrar */ } }
  function $(s, c) { return (c || document).querySelector(s); }

  /* ---------------- conexão ---------------- */
  function configuracao() {
    var cfg = window.SHALOM_SUPABASE || {};
    var local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (local) {
      var dev = ler("sh82_supabase_dev", null);
      if (dev && dev.url && dev.anonKey) cfg = dev;
    }
    return cfg;
  }
  var sb = null;
  function cliente() {
    if (sb) return sb;
    var cfg = configuracao();
    if (!cfg.url || !cfg.anonKey || !window.supabase || !window.supabase.createClient) return null;
    sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    return sb;
  }
  function rpc(nome, args) {
    var c = cliente();
    if (!c) return Promise.resolve({ data: null, error: { message: "SEM_CONEXAO" } });
    return c.rpc(nome, args).then(function (r) { return r; }, function (e) { return { data: null, error: { message: String(e && e.message || e) } }; });
  }
  // Erro de regra do servidor: P0001 com mensagem = código e hint = frase pronta.
  function erroDeRegra(err) { return !!(err && err.code === "P0001" && err.message); }

  /* ---------------- estado ---------------- */
  var S = {
    carga: "carregando",      // carregando | ok | erro
    C: null, json: "",        // cardápio do servidor
    desatualizado: false,
    carrinho: [],             // [{id, sabor, qtd}]
    form: ler(CHAVE.cliente, null) || { nome: "", tel: "" },
    lembrado: !!ler(CHAVE.cliente, null),
    tokens: (ler(CHAVE.pedidos, []) || []).filter(function (t) { return typeof t === "string" && t; }).slice(-MAX_TOKENS),
    pedidos: {},              // token -> PedidoPublico
    avisos: [],               // recados que a pessoa precisa ver (carrinho revalidado, pedido juntado)
    juntar: true,
    envio: { idem: null, enviando: false, erro: "", info: "", campos: {} },
    folha: null, abriu: null, diaSel: null
  };
  (function () {
    var c = ler(CHAVE.carrinho, null);
    if (c && Array.isArray(c.linhas)) { S.carrinho = c.linhas.filter(function (l) { return l && l.id && l.qtd > 0; }); S.carrinhoDia = c.dia || null; }
  })();
  function salvarCarrinho() { gravar(CHAVE.carrinho, S.carrinho.length ? { dia: S.C ? S.C.hoje : hojeSP(), linhas: S.carrinho } : null); }
  function salvarTokens() { gravar(CHAVE.pedidos, S.tokens.length ? S.tokens : null); }

  /* ---------------- cardápio ---------------- */
  var itensHoje = {};       // id -> item pedível hoje (padrão + especiais de hoje)
  function indexar() {
    itensHoje = {};
    if (!S.C) return;
    (S.C.padrao || []).forEach(function (i) { itensHoje[i.id] = i; });
    ((S.C.dias && S.C.dias[0] && S.C.dias[0].especiais) || []).forEach(function (i) { itensHoje[i.id] = i; });
  }
  function porId(id) { return itensHoje[id] || null; }
  function sit() { return (S.C && S.C.situacao) || {}; }
  function podePedir() { return !!sit().pode_pedir; }
  function precoLinha(l) {
    var it = porId(l.id); if (!it) return 0;
    if (l.sabor) { var s = (it.sabores || []).filter(function (x) { return x.nome === l.sabor; })[0]; return s ? s.preco_centavos : 0; }
    return it.preco_centavos;
  }
  function totalCarrinho() { return S.carrinho.reduce(function (t, l) { return t + precoLinha(l) * l.qtd; }, 0); }
  function qtdCarrinho() { return S.carrinho.reduce(function (t, l) { return t + l.qtd; }, 0); }
  function qtdDe(id) { return S.carrinho.filter(function (l) { return l.id === id; }).reduce(function (t, l) { return t + l.qtd; }, 0); }
  function temFaixa(it) { var p = {}; (it.sabores || []).forEach(function (s) { p[s.preco_centavos] = 1; }); return Object.keys(p).length > 1; }
  function precoTxt(it) { return (temFaixa(it) ? "<small>a partir de</small> " : "") + esc(BRL(it.sabores && it.sabores.length ? it.a_partir_de : it.preco_centavos)); }
  function notaDoDia(d) { var n = S.C && S.C.unidade && S.C.unidade.notas; return (n && n[d]) || ""; }

  // Tira do carrinho o que não está mais no cardápio de hoje (sumiu, acabou ou trocou de sabor).
  function revalidarCarrinho() {
    if (!S.C) return;
    if (S.carrinhoDia && S.carrinhoDia !== S.C.hoje) { S.carrinho = []; S.carrinhoDia = S.C.hoje; salvarCarrinho(); return; }
    S.carrinhoDia = S.C.hoje;
    var saiu = [];
    S.carrinho = S.carrinho.filter(function (l) {
      var it = porId(l.id);
      var ok = it && !it.esgotado && (it.sabores && it.sabores.length
        ? (l.sabor && it.sabores.some(function (s) { return s.nome === l.sabor; }))
        : !l.sabor);
      if (!ok) {
        var nome = l.nomeVisto || (it && it.nome) || "Um item";
        var motivo = it && it.esgotado ? "acabou hoje" : "não está mais no cardápio de hoje";
        var txt = "“" + nome + (l.sabor ? " · " + l.sabor : "") + "” " + motivo + " e saiu do seu pedido.";
        if (saiu.indexOf(txt) === -1) saiu.push(txt);
      }
      return ok;
    });
    S.carrinho.forEach(function (l) { var it = porId(l.id); if (it) l.nomeVisto = it.nome; });
    if (saiu.length) {
      if (S.folha && S.folha.tipo === "pedido") { S.envio.erro = ""; S.envio.info = saiu.join(" ") + " Confira e envie de novo."; }
      else saiu.forEach(function (t) { S.avisos.push(t); });
      anunciar(saiu.join(" "));
    }
    salvarCarrinho();
    return saiu;
  }

  function carregarCardapio(silencioso) {
    if (!silencioso) { S.carga = S.C ? S.carga : "carregando"; }
    return rpc("lanchonete_cardapio", { p_unidade: UNIDADE }).then(function (r) {
      if (r.error || !r.data) {
        if (S.C) { S.desatualizado = true; pintar(renderTudo); return; }
        S.carga = "erro"; S.erroCarga = erroDeRegra(r.error) && r.error.hint ? r.error.hint : "";
        pintar(renderTudo); return;
      }
      var j = JSON.stringify(r.data);
      var mudou = j !== S.json || S.desatualizado || S.carga !== "ok";
      var sitAntes = S.C ? textoSituacao() + "|" + podePedir() : null;
      S.json = j; S.C = r.data; S.carga = "ok"; S.desatualizado = false; S.ultimaCarga = Date.now();
      indexar(); revalidarCarrinho();
      if (sitAntes && sitAntes !== textoSituacao() + "|" + podePedir()) {
        anunciar(textoSituacao() + ". " + (podePedir() ? "Pedidos pelo celular abertos." : sit().aberto ? "Pedidos pelo celular pausados agora." : "Pedidos pelo celular abrem no horário."));
      }
      if (S.folha && S.folha.tipo === "pedido" && !S.carrinho.length) fecharFolha();
      if (mudou) pintar(function () { renderTopo(); renderPub(); renderRodape(); renderBarra(); if (!digitando()) renderCamada(); });
    });
  }

  /* ---------------- pedidos do aparelho ---------------- */
  function listaPedidos() { return S.tokens.map(function (t) { return S.pedidos[t]; }).filter(Boolean); }
  function hoje() { return (S.C && S.C.hoje) || hojeSP(); }
  function pedidosVisiveis() { return listaPedidos().filter(function (p) { return p.dia === hoje() && p.status !== "entregue" && p.status !== "juntado"; }); }
  function alvoJuntar() { return listaPedidos().filter(function (p) { return p.status === "recebido" && p.dia === hoje(); })[0] || null; }
  function acompanhando() { return listaPedidos().some(function (p) { return p.status === "recebido" || p.status === "confirmado"; }) || S.tokens.some(function (t) { return !S.pedidos[t]; }); }
  function guardarToken(t) {
    if (!t) return;
    if (S.tokens.indexOf(t) === -1) S.tokens.push(t);
    while (S.tokens.length > MAX_TOKENS) {
      var fim = S.tokens.filter(function (x) { var p = S.pedidos[x]; return p && (p.status === "entregue" || p.status === "cancelado" || p.status === "juntado"); })[0];
      S.tokens.splice(S.tokens.indexOf(fim || S.tokens[0]), 1);
    }
    salvarTokens();
  }
  function tirarToken(t) { S.tokens = S.tokens.filter(function (x) { return x !== t; }); delete S.pedidos[t]; salvarTokens(); }

  var buscandoPedidos = false;
  function atualizarPedidos() {
    if (buscandoPedidos || !S.tokens.length) return Promise.resolve();
    buscandoPedidos = true;
    var pedidos = S.tokens.slice(), alvoAntes = alvoJuntar(), alvoAntesT = alvoAntes && alvoAntes.token;
    return rpc("lanchonete_meus_pedidos", { p_tokens: pedidos }).then(function (r) {
      buscandoPedidos = false;
      if (r.error || !Array.isArray(r.data)) return;   // sem rede: tenta de novo no próximo ciclo
      var vistos = {}, trocou = false, d = hoje();
      r.data.forEach(function (p) {
        vistos[p.token] = true;
        var antes = S.pedidos[p.token];
        S.pedidos[p.token] = p;
        if (antes && antes.status !== p.status && p.status !== "juntado") anunciar("Pedido " + p.numero + ": " + ESTADO_TXT[p.status] + ".");
        if (p.status === "juntado" && p.juntado_ao && p.juntado_ao.token) {
          var novo = p.juntado_ao.token, i = S.tokens.indexOf(p.token);
          if (S.tokens.indexOf(novo) === -1) S.tokens.splice(i, 1, novo); else S.tokens.splice(i, 1);
          var msg = "O pedido " + p.numero + " foi juntado ao pedido " + p.juntado_ao.numero + " no balcão. Acompanhe pelo número " + p.juntado_ao.numero + ".";
          S.avisos.push(msg); anunciar(msg);
          if (S.folha && S.folha.tipo === "status" && S.folha.token === p.token) { S.folha.token = novo; S.folha.aviso = msg; }
          delete S.pedidos[p.token];
          trocou = true;
        }
      });
      // Tokens que o servidor não conhece mais e pedidos de outros dias saem da lista.
      S.tokens = S.tokens.filter(function (t) {
        if (pedidos.indexOf(t) === -1) return true;          // chegou agora (troca de juntado)
        if (!vistos[t]) { delete S.pedidos[t]; return false; }
        var p = S.pedidos[t];
        if (p && p.dia < d && p.status !== "recebido" && p.status !== "confirmado") { delete S.pedidos[t]; return false; }
        return true;
      });
      salvarTokens();
      if (S.folha && S.folha.tipo === "status" && !S.pedidos[S.folha.token] && !trocou) fecharFolha();
      var alvoDepois = alvoJuntar(), mudouAlvo = (alvoDepois && alvoDepois.token) !== alvoAntesT;
      pintar(function () {
        renderPub();
        if (S.folha && (S.folha.tipo === "status" || (S.folha.tipo === "pedido" && mudouAlvo && !digitando()))) renderCamada();
      });
      if (trocou) return atualizarPedidos();
    });
  }

  /* ---------------- texto da situação ---------------- */
  function textoSituacao() {
    var s = sit();
    if (s.aberto) return "Aberto agora" + (s.fecha_as ? " · até " + hora(s.fecha_as) : "");
    var p = s.proxima_abertura;
    if (!p) return "Fechado agora";
    var quando = p.em_dias === 0 ? "hoje" : p.em_dias === 1 ? "amanhã" : p.em_dias < 7 ? (p.dia === 0 || p.dia === 6 ? "no " : "na ") + DIAS[p.dia] : "em " + ddmm(p.data);
    return "Fechado agora · abre " + quando + " às " + hora(p.abre);
  }

  /* ---------------- render ---------------- */
  // Redesenha sem perder o foco (data-k identifica o controle) nem o cursor do campo.
  function pintar(fn) {
    var a = document.activeElement, k = a && a.getAttribute ? a.getAttribute("data-k") : null;
    var sel = a && a.tagName === "INPUT" ? [a.selectionStart, a.selectionEnd] : null;
    fn();
    if (k) {
      var el = document.querySelector('[data-k="' + (window.CSS && CSS.escape ? CSS.escape(k) : k) + '"]');
      if (el && el !== document.activeElement) {
        el.focus({ preventScroll: true });
        if (sel && el.setSelectionRange) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* tipo sem seleção */ } }
      }
    }
  }
  function digitando() { var a = document.activeElement; return !!(a && a.matches && a.matches("#camada .campo input")); }
  function renderTudo() { renderTopo(); renderPub(); renderRodape(); renderBarra(); renderCamada(); }

  function renderTopo() {
    if (!S.C) return;
    var u = S.C.unidade || {}, nome = String(u.nome || "Lanchonete Shalom").trim(), marca = u.marca || "SH82";
    var i = nome.indexOf(" ");
    var h1 = $("#heroNome");
    h1.innerHTML = (i > 0 ? "<span>" + esc(nome.slice(0, i)) + "</span> <span>" + esc(nome.slice(i + 1)) + "</span>" : "<span>" + esc(nome) + "</span>") + '<span class="sr"> | ' + esc(marca) + "</span>";
    $("#heroSub").textContent = (u.local ? u.local + " · " : "") + "Cardápio";
  }

  function botaoItem(it, grande) {
    if (it.esgotado) return '<span class="tag">Acabou hoje</span>';
    var pode = podePedir(), q = qtdDe(it.id), nome = esc(it.nome);
    if (it.sabores && it.sabores.length) {
      return '<button class="' + (grande ? "btn-y" : "mais") + '" type="button" data-act="sabor" data-id="' + esc(it.id) + '" data-k="sab-' + esc(it.id) + '"' + (pode ? "" : " disabled") +
        ' aria-label="' + (q ? q + " " + nome + " no pedido. Mudar sabores" : "Escolher sabores de " + nome) + '">' +
        (grande ? (q ? q + " no pedido · mudar" : "Escolher sabores") : ic("i-plus")) + "</button>";
    }
    if (q && pode) {
      return '<div class="passos" role="group" aria-label="' + nome + ' no pedido">' +
        '<button type="button" data-act="menos" data-id="' + esc(it.id) + '" data-k="m-' + esc(it.id) + '" aria-label="Tirar um ' + nome + '">' + ic(q === 1 ? "i-trash" : "i-minus") + "</button>" +
        "<output>" + q + "</output>" +
        '<button type="button" data-act="mais" data-id="' + esc(it.id) + '" data-k="a-' + esc(it.id) + '" aria-label="Mais um ' + nome + '"' + (q >= MAX_LINHA || qtdCarrinho() >= MAX_TOTAL ? " disabled" : "") + ">" + ic("i-plus") + "</button></div>";
    }
    return '<button class="mais" type="button" data-act="mais" data-id="' + esc(it.id) + '" data-k="a-' + esc(it.id) + '"' + (pode ? "" : " disabled") + ' aria-label="Adicionar ' + nome + ' ao pedido">' + ic("i-plus") + "</button>";
  }

  function faixaPedido(p, varios, k) {
    return '<button class="meu" type="button" data-act="status" data-token="' + esc(p.token) + '" data-k="' + k + esc(p.numero) + '">' + ic("i-bag") +
      "<span>" + (varios ? "Pedido" : "Seu pedido") + " <b>" + esc(p.numero) + "</b> · " + esc(ESTADO_TXT[p.status] || p.status) + "</span>" + ic("i-right") + "</button>";
  }

  function renderPub() {
    var host = $("#pub");
    if (S.carga === "carregando") return;
    host.removeAttribute("aria-busy");
    var meus = pedidosVisiveis();
    var faixas = meus.length ? '<div class="meus" aria-label="Seus pedidos de hoje">' + meus.map(function (p) { return faixaPedido(p, meus.length > 1, "meu-"); }).join("") + "</div>" : "";

    if (S.carga === "erro") {
      host.innerHTML = faixas +
        '<div class="falha-carga" role="alert"><div><strong>Não conseguimos carregar o cardápio agora.</strong><p>' +
        esc(S.erroCarga || "Confira sua internet e tente de novo. Se continuar, peça o cardápio no balcão.") +
        '</p></div><button class="btn-y" type="button" data-act="recarregar" data-k="recarregar">' + ic("i-refresh") + "Tentar de novo</button></div>";
      return;
    }

    var C = S.C, s = sit(), d = dow(C.hoje), esp = (C.dias && C.dias[0] && C.dias[0].especiais) || [];
    var u = C.unidade || {};
    var h = '<p class="situacao" data-aberto="' + (s.aberto ? "sim" : "nao") + '"><span class="situacao__ponto" aria-hidden="true"></span>' + esc(textoSituacao()) + "</p>";
    if (S.desatualizado) h += '<p class="desatualizado">' + ic("i-alert", "ic ic--sm") + "Sem conexão agora. Mostrando o cardápio carregado às " + esc(horaSP(new Date(S.ultimaCarga).toISOString())) + ".</p>";
    if (u.aviso) h += '<p class="aviso">' + esc(u.aviso) + "</p>";
    h += faixas;
    if (S.avisos.length) {
      h += '<div class="alerta" role="status">' + ic("i-info") + '<div class="alerta__txt">' + S.avisos.map(function (a) { return "<p>" + esc(a) + "</p>"; }).join("") +
        '<button class="alerta__acao" type="button" data-act="ok-avisos" data-k="ok-avisos">Entendi</button></div></div>';
    }
    if (!s.aberto) h += '<div class="alerta" role="note">' + ic("i-clock") + '<div class="alerta__txt"><strong>Pedidos pelo celular abrem no horário.</strong>Você já pode olhar o cardápio.</div></div>';
    else if (!s.recebendo) h += '<div class="alerta" role="note">' + ic("i-info") + '<div class="alerta__txt"><strong>Pedidos pelo celular pausados agora.</strong>Faça seu pedido direto no balcão.</div></div>';

    // Hoje
    h += '<section class="sec" aria-labelledby="hHoje"><h2 class="h" id="hHoje">Hoje <small>' + esc(DIAS[d]) + ", " + esc(ddmm(C.hoje)) + "</small></h2>";
    h += esp.length ? esp.map(function (it) {
      var desc = it.descricao || (it.sabores && it.sabores.length ? it.sabores.map(function (x) { return x.nome; }).join(", ") : "");
      return '<article class="esp"' + (it.esgotado ? " data-acabou" : "") + '><h3 class="esp__nm">' + esc(it.nome) + (it.esgotado ? '<span class="sr"> (acabou hoje)</span>' : "") + "</h3>" +
        '<p class="esp__preco">' + precoTxt(it) + "</p>" + (desc ? '<p class="esp__desc">' + esc(desc) + "</p>" : "") +
        '<div class="esp__acao">' + botaoItem(it, true) + "</div></article>";
    }).join("") : '<p class="vazio">Hoje vale o menu padrão.</p>';
    if (notaDoDia(d)) h += '<p class="nota">' + ic("i-info") + esc(notaDoDia(d)) + "</p>";
    h += "</section>";

    // Menu padrão, agrupado pelas categorias na ordem do servidor
    var grupos = (C.categorias || []).map(function (c) { return { nome: c.nome, itens: (C.padrao || []).filter(function (i) { return i.categoria_id === c.id; }) }; });
    var ids = {}; (C.categorias || []).forEach(function (c) { ids[c.id] = 1; });
    var soltos = (C.padrao || []).filter(function (i) { return !ids[i.categoria_id]; });
    if (soltos.length) grupos.push({ nome: "Outros", itens: soltos });
    grupos = grupos.filter(function (g) { return g.itens.length; });
    h += '<section class="sec" aria-labelledby="hPadrao"><h2 class="h" id="hPadrao">Menu padrão <small>todo dia</small></h2>';
    h += grupos.length ? grupos.map(function (g) {
      return '<h3 class="grupo">' + esc(g.nome) + '</h3><ul class="lista">' + g.itens.map(function (it) {
        return "<li" + (it.esgotado ? " data-acabou" : "") + '><div class="lin"><span class="lin__nm">' + esc(it.nome) + (it.esgotado ? '<span class="sr"> (acabou hoje)</span>' : "") +
          '</span><span class="lin__guia" aria-hidden="true"></span><span class="lin__preco">' + precoTxt(it) + "</span></div><div>" + botaoItem(it) + "</div>" +
          (it.descricao ? '<p class="lista__desc">' + esc(it.descricao) + "</p>" : "") + "</li>";
      }).join("") + "</ul>";
    }).join("") : '<p class="vazio">O menu padrão ainda não foi cadastrado.</p>';
    h += "</section>";

    // Próximos dias
    var prox = (C.dias || []).slice(1, 8);
    if (prox.length) {
      var datas = prox.map(function (x) { return x.data; });
      if (!S.diaSel || datas.indexOf(S.diaSel) === -1) S.diaSel = datas[0];
      h += '<section class="sec" aria-labelledby="hProx"><h2 class="h" id="hProx">Próximos dias</h2><div class="dias" role="group" aria-label="Escolha um dia">';
      h += prox.map(function (x, i) {
        var dd = dow(x.data), tem = (x.especiais && x.especiais.length) || notaDoDia(dd);
        return '<button class="dia" type="button" data-act="dia" data-s="' + esc(x.data) + '" data-k="dia-' + i + '" aria-pressed="' + (S.diaSel === x.data) + '"' + (tem ? " data-tem" : "") +
          ' aria-label="' + esc(DIAS[dd] + ", " + ddmm(x.data) + (tem ? ", tem especial ou aviso" : "")) + '"><small>' + DIAS_C[dd] + "</small><b>" + esc(String(x.data).slice(8, 10)) + "</b><i></i></button>";
      }).join("") + "</div>";
      var sel = prox.filter(function (x) { return x.data === S.diaSel; })[0], sd = dow(sel.data), se = sel.especiais || [];
      h += '<div class="diainfo" aria-live="polite"><p class="diainfo__t">' + esc(cap(DIAS[sd]) + ", " + ddmm(sel.data)) + "</p>" +
        (se.length ? '<ul class="lista">' + se.map(function (it) { return '<li><div class="lin"><span class="lin__nm">' + esc(it.nome) + '</span><span class="lin__guia" aria-hidden="true"></span><span class="lin__preco">' + precoTxt(it) + "</span></div><span></span></li>"; }).join("") + "</ul>"
          : '<p class="vazio">Só o menu padrão.</p>') +
        (notaDoDia(sd) ? '<p class="nota">' + ic("i-info") + esc(notaDoDia(sd)) + "</p>" : "") + "</div></section>";
    }
    host.innerHTML = h;
  }

  function linkInstagram(v) {
    var m = /^@?([A-Za-z0-9._]{1,30})$/.exec(String(v || "").trim());
    return m ? '<a href="https://www.instagram.com/' + esc(m[1]) + '/" rel="noopener" target="_blank">@' + esc(m[1]) + "</a>" : esc(v);
  }
  function linkWhats(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (d.length === 10 || d.length === 11) d = "55" + d;
    return d.length >= 12 && d.length <= 13 ? '<a href="https://wa.me/' + d + '" rel="noopener" target="_blank">WhatsApp ' + esc(v) + "</a>" : esc(v);
  }
  function renderRodape() {
    var f = $("#rodape");
    if (!S.C) { f.innerHTML = ""; return; }
    var u = S.C.unidade || {}, hs = S.C.horarios || [], hd = dow(S.C.hoje), porDia = {};
    hs.forEach(function (x) { porDia[x.dia] = x; });
    var h = "";
    if (hs.length) {
      h += '<div><h2>Horário</h2><dl class="horas">' + [1, 2, 3, 4, 5, 6, 0].map(function (d) {
        var x = porDia[d], hoje = d === hd ? " data-hoje" : "";
        var txt = x && x.aberto ? hora(x.abre) + " às " + hora(x.fecha) : "Fechado";
        return "<dt" + hoje + ">" + esc(cap(DIAS[d])) + (hoje ? '<span class="sr"> (hoje)</span>' : "") + "</dt><dd" + hoje + ">" + esc(txt) + "</dd>";
      }).join("") + "</dl></div>";
    }
    if (u.pagamento && u.pagamento.length) h += '<div><h2>Pagamento no balcão</h2><ul class="chips">' + u.pagamento.map(function (p) { return '<li class="tag">' + esc(p) + "</li>"; }).join("") + "</ul></div>";
    if (u.endereco) h += "<div><h2>Onde fica</h2><p>" + esc(u.endereco) + "</p></div>";
    if (u.instagram || u.whatsapp) h += "<div><h2>Contato</h2><p>" + [u.instagram ? linkInstagram(u.instagram) : "", u.whatsapp ? linkWhats(u.whatsapp) : ""].filter(Boolean).join(" · ") + "</p></div>";
    h += '<p class="rodape__casa">Pedidos pelo celular valem depois da confirmação no balcão. <a href="../">Shalom Asa Sul</a></p>';
    f.innerHTML = h;
  }

  function renderBarra() {
    var b = $("#barra");
    if (!S.C || !S.carrinho.length || S.carga !== "ok") { b.innerHTML = ""; return; }
    var q = qtdCarrinho(), txtQ = q + " " + (q === 1 ? "item" : "itens"), txtT = BRL(totalCarrinho());
    var atual = $(".carrinho", b);
    if (atual) { $(".carrinho__qtd", atual).textContent = txtQ; $(".carrinho__tot", atual).textContent = txtT; return; }  // sem replay da animação
    b.innerHTML = '<button class="carrinho" type="button" data-act="ver" data-k="carrinho" aria-haspopup="dialog"><span class="carrinho__qtd">' + esc(txtQ) +
      '</span><span class="carrinho__tot">' + esc(txtT) + '</span><span class="carrinho__ver">Ver pedido' + ic("i-right", "ic ic--sm") + "</span></button>";
  }

  /* ---------------- folhas ---------------- */
  function folha(titulo, sub, corpo, pe) {
    return '<div class="camada" data-act="fora"><section class="folha" role="dialog" aria-modal="true" aria-labelledby="fT"' + (sub ? ' aria-describedby="fS"' : "") + ' tabindex="-1">' +
      '<header class="folha__topo"><div><h2 id="fT">' + titulo + "</h2>" + (sub ? '<p id="fS">' + sub + "</p>" : "") + "</div>" +
      '<button class="fechar" type="button" data-act="fechar" data-k="fechar" aria-label="Fechar">' + ic("i-x") + "</button></header>" +
      '<div class="folha__corpo">' + corpo + "</div>" + (pe ? '<div class="folha__pe">' + pe + "</div>" : "") + "</section></div>";
  }

  function renderCamada() {
    var L = $("#camada"), f = S.folha;
    if (!f) { L.innerHTML = ""; return; }
    var jaAberta = !!L.querySelector(".folha");
    if (f.tipo === "sabor") L.innerHTML = folhaSabor(f);
    else if (f.tipo === "pedido") L.innerHTML = folhaPedido();
    else if (f.tipo === "status") L.innerHTML = folhaStatus(f);
    if (jaAberta) L.querySelector(".folha").classList.add("folha--fixa");   // redesenho: sem repetir a entrada
    if (!L.contains(document.activeElement)) {
      var alvo = (f.tipo === "sabor" && L.querySelector('[data-act="sab-mais"]:not([disabled])')) || L.querySelector(".folha");
      if (alvo) alvo.focus({ preventScroll: true });
    }
  }

  function folhaSabor(f) {
    var it = porId(f.id);
    if (!it) return folha("Item indisponível", "", '<p class="vazio">Este item não está mais no cardápio de hoje.</p>', "");
    var tot = 0, valor = 0;
    it.sabores.forEach(function (sb) { var q = f.qtds[sb.nome] || 0; tot += q; valor += q * sb.preco_centavos; });
    var outros = qtdCarrinho() - qtdDe(it.id), tinha = qtdDe(it.id) > 0;
    var corpo = '<ul aria-label="Sabores">' + it.sabores.map(function (s, i) {
      var q = f.qtds[s.nome] || 0, n = esc(s.nome);
      var podeMais = q < MAX_LINHA && outros + tot < MAX_TOTAL;
      return '<li class="linha"><span class="linha__nm">' + n + '</span><span class="linha__sub">' + esc(BRL(s.preco_centavos)) + " cada</span>" +
        (q ? '<div class="passos" role="group" aria-label="' + n + '"><button type="button" data-act="sab-menos" data-i="' + i + '" data-k="sm-' + i + '" aria-label="Tirar um de ' + n + '">' + ic("i-minus") + "</button><output>" + q +
          '</output><button type="button" data-act="sab-mais" data-i="' + i + '" data-k="sa-' + i + '" aria-label="Mais um de ' + n + '"' + (podeMais ? "" : " disabled") + ">" + ic("i-plus") + "</button></div>"
          : '<button class="mais" type="button" data-act="sab-mais" data-i="' + i + '" data-k="sa-' + i + '" aria-label="Adicionar um de ' + n + '"' + (podeMais ? "" : " disabled") + ">" + ic("i-plus") + "</button>") + "</li>";
    }).join("") + "</ul>";
    var rot = tot ? (tinha ? "Atualizar pedido" : "Adicionar ao pedido") + " · " + tot + " · " + BRL(valor) : tinha ? "Tirar do pedido" : "Escolha pelo menos um sabor";
    var pe = (podePedir() ? "" : '<p class="falha falha--info">' + ic("i-clock") + "<span>Os pedidos pelo celular não estão abertos agora.</span></p>") +
      '<button class="btn-y btn-y--bloco" type="button" data-act="sab-ok" data-k="sab-ok"' + ((tot || tinha) && podePedir() ? "" : " disabled") + ">" + esc(rot) + "</button>";
    return folha(esc(it.nome), "Escolha quantos quer de cada sabor", corpo, pe);
  }

  function folhaPedido() {
    var E = S.envio, alvo = alvoJuntar(), junta = !!(alvo && S.juntar), tot = totalCarrinho();
    var corpo = "<ul>" + S.carrinho.map(function (l, i) {
      var it = porId(l.id), nome = esc(it ? it.nome : l.nomeVisto || "Item");
      var podeMais = l.qtd < MAX_LINHA && qtdCarrinho() < MAX_TOTAL;
      return '<li class="linha"><span class="linha__nm">' + nome + '</span><span class="linha__sub">' + (l.sabor ? esc(l.sabor) + " · " : "") + esc(BRL(precoLinha(l))) + " cada</span>" +
        '<div class="passos" role="group" aria-label="' + nome + (l.sabor ? ", " + esc(l.sabor) : "") + '"><button type="button" data-act="l-menos" data-i="' + i + '" data-k="lm-' + esc(l.id + (l.sabor || "")) + '" aria-label="' + (l.qtd === 1 ? "Tirar " + nome + " do pedido" : "Tirar um " + nome) + '">' + ic(l.qtd === 1 ? "i-trash" : "i-minus") +
        "</button><output>" + l.qtd + '</output><button type="button" data-act="l-mais" data-i="' + i + '" data-k="la-' + esc(l.id + (l.sabor || "")) + '" aria-label="Mais um ' + nome + '"' + (podeMais ? "" : " disabled") + ">" + ic("i-plus") + "</button></div></li>";
    }).join("") + "</ul>" +
      '<p class="total"><span>Total</span><span>' + esc(BRL(tot)) + "</span></p>";
    if (!podePedir()) corpo += '<p class="falha falha--info">' + ic("i-clock") + "<span>" + esc(sit().aberto ? "Os pedidos pelo celular estão pausados agora. Faça seu pedido no balcão." : "A lanchonete está fechada agora. Os pedidos pelo celular abrem no horário.") + "</span></p>";
    if (E.info) corpo += '<p class="falha falha--info" role="status">' + ic("i-info") + "<span>" + esc(E.info) + "</span></p>";
    if (alvo) {
      corpo += '<div class="juntar"><p class="juntar__t" id="jT">Você já tem o pedido <b>' + esc(alvo.numero) + '</b> esperando confirmação no balcão.</p><div class="opcoes" role="radiogroup" aria-labelledby="jT">' +
        '<button class="opcao" type="button" role="radio" aria-checked="' + S.juntar + '" tabindex="' + (S.juntar ? 0 : -1) + '" data-act="juntar" data-v="1" data-k="pj1"><span class="opcao__bola" aria-hidden="true"></span><span class="opcao__nm">Juntar ao pedido ' + esc(alvo.numero) +
        "<small>Um número só no balcão. Total vai a " + esc(BRL((alvo.total_centavos || 0) + tot)) + ".</small></span></button>" +
        '<button class="opcao" type="button" role="radio" aria-checked="' + !S.juntar + '" tabindex="' + (S.juntar ? -1 : 0) + '" data-act="juntar" data-v="0" data-k="pj0"><span class="opcao__bola" aria-hidden="true"></span><span class="opcao__nm">Fazer um pedido separado<small>Com outro número, acompanhado à parte.</small></span></button></div></div>';
    }
    if (!junta) {
      var en = E.campos.nome, et = E.campos.tel;
      corpo += '<div class="campo"><label for="fNome">Seu nome</label><input id="fNome" data-campo="nome" data-k="fNome" autocomplete="given-name" maxlength="60" value="' + esc(S.form.nome) + '"' +
        (en ? ' aria-invalid="true" aria-describedby="eNome"' : "") + ">" + (en ? '<p class="campo__erro" id="eNome">' + ic("i-alert", "ic ic--sm") + esc(en) + "</p>" : "") + "</div>" +
        '<div class="campo"><label for="fTel">Telefone com DDD</label><input id="fTel" data-campo="tel" data-k="fTel" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="16" placeholder="(61) 99999-9999" value="' + esc(S.form.tel) + '"' +
        (et ? ' aria-invalid="true" aria-describedby="eTel"' : "") + ">" + (et ? '<p class="campo__erro" id="eTel">' + ic("i-alert", "ic ic--sm") + esc(et) + "</p>" : "") + "</div>" +
        '<p class="privacidade">Usamos seu nome e telefone só para este pedido. Os dois são apagados em 30 dias.' +
        (S.lembrado ? ' Este aparelho lembra os dois para o próximo pedido. <button type="button" data-act="esquecer" data-k="esquecer">Esquecer neste aparelho</button>' : " Este aparelho guarda os dois para o próximo pedido.") + "</p>";
    }
    corpo += '<div class="isca" aria-hidden="true"><label for="fSite">Site</label><input id="fSite" name="site" type="text" tabindex="-1" autocomplete="off" value=""></div>';
    if (E.erro) corpo += '<p class="falha" role="alert">' + ic("i-alert") + "<span>" + esc(E.erro) + "</span></p>";
    var rot = E.enviando ? "Enviando…" : E.erro && E.idem ? "Tentar de novo" : junta ? "Juntar ao " + alvo.numero + " · + " + BRL(tot) : "Enviar pedido · " + BRL(tot);
    var pe = '<button class="btn-y btn-y--bloco" type="button" data-act="enviar" data-k="enviar"' + (podePedir() ? "" : " disabled") + (E.enviando ? ' aria-disabled="true" aria-busy="true"' : "") + ">" + esc(rot) + "</button>";
    return folha("Seu pedido", "Confira e envie. O pagamento é no balcão.", corpo, pe);
  }

  function folhaStatus(f) {
    var p = S.pedidos[f.token];
    if (!p) return folha("Pedido", "", '<p class="vazio">Buscando seu pedido…</p>', "");
    var outros = pedidosVisiveis().filter(function (o) { return o.token !== p.token; });
    var ordem = ["recebido", "confirmado", "entregue"], at = ordem.indexOf(p.status);
    var ET = [["Recebido", "O balcão já está vendo seu pedido.", p.criado_em], ["Confirmado no balcão", "Pagamento feito. Já vai sair.", p.confirmado_em], ["Entregue", "Bom apetite!", p.entregue_em]];
    var corpo = (f.aviso ? '<p class="falha falha--info" role="status">' + ic("i-info") + "<span>" + esc(f.aviso) + "</span></p>" : "") +
      '<p class="codigo"><b>' + esc(p.numero) + "</b><span>número do pedido</span></p>";
    if (p.status === "recebido") corpo += '<div class="instrucao"><strong>Agora vá ao balcão.</strong>Diga seu nome ou o número ' + esc(p.numero) + " e confirme o pagamento. O pedido só é preparado depois disso.</div>";
    if (p.status === "cancelado") {
      corpo += '<div class="alerta alerta--folha" role="note">' + ic("i-info") + '<div class="alerta__txt"><strong>' + esc(p.motivo || "Cancelado pelo balcão.") + "</strong>Se tiver dúvida, fale com quem está no balcão.</div></div>";
    } else {
      corpo += '<ol class="etapas" aria-label="Situação do pedido">' + ET.map(function (e, i) {
        var feita = i < at || p.status === "entregue", atual = i === at && p.status !== "entregue";
        var quando = i <= at && e[2] ? horaSP(e[2]) + " · " : "";
        return '<li class="etapa" ' + (feita ? "data-feita" : atual ? "data-atual" : "data-pendente") + '><span class="etapa__marca" aria-hidden="true">' + (i <= at ? ic("i-check", "ic ic--sm") : i + 1) + "</span><div>" +
          '<p class="etapa__t">' + e[0] + (atual ? " · agora" : "") + '<span class="sr">' + (feita ? " (feito)" : atual ? " (etapa atual)" : " (ainda não)") + "</span></p>" +
          (i <= at ? '<p class="etapa__d">' + esc(quando) + e[1] + "</p>" : "") + "</div></li>";
      }).join("") + "</ol>";
    }
    if (p.itens_novos && p.status === "recebido") corpo += '<p class="nota" style="padding:0">' + ic("i-check") + "Os itens novos já entraram neste pedido.</p>";
    corpo += "<ul>" + (p.itens || []).map(function (i) { return '<li class="linha"><span class="linha__nm">' + esc(i.quantidade) + "× " + esc(i.nome) + '</span><span class="linha__sub">' + esc(i.sabor || "") + "</span></li>"; }).join("") + "</ul>";
    if (outros.length) corpo += '<div class="outros"><p class="outros__t">Seus outros pedidos</p>' + outros.map(function (o) { return faixaPedido(o, true, "ou-"); }).join("") + "</div>";
    var pe = p.status === "entregue" || p.status === "cancelado"
      ? '<button class="btn-y btn-y--bloco" type="button" data-act="novo" data-k="novo">Fazer outro pedido</button>'
      : '<button class="btn-o btn-o--bloco" type="button" data-act="fechar" data-k="voltar">Voltar ao cardápio</button>';
    var titulo = p.status === "cancelado" ? "Pedido cancelado" : p.status === "entregue" ? "Pedido entregue" : "Pedido enviado";
    return folha(titulo, esc((p.nome ? p.nome + " · " : "") + BRL(p.total_centavos)), corpo, pe);
  }

  function abrirFolha(f, opener) {
    S.folha = f; S.abriu = opener || null;
    document.body.classList.add("travado");
    $("#app").inert = true; $("#barra").inert = true;
    $("#app").setAttribute("aria-hidden", "true"); $("#barra").setAttribute("aria-hidden", "true");
    renderCamada();
  }
  function fecharFolha() {
    var k = S.abriu;
    S.folha = null;
    document.body.classList.remove("travado");
    $("#app").inert = false; $("#barra").inert = false;
    $("#app").removeAttribute("aria-hidden"); $("#barra").removeAttribute("aria-hidden");
    renderCamada(); renderPub(); renderBarra();
    var el = k ? document.querySelector('[data-k="' + (window.CSS && CSS.escape ? CSS.escape(k) : k) + '"]') : null;
    (el || $("#conteudo")).focus({ preventScroll: true });
  }

  /* ---------------- carrinho ---------------- */
  function anunciar(t) { var a = $("#anuncio"); a.textContent = ""; setTimeout(function () { a.textContent = t; }, 60); }
  function mudouCarrinho(msg) {
    salvarCarrinho();
    S.envio.erro = ""; S.envio.info = "";
    pintar(function () { renderPub(); renderBarra(); if (S.folha) renderCamada(); });
    if (msg) anunciar(msg);
  }
  function resumoCarrinho() { var q = qtdCarrinho(); return q ? q + (q === 1 ? " item" : " itens") + ", total " + BRL(totalCarrinho()) + "." : "Pedido vazio."; }
  function addItem(id) {
    var it = porId(id); if (!it || it.esgotado || !podePedir()) return;
    var l = S.carrinho.filter(function (x) { return x.id === id && !x.sabor; })[0];
    if ((l && l.qtd >= MAX_LINHA) || qtdCarrinho() >= MAX_TOTAL) { anunciar("Limite do pedido pelo celular atingido. Para mais, peça no balcão."); return; }
    if (l) l.qtd++; else S.carrinho.push({ id: id, sabor: null, qtd: 1, nomeVisto: it.nome });
    mudouCarrinho(it.nome + ": " + qtdDe(id) + " no pedido. " + resumoCarrinho());
  }
  function tirarItem(id) {
    var i = -1;
    S.carrinho.forEach(function (x, j) { if (x.id === id && !x.sabor) i = j; });
    if (i < 0) return;
    var it = porId(id);
    if (--S.carrinho[i].qtd <= 0) S.carrinho.splice(i, 1);
    mudouCarrinho((it ? it.nome : "Item") + ": " + qtdDe(id) + " no pedido. " + resumoCarrinho());
    if (!qtdDe(id)) { var b = document.querySelector('[data-k="a-' + id + '"]'); if (b) b.focus(); }
  }

  /* ---------------- envio ---------------- */
  function enviar() {
    var E = S.envio;
    if (E.enviando || !S.carrinho.length) return;
    if (!podePedir()) { E.erro = "Os pedidos pelo celular não estão abertos agora."; pintar(renderCamada); return; }
    var alvo = alvoJuntar(), junta = !!(alvo && S.juntar);
    E.campos = {}; E.erro = "";
    var nome = String(S.form.nome || "").trim(), tel = String(S.form.tel || "").replace(/\D/g, "");
    if (!junta) {
      if (nome.length < 2) E.campos.nome = "Escreva seu nome para o balcão chamar você.";
      if (tel.length < 10 || tel.length > 11) E.campos.tel = "Confira o telefone: são 10 ou 11 números, com DDD.";
      if (E.campos.nome || E.campos.tel) {
        renderCamada();
        var c = $(E.campos.nome ? "#fNome" : "#fTel"); if (c) c.focus();
        return;
      }
    }
    if (!E.idem) E.idem = chaveAleatoria();     // uma chave por tentativa; reusada no "tentar de novo"
    var isca = $("#fSite");
    var corpo = {
      unidade: UNIDADE,
      itens: S.carrinho.map(function (l) { var x = { item_id: l.id, quantidade: l.qtd }; if (l.sabor) x.sabor = l.sabor; return x; }),
      idempotencia: E.idem,
      site: isca ? isca.value : ""
    };
    if (junta) corpo.juntar_token = alvo.token;
    else { corpo.nome = nome; corpo.telefone = tel; }
    E.enviando = true; E.info = "";
    pintar(renderCamada);
    rpc("lanchonete_criar_pedido", { p: corpo }).then(function (r) {
      E.enviando = false;
      if (r.error || !r.data) { tratarErroEnvio(r.error, junta); return; }
      var p = r.data;
      E.idem = null; E.erro = ""; E.info = ""; E.campos = {};
      if (!junta) { S.form = { nome: nome, tel: fmtTel(tel) }; gravar(CHAVE.cliente, S.form); S.lembrado = true; }
      S.pedidos[p.token] = p; guardarToken(p.token);
      S.carrinho = []; salvarCarrinho(); S.juntar = true;
      S.folha = { tipo: "status", token: p.token, aviso: p.repetido ? "Este pedido já tinha chegado ao balcão. Nada foi enviado em dobro." : "" };
      S.abriu = "meu-" + p.numero;
      renderTudo();
      var f = $(".folha"); if (f) f.focus();
      anunciar((p.juntado ? "Itens juntados ao pedido " : "Pedido enviado. Número ") + p.numero + ". Agora vá ao balcão para confirmar.");
    });
  }
  function tratarErroEnvio(err, junta) {
    var E = S.envio;
    if (!erroDeRegra(err)) {           // rede ou falha inesperada: pode ter chegado; mantém a chave
      E.erro = FALHA_REDE; pintar(renderCamada); focarErro(); return;
    }
    var cod = err.message, hint = err.hint || "Não foi possível enviar o pedido.";
    E.idem = null;                      // o servidor recusou: nada foi gravado com esta chave
    if (cod === "NOME_INVALIDO" || cod === "TELEFONE_INVALIDO") {
      E.campos = {}; E.campos[cod === "NOME_INVALIDO" ? "nome" : "tel"] = hint;
      pintar(renderCamada);
      var c = $(cod === "NOME_INVALIDO" ? "#fNome" : "#fTel"); if (c) c.focus();
      return;
    }
    if (cod === "JUNTAR_INDISPONIVEL") {
      S.juntar = false; E.info = hint; E.erro = "";
      var alvo = alvoJuntar(); if (alvo) alvo.status = "indisponivel";
      atualizarPedidos();
      renderCamada();
      var n = $("#fNome"); if (n) n.focus();
      return;
    }
    E.erro = hint;
    if (["ITEM_ESGOTADO", "ITEM_INDISPONIVEL", "SABOR_INVALIDO", "FECHADO", "PAUSADO"].indexOf(cod) !== -1) {
      carregarCardapio(true).then(function () { if (S.folha && S.folha.tipo === "pedido") { pintar(renderCamada); focarErro(); } });
    }
    pintar(renderCamada); focarErro();
  }
  function focarErro() { var e = $("#camada .falha[role=alert]"); if (e && e.scrollIntoView) e.scrollIntoView({ block: "nearest" }); var b = $('[data-act="enviar"]'); if (b && !b.disabled && !$("#camada").contains(document.activeElement)) b.focus(); }

  /* ---------------- eventos ---------------- */
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act]");
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-act"), id = b.getAttribute("data-id");
    if (a === "fora") { if (ev.target === b) fecharFolha(); return; }
    switch (a) {
      case "recarregar": if (!cliente()) { location.reload(); break; } S.carga = "carregando"; $("#pub").innerHTML = '<p class="vazio" role="status" style="padding:1rem 1.25rem">Carregando…</p>'; carregarCardapio(); break;
      case "ok-avisos": S.avisos = []; pintar(renderPub); $("#conteudo").focus({ preventScroll: true }); break;
      case "mais": addItem(id); break;
      case "menos": tirarItem(id); break;
      case "sabor": {
        var q = {}; S.carrinho.forEach(function (l) { if (l.id === id && l.sabor) q[l.sabor] = l.qtd; });
        abrirFolha({ tipo: "sabor", id: id, qtds: q }, b.getAttribute("data-k")); break;
      }
      case "sab-mais": case "sab-menos": {
        var f = S.folha, it = porId(f.id), s = it && it.sabores[+b.getAttribute("data-i")];
        if (!s) break;
        var atual = f.qtds[s.nome] || 0;
        f.qtds[s.nome] = a === "sab-mais" ? atual + 1 : Math.max(0, atual - 1);
        pintar(renderCamada);
        if (a === "sab-menos" && !f.qtds[s.nome]) { var mb = $('[data-k="sa-' + b.getAttribute("data-i") + '"]'); if (mb) mb.focus(); }
        anunciar(s.nome + ": " + (f.qtds[s.nome] || 0));
        break;
      }
      case "sab-ok": {
        var f2 = S.folha, it2 = porId(f2.id); if (!it2) break;
        var resto = S.carrinho.filter(function (l) { return l.id !== f2.id; });
        it2.sabores.forEach(function (sb) { var qq = f2.qtds[sb.nome] || 0; if (qq) resto.push({ id: f2.id, sabor: sb.nome, qtd: qq, nomeVisto: it2.nome }); });
        S.carrinho = resto;
        salvarCarrinho(); S.envio.erro = "";
        fecharFolha();
        anunciar(it2.nome + ": " + qtdDe(it2.id) + " no pedido. " + resumoCarrinho());
        break;
      }
      case "ver": S.juntar = true; abrirFolha({ tipo: "pedido" }, "carrinho"); break;
      case "fechar": fecharFolha(); break;
      case "l-mais": case "l-menos": {
        var i = +b.getAttribute("data-i"), l = S.carrinho[i]; if (!l) break;
        var it3 = porId(l.id), nm = it3 ? it3.nome : l.nomeVisto || "Item";
        if (a === "l-mais") { if (l.qtd < MAX_LINHA && qtdCarrinho() < MAX_TOTAL) l.qtd++; }
        else if (--l.qtd <= 0) S.carrinho.splice(i, 1);
        if (!S.carrinho.length) { salvarCarrinho(); S.envio = { idem: null, enviando: false, erro: "", info: "", campos: {} }; fecharFolha(); anunciar("Pedido vazio."); break; }
        mudouCarrinho(nm + (l.sabor ? " " + l.sabor : "") + ": " + (l.qtd > 0 ? l.qtd : 0) + ". " + resumoCarrinho());
        if (l.qtd <= 0) { var pri = $('#camada [data-act="l-menos"]'); if (pri) pri.focus(); }
        break;
      }
      case "juntar": S.juntar = b.getAttribute("data-v") === "1"; S.envio.campos = {}; pintar(renderCamada); break;
      case "enviar": enviar(); break;
      case "esquecer": gravar(CHAVE.cliente, null); S.lembrado = false; S.form = { nome: "", tel: "" }; renderCamada(); anunciar("Nome e telefone apagados deste aparelho."); var fn = $("#fNome"); if (fn) fn.focus(); break;
      case "status": abrirFolha({ tipo: "status", token: b.getAttribute("data-token") }, b.getAttribute("data-k")); break;
      case "novo": { var t = S.folha && S.folha.token; S.abriu = null; if (t) tirarToken(t); fecharFolha(); break; }
      case "dia": S.diaSel = b.getAttribute("data-s"); pintar(renderPub); break;
    }
  });

  document.addEventListener("input", function (ev) {
    var c = ev.target.getAttribute && ev.target.getAttribute("data-campo");
    if (!c) return;
    if (c === "tel") {
      var v = fmtTel(ev.target.value);
      if (v !== ev.target.value) ev.target.value = v;
    }
    S.form[c] = ev.target.value;
    if (S.envio.campos[c]) { delete S.envio.campos[c]; ev.target.removeAttribute("aria-invalid"); var e = ev.target.parentNode.querySelector(".campo__erro"); if (e) e.remove(); }
  });

  document.addEventListener("keydown", function (ev) {
    if (!S.folha) return;
    if (ev.key === "Escape") { ev.preventDefault(); fecharFolha(); return; }
    if (ev.key === "Enter" && ev.target.matches && ev.target.matches(".campo input")) { ev.preventDefault(); enviar(); return; }
    // Setas trocam a opção do grupo "Juntar / separado" (padrão de radiogroup).
    if ((ev.key === "ArrowDown" || ev.key === "ArrowUp" || ev.key === "ArrowLeft" || ev.key === "ArrowRight") && ev.target.matches && ev.target.matches(".opcao")) {
      ev.preventDefault();
      S.juntar = !S.juntar; S.envio.campos = {};
      renderCamada(); var o = $('[data-k="' + (S.juntar ? "pj1" : "pj0") + '"]'); if (o) o.focus();
      return;
    }
    if (ev.key === "Tab") {
      var focaveis = Array.prototype.filter.call(document.querySelectorAll("#camada button:not([disabled]), #camada input:not([tabindex='-1']), #camada a[href], #camada [tabindex='0']"), function (el) { return el.offsetParent !== null || el === document.activeElement; });
      if (!focaveis.length) { ev.preventDefault(); return; }
      var pri = focaveis[0], ult = focaveis[focaveis.length - 1];
      if (!$("#camada").contains(document.activeElement)) { ev.preventDefault(); pri.focus(); return; }
      if (ev.shiftKey && (document.activeElement === pri || document.activeElement === $(".folha"))) { ev.preventDefault(); ult.focus(); }
      else if (!ev.shiftKey && document.activeElement === ult) { ev.preventDefault(); pri.focus(); }
    }
  });

  /* ---------------- ciclo de vida ---------------- */
  setInterval(function () {
    if (document.visibilityState === "visible" && S.tokens.length && acompanhando()) atualizarPedidos();
  }, ACOMPANHAR_MS);
  setInterval(function () {
    if (document.visibilityState === "visible" && S.carga !== "carregando") carregarCardapio(true);
  }, RECARREGAR_MS);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") return;
    if (S.tokens.length) atualizarPedidos();
    if (S.ultimaCarga && Date.now() - S.ultimaCarga > RECARREGAR_MS) carregarCardapio(true);
  });

  if (!cliente()) {
    S.carga = "erro";
    S.erroCarga = "Não conseguimos falar com o servidor do cardápio. Confira sua internet e tente de novo.";
    pintar(renderTudo);
  } else {
    Promise.all([carregarCardapio(), atualizarPedidos()]).then(function () { pintar(renderTudo); });
  }
})();
