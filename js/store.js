/* =====================================================================
   SHALOM — camada de dados compartilhada (Supabase, com escopo por site)
   ---------------------------------------------------------------------
   A página define window.SHALOM_SITE (ex.: "asasul", "taguatinga", ...)
   antes de carregar este script. Todo o conteúdo é filtrado por esse site.

   window.SHALOM:
     .ready            -> true se o Supabase está configurado
     .site             -> id do site atual
     .client()         -> cliente Supabase (ou null)
     .loadEvents()     -> Promise<Array>  (formato dos cards, só do site)
     .loadEvent(slug)  -> Promise<Object|null>
     .loadSchedules()  -> Promise<Object|null>
   Sem Supabase (ou em falha), cai para os dados locais da página
   (window.SHALOM_EVENTOS / window.SHALOM_SCHEDULES do data.js).
   ===================================================================== */
window.SHALOM = (function () {
  "use strict";

  var SITE = window.SHALOM_SITE || "asasul";
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

  function mapEvent(row) {
    return {
      id: row.slug,
      titulo: row.title || "",
      badge: row.badge || "",
      data: row.date_text || "",
      local: row.location || "",
      imagem: row.image_url || "",
      resumo: row.summary || "",
      descricao: row.description || "",
      descricaoHtml: true,
      link: row.link_url ? { texto: row.link_text || "Saiba mais", url: row.link_url } : null,
      acao: "Saiba mais"
    };
  }

  function fallbackEvents() { return (window.SHALOM_EVENTOS || []).slice(); }

  function loadEvents() {
    var c = client();
    if (!c) return Promise.resolve(fallbackEvents());
    return c.from("events").select("*").eq("site", SITE).eq("published", true).order("position", { ascending: true })
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return fallbackEvents();
        return res.data.map(mapEvent);
      })
      .catch(function () { return fallbackEvents(); });
  }

  function loadEvent(slug) {
    var c = client();
    var local = function () { return fallbackEvents().filter(function (e) { return e.id === slug; })[0] || null; };
    if (!c) return Promise.resolve(local());
    return c.from("events").select("*").eq("site", SITE).eq("slug", slug).limit(1)
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return local();
        return mapEvent(res.data[0]);
      })
      .catch(local);
  }

  function loadSchedules() {
    var c = client();
    if (!c) return Promise.resolve(null);
    return c.from("settings").select("value").eq("site", SITE).eq("key", "schedules").limit(1)
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return null;
        return res.data[0].value || null;
      })
      .catch(function () { return null; });
  }

  return {
    ready: configured,
    site: SITE,
    client: client,
    loadEvents: loadEvents,
    loadEvent: loadEvent,
    loadSchedules: loadSchedules
  };
})();
