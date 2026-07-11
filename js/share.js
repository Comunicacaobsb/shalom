/* =====================================================================
   Compartilhar evento — window.shareEvent(slug, titulo)
   Compartilhada por todo o repositório. Usa a API nativa (mobile) ou
   copia o link (desktop). O link aponta para a página estática do evento
   (<pagina>/e/<slug>/), que tem a og:image do evento "assada" no HTML.
   Funciona em qualquer página (deriva a URL do location atual).
   ===================================================================== */
(function () {
  "use strict";

  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.className = "toast-mini"; t.id = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  function eventUrl(slug) {
    var dir = location.origin + location.pathname.replace(/[^\/]*$/, "");
    dir = dir.replace(/e\/[^\/]+\/$/, ""); // se já estiver dentro de /e/<slug>/, sobe um nível
    return dir + "e/" + encodeURIComponent(slug) + "/";
  }

  window.shareEvent = function (slug, titulo) {
    var url = eventUrl(slug);
    var data = { title: (titulo || "Evento") + " — Comunidade Shalom", text: titulo || "", url: url };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { toast("Link copiado!"); }, function () { window.prompt("Copie o link:", url); });
      return;
    }
    window.prompt("Copie o link:", url);
  };
})();
