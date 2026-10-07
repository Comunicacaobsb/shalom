/*
 * Fonte de eventos de Santa Maria (Supabase, tabela `events`).
 *
 * O painel e a página pública usam a mesma tabela. Sem fallback local: sem
 * cliente configurado ou em erro, loadEvents devolve [] (a página esconde a
 * seção de eventos) e loadEvent devolve null (a página mostra "não encontrado").
 */
(function () {
  "use strict";
  var api = window.SHALOM;
  if (!api) return;

  var site = api.site || window.SHALOM_SITE || "santamaria";

  function active(row, now) {
    if (row && row.published === false) return false;
    if (api.eventPublic && !api.eventPublic(row)) return false;
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
      link: api.eventLink ? api.eventLink(row)
        : (row.link_url ? { texto: row.link_text || "Saiba mais", url: row.link_url } : null),
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
    if (!q) return Promise.resolve([]);
    return q.then(function (res) {
      if (res.error) return [];
      var now = Date.now();
      return (res.data || []).filter(function (row) { return active(row, now); }).map(map);
    }).catch(function () { return []; });
  };

  api.loadEvent = function (slug) {
    if (!slug) return Promise.resolve(null);
    var q = rowsQuery(slug);
    if (!q) return Promise.resolve(null);
    return q.then(function (res) {
      if (res.error) return null;
      var row = (res.data || [])[0];
      return row && active(row, Date.now()) ? map(row) : null;
    }).catch(function () { return null; });
  };
})();
