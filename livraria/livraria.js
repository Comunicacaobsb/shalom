/* =====================================================================
   Livraria Shalom · Brasília · página pública (catálogo + reserva)
   ---------------------------------------------------------------------
   Mesmo motor da Lanchonete SH82 (esquema "lanchonete", unidade "livraria").
   Toda regra mora no servidor; a página só chama três funções com a chave anon:
     lanchonete_cardapio('livraria')   -> catálogo, estoque, promoções, dias de retirada
     lanchonete_criar_pedido(p)        -> reserva (confere estoque e data de retirada)
     lanchonete_meus_pedidos(p_tokens) -> acompanha as reservas do aparelho
   Valores em centavos. Todo texto vindo do banco passa por esc().

   Desenvolvimento local (só em localhost/127.0.0.1), igual ao /sh82:
   localStorage.sh82_supabase_dev = '{"url":"http://127.0.0.1:54321","anonKey":"..."}'
   ===================================================================== */
(function () {
  "use strict";

  var UNIDADE = "livraria";
  var CHAVE = { carrinho: "livraria_carrinho", cliente: "livraria_cliente", reservas: "livraria_reservas" };
  var MAX_TOKENS = 10, MAX_LINHA = 20, MAX_TOTAL = 50;
  var ACOMPANHAR_MS = 15000, RECARREGAR_MS = 60000;
  var DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  var DIAS_C = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  var FALHA_REDE = "Não conseguimos enviar agora. Sua reserva continua aqui; tente de novo.";

  /* ---------------- utilidades ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function BRL(c) { return fmtBRL.format((Number(c) || 0) / 100); }
  function dow(s) { return new Date(String(s).slice(0, 10) + "T12:00:00Z").getUTCDay(); }
  function ddmm(s) { s = String(s); return s.slice(8, 10) + "/" + s.slice(5, 7); }
  function hora(h) { if (!h) return ""; var p = String(h).split(":"); return Number(p[0]) + "h" + (p[1] && p[1] !== "00" ? p[1] : ""); }
  function ic(id) { return '<svg class="ic" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>'; }
  function fmtTel(v) {
    var d = String(v || "").replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4);
  }
  function chaveAleatoria() {
    var a = new Uint8Array(18);
    window.crypto.getRandomValues(a);
    return "livr-" + Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  function ler(k, padrao) { try { var v = localStorage.getItem(k); return v == null ? padrao : JSON.parse(v); } catch (e) { return padrao; } }
  function gravar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento: segue sem lembrar */ } }
  function $(s, c) { return (c || document).querySelector(s); }
  function anunciar(t) { var a = $("#anuncio"); a.textContent = ""; setTimeout(function () { a.textContent = t; }, 60); }

  /* ---------------- conexão ---------------- */
  var sb = null;
  function cliente() {
    if (sb) return sb;
    var cfg = window.SHALOM_SUPABASE || {};
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      var dev = ler("sh82_supabase_dev", null);
      if (dev && dev.url && dev.anonKey) cfg = dev;
    }
    if (!cfg.url || !cfg.anonKey || !window.supabase || !window.supabase.createClient) return null;
    sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    return sb;
  }
  function rpc(nome, args) {
    var c = cliente();
    if (!c) return Promise.resolve({ data: null, error: { message: "SEM_CONEXAO" } });
    return c.rpc(nome, args).then(function (r) { return r; }, function (e) { return { data: null, error: { message: String((e && e.message) || e) } }; });
  }
  function erroDeRegra(err) { return !!(err && err.code === "P0001" && err.message); }

  /* ---------------- estado ---------------- */
  var S = {
    carga: "carregando", C: null, json: "",
    carrinho: (ler(CHAVE.carrinho, []) || []).filter(function (l) { return l && l.id && l.qtd > 0; }),
    form: ler(CHAVE.cliente, null) || { nome: "", tel: "" },
    ate: null,
    tokens: (ler(CHAVE.reservas, []) || []).filter(function (t) { return typeof t === "string" && t; }).slice(-MAX_TOKENS),
    pedidos: {},
    busca: "", cat: "todos",
    envio: { idem: null, enviando: false, erro: "", campos: {} },
    folha: null, abriu: null
  };
  function salvarCarrinho() { gravar(CHAVE.carrinho, S.carrinho.length ? S.carrinho : null); }
  function salvarTokens() { gravar(CHAVE.reservas, S.tokens.length ? S.tokens : null); }

  /* ---------------- catálogo ---------------- */
  var itens = {};
  function indexar() { itens = {}; ((S.C && S.C.padrao) || []).forEach(function (i) { itens[i.id] = i; }); }
  function porId(id) { return itens[id] || null; }
  function opcao(it, nome) { return (it.sabores || []).filter(function (s) { return s.nome === nome; })[0] || null; }
  /* Quanto ainda dá para reservar (Infinity quando o item não conta estoque). */
  function disp(it, sabor) {
    if (sabor) { var s = opcao(it, sabor); return !s ? 0 : s.estoque == null ? Infinity : s.estoque; }
    if (it.sabores && it.sabores.length) return it.sabores.reduce(function (t, s) { return t + (s.estoque == null ? Infinity : s.estoque); }, 0);
    return it.estoque == null ? Infinity : it.estoque;
  }
  function preco(it, sabor) {
    var s = sabor && opcao(it, sabor);
    if (s) return s.preco_efetivo != null ? s.preco_efetivo : s.preco_centavos;
    return it.preco_efetivo != null ? it.preco_efetivo : it.preco_centavos;
  }
  function precoCheio(it, sabor) { var s = sabor && opcao(it, sabor); return s ? s.preco_centavos : it.preco_centavos; }
  function noCarrinho(id, sabor) { var l = linhaDe(id, sabor); return l ? l.qtd : 0; }
  function linhaDe(id, sabor) { return S.carrinho.filter(function (l) { return l.id === id && (l.sabor || null) === (sabor || null); })[0] || null; }
  function qtdItem(id) { return S.carrinho.reduce(function (t, l) { return t + (l.id === id ? l.qtd : 0); }, 0); }
  function qtdCarrinho() { return S.carrinho.reduce(function (t, l) { return t + l.qtd; }, 0); }
  function totalCarrinho() { return S.carrinho.reduce(function (t, l) { var it = porId(l.id); return t + (it ? preco(it, l.sabor) * l.qtd : 0); }, 0); }
  function sit() { return (S.C && S.C.situacao) || {}; }
  function pode() { return !!sit().recebendo; }
  function hoje() { return (S.C && S.C.hoje) || ""; }
  function amanha() { var d = new Date(hoje() + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }
  function quando(s) { return s === hoje() ? "hoje" : s === amanha() ? "amanhã" : DIAS[dow(s)] + ", " + ddmm(s); }
  function rotDia(s) { return s === hoje() ? "Hoje" : s === amanha() ? "Amanhã" : DIAS_C[dow(s)] + " " + ddmm(s); }

  /* O que sumiu do catálogo, esgotou ou passou do estoque sai ou diminui; a pessoa é avisada. */
  function revalidarCarrinho() {
    if (!S.C) return;
    var avisos = [];
    S.carrinho = S.carrinho.filter(function (l) {
      var it = porId(l.id);
      if (!it || (l.sabor && !opcao(it, l.sabor)) || (!l.sabor && it.sabores && it.sabores.length)) { avisos.push((it ? it.nome : l.nome || "Um item") + " saiu do catálogo"); return false; }
      var d = disp(it, l.sabor);
      if (d <= 0) { avisos.push(it.nome + " esgotou"); return false; }
      if (l.qtd > d) { l.qtd = d; avisos.push(it.nome + ": restam " + d); }
      return true;
    });
    salvarCarrinho();
    if (avisos.length) { S.envio.erro = avisos.join(". ") + ". Sua reserva foi ajustada."; anunciar(S.envio.erro); }
    var dias = S.C.dias_retirada || [];
    if (dias.indexOf(S.ate) === -1) S.ate = dias[Math.min(1, dias.length - 1)] || null;
  }

  function carregar(silencioso) {
    return rpc("lanchonete_cardapio", { p_unidade: UNIDADE }).then(function (r) {
      if (r.error || !r.data) {
        if (!S.C) { S.carga = "erro"; pintar(tudo); }
        return;
      }
      var j = JSON.stringify(r.data);
      if (j === S.json && S.carga === "ok") return;
      S.json = j; S.C = r.data; S.carga = "ok";
      indexar(); revalidarCarrinho();
      pintar(function () { renderTopo(); renderPub(); renderRodape(); renderBarra(); if (!digitando() || !silencioso) renderCamada(); });
    });
  }

  /* ---------------- reservas do aparelho ---------------- */
  function ativas() { return S.tokens.map(function (t) { return S.pedidos[t]; }).filter(function (p) { return p && (p.status === "recebido" || p.status === "confirmado"); }); }
  function guardarToken(t) {
    if (S.tokens.indexOf(t) === -1) S.tokens.push(t);
    while (S.tokens.length > MAX_TOKENS) S.tokens.shift();
    salvarTokens();
  }
  var buscando = false;
  function atualizarReservas() {
    if (buscando || !S.tokens.length) return Promise.resolve();
    buscando = true;
    var enviados = S.tokens.slice();
    return rpc("lanchonete_meus_pedidos", { p_tokens: enviados }).then(function (r) {
      buscando = false;
      if (r.error || !Array.isArray(r.data)) return;
      var vistos = {};
      r.data.forEach(function (p) {
        var antes = S.pedidos[p.token];
        vistos[p.token] = true; S.pedidos[p.token] = p;
        if (antes && antes.status !== p.status) anunciar("Reserva " + p.numero + ": " + textoEtapa(p) + ".");
      });
      // O servidor esquece reservas antigas; reservas encerradas há tempo saem do aparelho.
      S.tokens = S.tokens.filter(function (t) { if (vistos[t] || enviados.indexOf(t) === -1) return true; delete S.pedidos[t]; return false; });
      salvarTokens();
      pintar(function () { renderPub(); if (S.folha && S.folha.tipo === "status") renderCamada(); });
    });
  }
  function textoEtapa(p) {
    return p.status === "recebido" ? "recebida pela livraria" : p.status === "confirmado" ? "separada, é só buscar" : p.status === "entregue" ? "retirada" : p.status === "cancelado" ? "cancelada" : p.status;
  }

  /* ---------------- desenho ---------------- */
  // Redesenha sem perder o foco (data-k identifica o controle) nem o cursor do campo.
  function pintar(fn) {
    var a = document.activeElement, k = a && a.getAttribute ? a.getAttribute("data-k") : null;
    var sel = a && a.tagName === "INPUT" && a.type !== "search" ? [a.selectionStart, a.selectionEnd] : a && a.type === "search" ? [a.value.length, a.value.length] : null;
    fn();
    if (!k) return;
    var el = document.querySelector('[data-k="' + CSS.escape(k) + '"]');
    if (el && el !== document.activeElement) {
      el.focus({ preventScroll: true });
      if (sel && el.setSelectionRange) { try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* tipo sem seleção */ } }
    }
  }
  function digitando() { var a = document.activeElement; return !!(a && a.matches && a.matches("#camada .campo input")); }
  function tudo() { renderTopo(); renderPub(); renderRodape(); renderBarra(); renderCamada(); }

  function textoSituacao() {
    var s = sit();
    if (s.aberto) return "Aberta agora" + (s.fecha_as ? " · até " + hora(s.fecha_as) : "");
    var p = s.proxima_abertura;
    if (!p) return "Fechada agora";
    var q = p.em_dias === 0 ? "hoje" : p.em_dias === 1 ? "amanhã" : p.em_dias < 7 ? (p.dia === 0 || p.dia === 6 ? "no " : "na ") + DIAS[p.dia] : "em " + ddmm(p.data);
    return "Fechada agora · abre " + q + " às " + hora(p.abre);
  }
  function renderTopo() {
    if (!S.C) return;
    var u = S.C.unidade || {};
    $("#sit").innerHTML = '<p class="topo__sit"><span class="topo__ponto" aria-hidden="true"' + (sit().aberto ? "" : " data-fechada") + "></span>" + esc(textoSituacao()) + "</p>" +
      (u.endereco ? '<p class="topo__end">' + esc(u.endereco) + "</p>" : "");
  }

  function botao(it) {
    var q = qtdItem(it.id), d = disp(it);
    if (d <= 0 && !q) return '<span class="tag">Esgotado</span>';
    if (!pode()) return "";
    if (it.sabores && it.sabores.length)
      return '<button class="mais" type="button" data-act="opcoes" data-id="' + it.id + '" data-k="a-' + it.id + '" aria-label="' + (q ? q + " na reserva. Mudar opções de " : "Escolher opção de ") + esc(it.nome) + '">' + (q ? "<b>" + q + "</b>" : ic("i-plus")) + "</button>";
    if (q)
      return '<div class="passos" role="group" aria-label="' + esc(it.nome) + ' na reserva"><button type="button" data-act="menos" data-id="' + it.id + '" data-k="m-' + it.id + '" aria-label="Tirar um">' + ic("i-minus") +
        "</button><output>" + q + '</output><button type="button" data-act="mais" data-id="' + it.id + '" data-k="p-' + it.id + '" aria-label="Mais um"' + (q >= d ? " disabled" : "") + ">" + ic("i-plus") + "</button></div>";
    return '<button class="mais" type="button" data-act="mais" data-id="' + it.id + '" data-k="a-' + it.id + '" aria-label="Reservar ' + esc(it.nome) + '">' + ic("i-plus") + "</button>";
  }
  function precoHtml(it) {
    var varias = it.sabores && it.sabores.length;
    var por = varias ? Math.min.apply(null, it.sabores.map(function (s) { return preco(it, s.nome); })) : preco(it);
    var de = varias ? Math.min.apply(null, it.sabores.map(function (s) { return s.preco_centavos; })) : it.preco_centavos;
    var faixa = varias && it.sabores.some(function (s) { return preco(it, s.nome) !== por; }) ? "<small>a partir de</small>" : "";
    return faixa + (por < de ? '<s><span class="sr">de </span>' + BRL(de) + '</s><span><span class="sr">por </span>' + BRL(por) + "</span>" : "<span>" + BRL(por) + "</span>");
  }
  function linha(it) {
    var d = disp(it), esg = d <= 0;
    var sub = [it.autor ? esc(it.autor) : "",
      it.sabores && it.sabores.length ? esc(it.sabores.filter(function (s) { return disp(it, s.nome) > 0; }).map(function (s) { return s.nome; }).join(", ") || "Sem opções disponíveis") : "",
      !esg && d <= 2 ? '<span class="pouco">Restam ' + d + "</span>" : ""].filter(Boolean).join(" · ");
    return '<li class="lin"' + (esg ? " data-esgotado" : "") + '><span class="lin__txt"><span class="lin__nm">' + esc(it.nome) + "</span>" + (sub ? '<span class="lin__sub">' + sub + "</span>" : "") +
      '</span><span class="lin__preco">' + precoHtml(it) + "</span>" + botao(it) + "</li>";
  }
  function renderPub() {
    var el = $("#pub");
    el.removeAttribute("aria-busy");
    if (S.carga === "erro") {
      el.innerHTML = '<p class="vazio" role="alert">Não conseguimos abrir o catálogo agora. Confira sua internet.</p><p style="padding:0 1.25rem"><button class="btn btn--borda" type="button" data-act="recarregar">' + ic("i-refresh") + "Tentar de novo</button></p>";
      return;
    }
    if (!S.C) return;
    var u = S.C.unidade || {}, h = "";
    if (u.aviso) h += '<p class="aviso">' + esc(u.aviso) + "</p>";
    if (!pode()) h += '<p class="aviso">As reservas pelo celular estão pausadas agora. Fale com a livraria pelo WhatsApp ou passe lá.</p>';
    var promos = S.C.promocoes || [];
    if (promos.length) h += '<p class="promo">' + ic("i-tag") + "<span>" + promos.slice(0, 2).map(function (p) { return "<b>" + esc(p.nome) + "</b> até " + ddmm(p.ate); }).join(" · ") + (promos.length > 2 ? " · e mais " + (promos.length - 2) : "") + ". Enquanto durar o estoque.</span></p>";
    var minhas = ativas();
    if (minhas.length) h += '<div class="meus">' + minhas.map(function (p) {
      return '<button class="meu" type="button" data-act="status" data-token="' + esc(p.token) + '" data-k="meu-' + p.numero + '">' + ic("i-bag") + "<span>Reserva <b>" + p.numero + "</b> · " + textoEtapa(p) + (p.retirar_ate ? " · até " + quando(p.retirar_ate) : "") + "</span>" + ic("i-right") + "</button>";
    }).join("") + "</div>";
    var cats = S.C.categorias || [];
    h += '<div class="busca"><div class="busca__in"><label class="busca__campo">' + ic("i-search") + '<span class="sr">Buscar título ou autor</span><input type="search" data-act="busca" data-k="busca" placeholder="Buscar título ou autor" value="' + esc(S.busca) + '" autocomplete="off"></label>' +
      (cats.length > 1 ? '<div class="fichas" role="group" aria-label="Grupos">' + [{ id: "todos", nome: "Tudo" }].concat(cats).map(function (c) {
        return '<button class="ficha" type="button" data-act="cat" data-id="' + esc(c.id) + '" data-k="c-' + esc(c.id) + '" aria-pressed="' + (S.cat === c.id) + '">' + esc(c.nome.split(" & ")[0]) + "</button>";
      }).join("") + "</div>" : "") + "</div></div>";
    var t = S.busca.trim().toLocaleLowerCase("pt-BR");
    var lista = (S.C.padrao || []).filter(function (i) { return (S.cat === "todos" || i.categoria_id === S.cat) && (!t || (i.nome + " " + (i.autor || "")).toLocaleLowerCase("pt-BR").indexOf(t) !== -1); });
    var grupos = cats.map(function (c) { return { c: c, l: lista.filter(function (i) { return i.categoria_id === c.id; }) }; }).filter(function (g) { return g.l.length; });
    h += grupos.length ? grupos.map(function (g) {
      return '<section class="grupo" aria-labelledby="g-' + g.c.id + '"><h2 class="grupo__t" id="g-' + g.c.id + '">' + esc(g.c.nome) + "<small>" + g.l.length + "</small></h2><ul>" + g.l.map(linha).join("") + "</ul></section>";
    }).join("") : '<p class="vazio">' + (t ? "Nada com “" + esc(S.busca) + "”. Tente outra palavra ou pergunte à livraria." : "O catálogo está sendo preparado. Volte em breve.") + "</p>";
    el.innerHTML = h;
  }
  function linkWhats(v) { var d = String(v || "").replace(/\D/g, ""); if (d.length < 10) return ""; return "https://wa.me/" + (d.length <= 11 ? "55" + d : d); }
  function renderRodape() {
    if (!S.C) return;
    var u = S.C.unidade || {}, w = linkWhats(u.whatsapp);
    var pag = (u.pagamento || []).join(", ").replace(/, ([^,]*)$/, " e $1");
    var hs = (S.C.horarios || []).filter(function (x) { return x.aberto; });
    $("#rodape").innerHTML = "<p>Reserve aqui, pague e retire na livraria até o dia escolhido." + (pag ? " Pagamento na livraria: " + esc(pag) + "." : "") + "</p>" +
      (hs.length ? "<p>Horário: " + hs.map(function (x) { return DIAS_C[x.dia] + " " + hora(x.abre) + "–" + hora(x.fecha); }).join(" · ") + "</p>" : "") +
      (w ? '<p>Dúvidas: <a href="' + w + '" target="_blank" rel="noopener">WhatsApp da livraria ' + esc(u.whatsapp) + "</a></p>" : "") +
      '<p><a href="https://livrariashalom.org" target="_blank" rel="noopener">Loja online da Livraria Shalom</a></p>';
  }
  function renderBarra() {
    var q = qtdCarrinho();
    $("#barra").innerHTML = !q || !pode() ? "" : '<div class="barra"><span class="barra__txt">' + q + (q === 1 ? " item" : " itens") + " · " + BRL(totalCarrinho()) + '</span><button class="btn btn--claro" type="button" data-act="reservar" data-k="reservar">Reservar</button></div>';
  }

  function folha(titulo, sub, corpo, pe) {
    return '<div class="camada" data-act="fora"><section class="folha" role="dialog" aria-modal="true" aria-labelledby="fT"' + (sub ? ' aria-describedby="fS"' : "") + ' tabindex="-1">' +
      '<header class="folha__topo"><div><h2 id="fT">' + titulo + "</h2>" + (sub ? '<p id="fS">' + sub + "</p>" : "") + "</div>" +
      '<button class="fechar" type="button" data-act="fechar" data-k="fechar" aria-label="Fechar">' + ic("i-x") + "</button></header>" +
      '<div class="folha__corpo">' + corpo + "</div>" + (pe ? '<div class="folha__pe">' + pe + "</div>" : "") + "</section></div>";
  }
  function passos(id, sabor, q, max, k) {
    var dv = sabor ? ' data-v="' + esc(sabor) + '"' : "";
    return '<div class="passos" role="group" aria-label="' + esc(sabor || "Quantidade") + '"><button type="button" data-act="menos" data-id="' + id + '"' + dv + ' data-k="' + k + '-m" aria-label="Tirar um"' + (q ? "" : " disabled") + ">" + ic(q === 1 && k.indexOf("r") === 0 ? "i-trash" : "i-minus") +
      "</button><output>" + q + '</output><button type="button" data-act="mais" data-id="' + id + '"' + dv + ' data-k="' + k + '-p" aria-label="Mais um"' + (q >= max ? " disabled" : "") + ">" + ic("i-plus") + "</button></div>";
  }
  function folhaOpcoes(f) {
    var it = porId(f.id);
    if (!it) return "";
    var corpo = it.sabores.map(function (s, i) {
      var d = disp(it, s.nome), q = noCarrinho(it.id, s.nome);
      return '<div class="linha-res"><span><b>' + esc(s.nome) + "</b> · " + BRL(preco(it, s.nome)) + '<br><span class="nota">' + (d <= 0 ? "Esgotado" : d <= 2 ? "Restam " + d : "Disponível") + "</span></span>" + passos(it.id, s.nome, q, d, "o" + i) + "</div>";
    }).join("");
    return folha(esc(it.nome), "Escolha quantos de cada.", corpo, '<button class="btn btn--az btn--larga" type="button" data-act="fechar" data-k="pronto">Pronto</button>');
  }
  function folhaReserva() {
    var E = S.envio, dias = (S.C && S.C.dias_retirada) || [];
    var corpo = (E.erro ? '<p class="erro" role="alert">' + esc(E.erro) + "</p>" : "") +
      S.carrinho.map(function (l, i) {
        var it = porId(l.id); if (!it) return "";
        var cheio = precoCheio(it, l.sabor), p = preco(it, l.sabor);
        return '<div class="linha-res"><span><b>' + esc(it.nome) + "</b>" + (l.sabor ? " · " + esc(l.sabor) : "") + '<br><span class="nota">' + l.qtd + " × " + (p < cheio ? "<s>" + BRL(cheio) + "</s> " : "") + BRL(p) + "</span></span>" + passos(l.id, l.sabor, l.qtd, Math.min(disp(it, l.sabor), MAX_LINHA), "r" + i) + "</div>";
      }).join("") +
      '<p class="total"><span>Total na livraria</span><span>' + BRL(totalCarrinho()) + "</span></p>" +
      '<div class="campo"><span class="campo__rot" id="rotAte">Vou buscar até</span>' +
      (dias.length ? '<div class="dias" role="radiogroup" aria-labelledby="rotAte">' + dias.map(function (s) {
        var on = S.ate === s;
        return '<button class="dia" type="button" role="radio" data-act="ate" data-s="' + s + '" data-k="d-' + s + '" aria-checked="' + on + '" tabindex="' + (on ? "0" : "-1") + '">' + rotDia(s) + "</button>";
      }).join("") + "</div>" : '<p class="erro">A livraria não tem dia aberto nos próximos dias. Fale com ela pelo WhatsApp.</p>') +
      '<p class="nota">Se não der para buscar até lá, a reserva vence sozinha e o item volta para a prateleira.</p></div>' +
      campo("nome", "fNome", "Seu nome", "given-name", "text", "") +
      campo("tel", "fTel", "Telefone com DDD", "tel", "tel", "(61) 99999-9999") +
      '<div class="isca" aria-hidden="true"><label for="fSite">Site</label><input id="fSite" tabindex="-1" autocomplete="off"></div>' +
      '<p class="nota">Usamos nome e telefone só para esta reserva.' + (ler(CHAVE.cliente, null) ? ' <button class="btn--link" type="button" data-act="esquecer">Apagar deste aparelho</button>' : "") + "</p>";
    var pe = !S.carrinho.length ? '<button class="btn btn--az btn--larga" type="button" data-act="fechar" data-k="ok">Voltar ao catálogo</button>'
      : '<button class="btn btn--az btn--larga" type="button" data-act="enviar" data-k="enviar"' + (E.enviando || !dias.length ? " disabled" : "") + ">" + (E.enviando ? "Enviando…" : "Reservar · " + BRL(totalCarrinho())) + "</button>";
    return folha("Sua reserva", "Pague e retire na livraria até o dia que escolher.", corpo, pe);
  }
  function campo(c, id, rot, auto, tipo, ph) {
    var erro = S.envio.campos[c];
    return '<div class="campo"><label for="' + id + '">' + rot + '</label><input id="' + id + '" data-campo="' + c + '" data-k="' + id + '" autocomplete="' + auto + '"' + (tipo === "tel" ? ' inputmode="tel"' : "") +
      (ph ? ' placeholder="' + ph + '"' : "") + ' value="' + esc(S.form[c] || "") + '"' + (erro ? ' aria-invalid="true" aria-describedby="' + id + '-e"' : "") + ">" +
      (erro ? '<p class="campo__erro" id="' + id + '-e">' + esc(erro) + "</p>" : "") + "</div>";
  }
  function folhaStatus(f) {
    var p = S.pedidos[f.token];
    if (!p) return "";
    var cancelada = p.status === "cancelado", k = ["recebido", "confirmado", "entregue"].indexOf(p.status);
    var w = linkWhats(S.C && S.C.unidade && S.C.unidade.whatsapp);
    var corpo = (f.aviso ? '<p class="aviso" style="margin:0">' + esc(f.aviso) + "</p>" : "") +
      '<p class="cod" aria-label="Número ' + p.numero + '">' + p.numero + '</p><p class="nota">Diga seu nome e este número no balcão.</p>' +
      (!cancelada && p.status !== "entregue" ? '<p class="nota"><b>' + (p.pago ? "Pagamento recebido" : "Pagamento na livraria") + "</b>" + (p.pago ? " · é só buscar" : "") + "</p>" : "") +
      (cancelada ? "" : '<ol class="etapas" aria-label="Situação da reserva">' + ["Recebida pela livraria", "Separada · é só buscar", "Retirada"].map(function (t, i) {
        return '<li class="etapa"' + (i <= k ? " data-feito" : "") + '><span class="etapa__m">' + (i + 1) + "</span>" + t + (i === k ? '<span class="sr"> (agora)</span>' : "") + "</li>";
      }).join("") + "</ol>") +
      "<div>" + (p.itens || []).map(function (x) { return '<div class="linha-res"><span>' + x.quantidade + " × " + esc(x.nome) + (x.sabor ? " · " + esc(x.sabor) : "") + "</span><span>" + BRL(x.preco_centavos * x.quantidade) + "</span></div>"; }).join("") +
      '<p class="total" style="margin-top:.6rem"><span>Total</span><span>' + BRL(p.total_centavos) + "</span></p></div>";
    var pe = (w ? '<a class="btn btn--borda btn--larga" href="' + w + '" target="_blank" rel="noopener">' + ic("i-chat") + "Falar com a livraria no WhatsApp</a>" : "") +
      '<button class="btn btn--az btn--larga" type="button" data-act="fechar" data-k="ok">Voltar ao catálogo</button>';
    var sub = cancelada ? esc(p.motivo ? "Motivo: " + p.motivo : "A livraria cancelou esta reserva.") : p.status === "entregue" ? "Retirada. Obrigado!" : p.retirar_ate ? "Pague e retire na livraria até " + quando(p.retirar_ate) + "." : "";
    return folha(cancelada ? "Reserva cancelada" : "Reserva " + p.numero, sub, corpo, pe);
  }
  function renderCamada() {
    var L = $("#camada"), f = S.folha;
    if (!f) { L.innerHTML = ""; return; }
    var jaAberta = !!L.querySelector(".folha");
    L.innerHTML = f.tipo === "opcoes" ? folhaOpcoes(f) : f.tipo === "reserva" ? folhaReserva() : folhaStatus(f);
    var fo = L.querySelector(".folha");
    if (!fo) { fecharFolha(); return; }
    if (jaAberta) fo.classList.add("folha--fixa");
    if (!L.contains(document.activeElement)) fo.focus({ preventScroll: true });
  }
  function abrirFolha(f, opener) {
    S.folha = f; S.abriu = opener || null;
    document.body.classList.add("travado");
    $("#app").inert = true; $("#barra").inert = true;
    renderCamada();
  }
  function fecharFolha() {
    var k = S.abriu;
    S.folha = null;
    document.body.classList.remove("travado");
    $("#app").inert = false; $("#barra").inert = false;
    pintar(function () { renderCamada(); renderPub(); renderBarra(); });
    var el = k ? document.querySelector('[data-k="' + CSS.escape(k) + '"]') : null;
    (el || $("#conteudo")).focus({ preventScroll: true });
  }

  /* ---------------- carrinho ---------------- */
  function mudar(id, sabor, delta) {
    var it = porId(id); if (!it) return;
    var l = linhaDe(id, sabor), q = (l ? l.qtd : 0) + delta;
    if (delta > 0 && (q > disp(it, sabor) || q > MAX_LINHA || qtdCarrinho() >= MAX_TOTAL)) { anunciar(q > disp(it, sabor) ? "Não há mais no estoque." : "Limite da reserva pelo celular atingido."); return; }
    if (!l && q > 0) S.carrinho.push({ id: id, sabor: sabor || null, qtd: q, nome: it.nome });
    else if (l && q <= 0) S.carrinho.splice(S.carrinho.indexOf(l), 1);
    else if (l) l.qtd = q;
    salvarCarrinho();
    S.envio.erro = "";
    var nq = qtdCarrinho();
    anunciar(it.nome + (sabor ? " " + sabor : "") + ": " + Math.max(q, 0) + ". " + (nq ? nq + (nq === 1 ? " item" : " itens") + ", total " + BRL(totalCarrinho()) + "." : "Reserva vazia."));
    if (S.folha && S.folha.tipo === "reserva" && !nq) { fecharFolha(); return; }
    pintar(function () { renderPub(); renderBarra(); if (S.folha) renderCamada(); });
    if (q <= 0 && !S.folha) { var b = document.querySelector('[data-k="a-' + id + '"]'); if (b) b.focus(); }
  }

  /* ---------------- envio ---------------- */
  function enviar() {
    var E = S.envio;
    if (E.enviando || !S.carrinho.length) return;
    var nome = String(S.form.nome || "").trim(), tel = String(S.form.tel || "").replace(/\D/g, "");
    E.campos = {}; E.erro = "";
    if (nome.length < 2) E.campos.nome = "Escreva seu nome para a livraria achar sua reserva.";
    if (tel.length < 10 || tel.length > 11) E.campos.tel = "Confira o telefone: são 10 ou 11 números, com DDD.";
    if (!S.ate) E.erro = "Escolha até que dia vai buscar.";
    if (E.campos.nome || E.campos.tel || E.erro) { pintar(renderCamada); var c = $(E.campos.nome ? "#fNome" : E.campos.tel ? "#fTel" : ".erro"); if (c && c.focus) c.focus(); return; }
    if (!E.idem) E.idem = chaveAleatoria();     // uma chave por tentativa; reusada no "tentar de novo"
    var isca = $("#fSite");
    E.enviando = true;
    pintar(renderCamada);
    rpc("lanchonete_criar_pedido", { p: {
      unidade: UNIDADE, nome: nome, telefone: tel, retirar_ate: S.ate, idempotencia: E.idem, site: isca ? isca.value : "",
      itens: S.carrinho.map(function (l) { var x = { item_id: l.id, quantidade: l.qtd }; if (l.sabor) x.sabor = l.sabor; return x; })
    } }).then(function (r) {
      E.enviando = false;
      if (r.error || !r.data) { erroNoEnvio(r.error); return; }
      var p = r.data;
      E.idem = null; E.erro = ""; E.campos = {};
      S.form = { nome: nome, tel: fmtTel(tel) }; gravar(CHAVE.cliente, S.form);
      S.pedidos[p.token] = p; guardarToken(p.token);
      S.carrinho = []; salvarCarrinho();
      S.folha = { tipo: "status", token: p.token, aviso: p.repetido ? "Esta reserva já tinha chegado. Nada foi enviado em dobro." : "" };
      S.abriu = "meu-" + p.numero;
      tudo();
      var f = $(".folha"); if (f) f.focus();
      anunciar("Reserva feita. Número " + p.numero + ". Pague e retire até " + quando(p.retirar_ate) + ".");
      carregar(true);   // o estoque mudou
    });
  }
  function erroNoEnvio(err) {
    var E = S.envio;
    if (!erroDeRegra(err)) { E.erro = FALHA_REDE; pintar(renderCamada); return; }   // pode ter chegado: mantém a chave
    E.idem = null;                                                                    // recusada: nada gravado
    var cod = err.message, hint = err.hint || "Não foi possível fazer a reserva.";
    if (cod === "NOME_INVALIDO" || cod === "TELEFONE_INVALIDO") {
      E.campos[cod === "NOME_INVALIDO" ? "nome" : "tel"] = hint;
      pintar(renderCamada); var c = $(cod === "NOME_INVALIDO" ? "#fNome" : "#fTel"); if (c) c.focus(); return;
    }
    E.erro = hint;
    // Estoque, catálogo ou dia de retirada mudaram: recarrega e ajusta a reserva.
    carregar(true).then(function () { E.erro = E.erro || hint; pintar(renderCamada); });
    pintar(renderCamada);
  }

  /* ---------------- eventos ---------------- */
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act]");
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-act"), id = b.getAttribute("data-id"), v = b.getAttribute("data-v");
    switch (a) {
      case "fora": if (ev.target === b) fecharFolha(); break;
      case "fechar": fecharFolha(); break;
      case "recarregar": S.carga = "carregando"; $("#pub").innerHTML = '<p class="vazio" role="status">Carregando…</p>'; carregar(); break;
      case "cat": S.cat = id; pintar(renderPub); break;
      case "mais": mudar(id, v, 1); break;
      case "menos": mudar(id, v, -1); break;
      case "opcoes": abrirFolha({ tipo: "opcoes", id: id }, b.getAttribute("data-k")); break;
      case "reservar": S.envio.erro = ""; abrirFolha({ tipo: "reserva" }, "reservar"); break;
      case "ate": S.ate = b.getAttribute("data-s"); pintar(renderCamada); break;
      case "enviar": enviar(); break;
      case "status": abrirFolha({ tipo: "status", token: b.getAttribute("data-token") }, b.getAttribute("data-k")); break;
      case "esquecer": gravar(CHAVE.cliente, null); S.form = { nome: "", tel: "" }; pintar(renderCamada); anunciar("Nome e telefone apagados deste aparelho."); var n = $("#fNome"); if (n) n.focus(); break;
    }
  });
  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.getAttribute("data-act") === "busca") { S.busca = t.value; pintar(renderPub); return; }
    var c = t.getAttribute("data-campo");
    if (!c) return;
    if (c === "tel") { var f = fmtTel(t.value); if (f !== t.value) t.value = f; }
    S.form[c] = t.value;
    if (S.envio.campos[c]) { delete S.envio.campos[c]; t.removeAttribute("aria-invalid"); var e = t.parentNode.querySelector(".campo__erro"); if (e) e.remove(); }
  });
  document.addEventListener("keydown", function (ev) {
    if (!S.folha) return;
    if (ev.key === "Escape") { ev.preventDefault(); fecharFolha(); return; }
    if (ev.key === "Enter" && ev.target.matches(".campo input")) { ev.preventDefault(); enviar(); return; }
    // Setas trocam o dia de retirada (padrão de radiogroup).
    if (ev.target.matches(".dia") && /^Arrow/.test(ev.key)) {
      ev.preventDefault();
      var dias = S.C.dias_retirada, i = dias.indexOf(S.ate) + (ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : -1);
      S.ate = dias[(i + dias.length) % dias.length];
      renderCamada(); var d = $('[data-k="d-' + S.ate + '"]'); if (d) d.focus();
      return;
    }
    if (ev.key === "Tab") {
      var f = Array.prototype.filter.call(document.querySelectorAll("#camada button:not([disabled]):not([tabindex='-1']), #camada input:not([tabindex='-1']), #camada a[href]"), function (el) { return el.offsetParent !== null; });
      if (!f.length) { ev.preventDefault(); return; }
      var pri = f[0], ult = f[f.length - 1];
      if (!$("#camada").contains(document.activeElement)) { ev.preventDefault(); pri.focus(); }
      else if (ev.shiftKey && (document.activeElement === pri || document.activeElement === $(".folha"))) { ev.preventDefault(); ult.focus(); }
      else if (!ev.shiftKey && document.activeElement === ult) { ev.preventDefault(); pri.focus(); }
    }
  });

  /* ---------------- ciclo de vida ---------------- */
  setInterval(function () { if (document.visibilityState === "visible" && ativas().length) atualizarReservas(); }, ACOMPANHAR_MS);
  setInterval(function () { if (document.visibilityState === "visible" && S.carga === "ok") carregar(true); }, RECARREGAR_MS);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") { atualizarReservas(); carregar(true); } });

  if (!cliente()) { S.carga = "erro"; pintar(tudo); }
  else Promise.all([carregar(), atualizarReservas()]).then(function () { pintar(function () { renderPub(); }); });
})();
