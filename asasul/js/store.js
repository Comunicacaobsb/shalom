/* =====================================================================
   SHALOM — camada de dados (Supabase com fallback estático)
   ---------------------------------------------------------------------
   Expõe window.SHALOM com:
     .ready            -> true se o Supabase está configurado
     .client()         -> cliente Supabase (ou null)
     .loadEvents()     -> Promise<Array>  (formato dos cards)
     .loadEvent(slug)  -> Promise<Object|null>
     .loadSchedules()  -> Promise<Object|null>  {funcionamento:[], missa:[], ...}
   Se o Supabase não estiver configurado ou falhar, cai para js/data.js.
   ===================================================================== */
window.SHALOM = (function () {
  "use strict";

  var cfg = window.SHALOM_SUPABASE || {};
  var configured =
    cfg.url && cfg.anonKey &&
    cfg.url.indexOf("http") === 0 &&
    cfg.url.indexOf("COLE_AQUI") === -1 &&
    cfg.anonKey.indexOf("COLE_AQUI") === -1;

  var _client = null;
  function client() {
    if (!configured) return null;
    if (_client) return _client;
    if (!window.supabase || !window.supabase.createClient) return null;
    _client = window.supabase.createClient(cfg.url, cfg.anonKey);
    return _client;
  }

  // Converte uma linha do banco no formato usado pelos cards/página
  function mapEvent(row) {
    return {
      id: row.slug,
      titulo: row.title || "",
      badge: row.badge || "",
      data: row.date_text || "",
      local: row.location || "",
      imagem: row.image_url || "",
      resumo: row.summary || "",
      descricao: row.description || "",       // HTML (editor rico)
      descricaoHtml: true,
      link: row.link_url ? { texto: row.link_text || "Saiba mais", url: row.link_url } : null,
      acao: "Saiba mais"
    };
  }

  function fallbackEvents() { return (window.SHALOM_EVENTOS || []).slice(); }

  function loadEvents() {
    var c = client();
    if (!c) return Promise.resolve(fallbackEvents());
    return c.from("events").select("*").eq("published", true).order("position", { ascending: true })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return fallbackEvents();
        return res.data.map(mapEvent);
      })
      .catch(function () { return fallbackEvents(); });
  }

  function loadEvent(slug) {
    var c = client();
    if (!c) {
      var f = fallbackEvents().filter(function (e) { return e.id === slug; })[0];
      return Promise.resolve(f || null);
    }
    return c.from("events").select("*").eq("slug", slug).limit(1)
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) {
          var f = fallbackEvents().filter(function (e) { return e.id === slug; })[0];
          return f || null;
        }
        return mapEvent(res.data[0]);
      })
      .catch(function () {
        var f = fallbackEvents().filter(function (e) { return e.id === slug; })[0];
        return f || null;
      });
  }

  function loadSchedules() {
    var c = client();
    if (!c) return Promise.resolve(null);
    return c.from("settings").select("value").eq("key", "schedules").limit(1)
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return null;
        return res.data[0].value || null;
      })
      .catch(function () { return null; });
  }

  return {
    ready: configured,
    client: client,
    loadEvents: loadEvents,
    loadEvent: loadEvent,
    loadSchedules: loadSchedules
  };
})();
