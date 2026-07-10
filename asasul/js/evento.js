/* =====================================================================
   Página de detalhe do evento — carrega por slug do Supabase
   (com fallback para js/data.js) e monta o conteúdo.
   ===================================================================== */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" })[c]; }); }

  var id = new URLSearchParams(location.search).get("id");
  var root = $("#evRoot");

  function missing() {
    document.title = "Evento não encontrado — Shalom Asa Sul";
    root.innerHTML =
      '<div class="ev-missing"><h1>Evento não encontrado</h1>' +
      '<p style="color:var(--ink-soft);margin:.8rem 0 1.6rem">Este evento pode ter sido removido ou o link está incorreto.</p>' +
      '<a class="btn btn--primary" href="index.html#eventos">Ver todos os eventos</a></div>';
  }

  function render(ev) {
    if (!ev) { missing(); return; }
    document.title = ev.titulo + " — Shalom Asa Sul";

    var fallback = '<div class="poster-fallback"><div><h4>' + esc(ev.titulo) + '</h4></div></div>';
    var poster = ev.imagem
      ? '<img src="' + esc(ev.imagem) + '" alt="' + esc(ev.titulo) + '" onerror="var p=this.parentElement;this.style.display=\'none\';p.insertAdjacentHTML(\'beforeend\', this.dataset.fb)" data-fb="' + esc(fallback).replace(/"/g, "&quot;") + '">'
      : fallback;

    var iconCal = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>';
    var iconPin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>';

    // descrição: HTML (editor rico do painel) ou texto simples (data.js)
    var descHTML;
    if (ev.descricaoHtml) {
      descHTML = ev.descricao || "";
    } else {
      descHTML = String(ev.descricao || ev.resumo || "").split(/\n{2,}/).map(function (p) {
        var t = esc(p).replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
        return "<p>" + t + "</p>";
      }).join("");
    }

    var extLink = ev.link ? '<a class="btn btn--primary" href="' + esc(ev.link.url) + '" target="_blank" rel="noopener">' + esc(ev.link.texto) + '</a>' : "";

    root.innerHTML =
      '<div class="ev-grid">' +
        '<div class="ev-poster">' + poster + '</div>' +
        '<div>' +
          (ev.badge ? '<span class="ev-badge">' + esc(ev.badge) + '</span>' : "") +
          '<h1>' + esc(ev.titulo) + '</h1>' +
          '<div class="ev-meta">' +
            (ev.data  ? '<span class="item">' + iconCal + esc(ev.data) + '</span>' : "") +
            (ev.local ? '<span class="item">' + iconPin + esc(ev.local) + '</span>' : "") +
          '</div>' +
          '<div class="ev-desc">' + descHTML + '</div>' +
          '<div class="ev-actions">' + extLink +
            '<a class="btn btn--ghost" href="index.html#eventos">Ver outros eventos</a>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  if (window.SHALOM && SHALOM.loadEvent) {
    SHALOM.loadEvent(id).then(render).catch(missing);
  } else {
    var f = (window.SHALOM_EVENTOS || []).filter(function (e) { return e.id === id; })[0];
    render(f || null);
  }
})();
