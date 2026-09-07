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
     .loadSchedules()  -> Promise<Object|undefined|null>
     .loadSetting(key) -> Promise<any|undefined|null>  (settings.value, por chave)
     .loadHome()       -> Promise<Object|undefined|null>  (settings key "home": capa)
   O banco é a única fonte de dados — não há mais fallback local em data.js.
   loadSchedules/loadSetting/loadHome devolvem undefined quando não dá para
   carregar (sem cliente configurado ou erro na consulta) e null quando a
   consulta funcionou mas não existe linha para esse site/chave; cada página
   trata os dois casos de forma diferente (erro honesto x "a confirmar").
   loadEvents()/loadEvent() (normalmente sobrescritos por <site>/js/events.js)
   devolvem [] / null nesses mesmos casos.
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

  function fallbackEvents() { return []; }

  function loadEvents() {
    var c = client();
    if (!c) return Promise.resolve(fallbackEvents());
    var now = new Date().toISOString();
    return c.from("events").select("*").eq("site", SITE).eq("published", true)
      .or("publish_at.is.null,publish_at.lte." + now)
      .or("unpublish_at.is.null,unpublish_at.gt." + now)
      .order("position", { ascending: true })
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data.map(mapEvent);
      })
      .catch(function () { return []; });
  }

  function loadEvent(slug) {
    var c = client();
    if (!c) return Promise.resolve(null);
    return c.from("events").select("*").eq("site", SITE).eq("slug", slug).limit(1)
      .then(function (res) {
        if (res.error || !res.data || !res.data.length) return null;
        return mapEvent(res.data[0]);
      })
      .catch(function () { return null; });
  }

  function loadSchedules() {
    var c = client();
    if (!c) return Promise.resolve(undefined);
    return c.from("settings").select("value").eq("site", SITE).eq("key", "schedules").limit(1)
      .then(function (res) {
        if (res.error) return undefined;
        if (!res.data || !res.data.length) return null;
        return res.data[0].value || null;
      })
      .catch(function () { return undefined; });
  }

  function loadSetting(key) {
    var c = client();
    if (!c) return Promise.resolve(undefined);
    return c.from("settings").select("value").eq("site", SITE).eq("key", key).limit(1)
      .then(function (res) {
        if (res.error) return undefined;
        if (!res.data || !res.data.length) return null;
        return res.data[0].value || null;
      })
      .catch(function () { return undefined; });
  }
  function loadHome() { return loadSetting("home"); }

  return {
    ready: configured,
    site: SITE,
    client: client,
    loadEvents: loadEvents,
    loadEvent: loadEvent,
    loadSchedules: loadSchedules,
    loadSetting: loadSetting,
    loadHome: loadHome
  };
})();
