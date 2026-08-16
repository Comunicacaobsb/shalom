/*
 * Fonte de eventos da Asa Sul.
 *
 * O painel e a página pública usam a mesma tabela `events`. Este adaptador
 * mantém o fallback local somente quando o Supabase está indisponível; uma
 * resposta válida vazia também é respeitada, para que um evento excluído no
 * painel não reapareça por causa do js/data.js.
 */
(function () {
  "use strict";
  var api = window.SHALOM;
  if (!api) return;

  var fallbackEvents = function () { return (window.SHALOM_EVENTOS || []).slice(); };
  var site = api.site || window.SHALOM_SITE || "asasul";

  function active(row, now) {
    if (row && row.published === false) return false;
    var from = row && (row.publish_at || row.published_at || row.starts_at ||
      row.start_at || row.visible_from || row.available_from || row.schedule_start ||
      row.publish_on);
    var until = row && (row.unpublish_at || row.unpublished_at || row.ends_at ||
      row.end_at || row.visible_until || row.available_until || row.schedule_end ||
      row.unpublish_on);
    var fromTime = from ? Date.parse(from) : NaN;
    var untilTime = until ? Date.parse(until) : NaN;
    return (!Number.isFinite(fromTime) || now >= fromTime) &&
      (!Number.isFinite(untilTime) || now < untilTime);
  }

  function map(row) {
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

  function db() {
    try { return api.client && api.client(); } catch (e) { return null; }
  }

  function rowsQuery(singleSlug) {
    var c = db();
    if (!c) return null;
    var q = c.from("events").select("*").eq("site", site);
    if (singleSlug) q = q.eq("slug", singleSlug).limit(1);
    else q = q.order("position", { ascending: true });
    return q;
  }

  api.loadEvents = function () {
    var q = rowsQuery();
    if (!q) return Promise.resolve(fallbackEvents().filter(function (e) { return active(e, Date.now()); }));
    return q.then(function (res) {
      if (res.error) return fallbackEvents().filter(function (e) { return active(e, Date.now()); });
      var now = Date.now();
      return (res.data || []).filter(function (row) { return active(row, now); }).map(map);
    }).catch(function () {
      return fallbackEvents().filter(function (e) { return active(e, Date.now()); });
    });
  };

  api.loadEvent = function (slug) {
    var q = rowsQuery(slug);
    var local = function () {
      return fallbackEvents().filter(function (e) { return e.id === slug && active(e, Date.now()); })[0] || null;
    };
    if (!q) return Promise.resolve(local());
    return q.then(function (res) {
      if (res.error) return local();
      var row = (res.data || [])[0];
      return row && active(row, Date.now()) ? map(row) : null;
    }).catch(local);
  };
})();
