/* =====================================================================
   /sh82/ · hub das Lanchonetes Shalom | SH82 (26/10/2026)
   Lista as lanchonetes dos centros de evangelização e os eventos que ainda
   não terminaram (public.lanchonete_unidades_publicas), com a situação de
   agora. Cada cartão leva ao cardápio em /sh82/<lanchonete>/.
   ===================================================================== */
(function () {
  "use strict";
  var DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ddmm(s) { s = String(s); return s.slice(8, 10) + "/" + s.slice(5, 7); }
  function hora(h) { var p = String(h).split(":"); return Number(p[0]) + "h" + (p[1] && p[1] !== "00" ? p[1] : ""); }
  function luminancia(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(String(hex).slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function situacao(s) {
    if (!s) return "";
    if (s.aberto) return "Aberta agora" + (s.fecha_as ? " · até " + hora(s.fecha_as) : "");
    var p = s.proxima_abertura;
    if (!p) return "Fechada agora";
    var quando = p.em_dias === 0 ? "hoje" : p.em_dias === 1 ? "amanhã" : p.em_dias < 7 ? (p.dia === 0 || p.dia === 6 ? "no " : "na ") + DIAS[p.dia] : "em " + ddmm(p.data);
    return "Abre " + quando + " às " + hora(p.abre);
  }
  function configuracao() {
    var cfg = window.SHALOM_SUPABASE || {};
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      try { var dev = JSON.parse(localStorage.getItem("sh82_supabase_dev") || "null"); if (dev && dev.url && dev.anonKey) cfg = dev; } catch (e) { /* sem armazenamento */ }
    }
    return cfg;
  }
  function cartao(u) {
    var href = String(u.id) + "/";
    var sit = '<span class="hub__sit" data-aberto="' + (u.situacao && u.situacao.aberto ? "sim" : "nao") + '">' + esc(situacao(u.situacao)) + "</span>";
    var seta = '<svg class="ic" aria-hidden="true" focusable="false"><use href="#i-right"/></svg>';
    if (u.tipo !== "evento")
      return '<a class="hub__card" href="' + esc(href) + '"><span class="hub__txt"><span class="hub__nome">' + esc(u.marca) + " · " + esc(u.local) + "</span>" + sit + "</span>" + seta + "</a>";
    var claro = luminancia(u.cor_fundo) > 0.18;
    var estilo = "--ev-cor:" + u.cor + ";--ev-fundo:" + u.cor_fundo + ";--ev-texto:" + (claro ? "color-mix(in srgb," + u.cor + ",#000 55%)" : "#F4F1EA");
    return '<a class="hub__card hub__card--evento" style="' + esc(estilo) + '" href="' + esc(href) + '"><span class="hub__txt"><span class="hub__nome">' + esc(u.marca) +
      "</span><span class=\"hub__sit\">" + esc(ddmm(u.inicio) + " a " + ddmm(u.fim) + (u.local ? " · " + u.local : "")) + "</span>" + sit + "</span>" + seta + "</a>";
  }
  function pintar(lista) {
    var host = document.getElementById("hub");
    host.removeAttribute("aria-busy");
    var cevs = lista.filter(function (u) { return u.tipo !== "evento"; }), eventos = lista.filter(function (u) { return u.tipo === "evento"; });
    var h = '<section class="sec" aria-labelledby="hCevs"><h2 class="h" id="hCevs">Nos centros de evangelização</h2><div class="hub">' + cevs.map(cartao).join("") + "</div></section>";
    if (eventos.length) h += '<section class="sec" aria-labelledby="hEv"><h2 class="h" id="hEv">Em eventos</h2><div class="hub">' + eventos.map(cartao).join("") + "</div></section>";
    host.innerHTML = h;
  }
  function falhar() {
    var host = document.getElementById("hub");
    host.removeAttribute("aria-busy");
    host.innerHTML = '<section class="sec"><p class="falha-carga" role="alert">Não conseguimos carregar as lanchonetes agora. Confira sua internet e recarregue a página.</p></section>';
  }
  var cfg = configuracao();
  if (!cfg.url || !cfg.anonKey || !window.supabase) return falhar();
  window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    .rpc("lanchonete_unidades_publicas").then(function (r) { if (r.error || !Array.isArray(r.data)) falhar(); else pintar(r.data); }, falhar);
})();
