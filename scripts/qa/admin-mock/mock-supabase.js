/* =====================================================================
   Mock do Supabase para testar o painel /admin/ sem credenciais.
   ---------------------------------------------------------------------
   Este arquivo é servido NO LUGAR do bundle @supabase/supabase-js@2
   (o run.mjs intercepta a URL do CDN). Ele expõe o mesmo contrato que o
   admin.js usa: window.supabase.createClient(url, key) devolvendo
   { auth, from, storage }.

   Nada aqui toca o Supabase real: as tabelas vivem em memória e ficam
   visíveis em window.__mockDB para o teste inspecionar o que seria gravado.
   ===================================================================== */
(function (global) {
  "use strict";

  var MASTER = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "editor@example.test",
    display_name: "Editor de Teste"
  };

  // ---- tabelas iniciais (espelham o estado real antes desta rodada) ----
  function seed() {
    return {
      sites: [
        { id: "asasul", name: "Shalom Asa Sul" },
        { id: "taguatinga", name: "Shalom Taguatinga" },
        { id: "santamaria", name: "Shalom Santa Maria" },
        { id: "sh82cafe", name: "SH-82 Café" }
      ],
      profiles: [
        { id: MASTER.id, email: MASTER.email, display_name: MASTER.display_name, avatar_url: null, is_master: true, created_at: "2026-01-01T12:00:00.000Z" }
      ],
      page_permissions: [],
      settings: [
        {
          site: "asasul", key: "schedules", updated_at: "2026-08-16T18:00:00.000Z",
          value: {
            funcionamento: ["Segunda a sábado: 14h às 22h"],
            missa: ["Segunda e sexta: 18h", "Sábado e domingo: 17h", "2ª terça: Missa pelas Famílias", "4ª quinta: Missa da Misericórdia"],
            grupos: ["Casais: terça às 20h", "Amare (aberto): quinta às 19h30", "Kyrios (16 a 23 anos): sábado às 15h"],
            adoracao: ["Capela Kyrios — Santíssimo exposto 24 horas"],
            servicos: ["Quarta: 19h30 às 21h", "Sexta: 17h", "Sábado: 16h", "Domingo: após a missa das 17h"],
            aconselhamento: ["Quinta: 14h30 às 21h", "Ou agende pelo link: https://forms.gle/fnbLoKrEtNMw5D5y8"]
          }
        }
      ],
      // Os 4 eventos da Asa Sul que já vivem no banco (os outros 4 do data.js
      // são featuredLocal e continuam só no arquivo do site).
      events: [
        ev(0, "vida-plena", "Encontro Vida Plena", "Seminário", "29 e 30 de agosto", "San Marco Brasília Hotel", "vida-plena.jpeg"),
        ev(1, "kyrios", "Grupo de Oração Kyrios", "Grupo de oração", "Todo sábado às 15h", "Shalom Asa Sul, 507 Sul", "kyrios.jpeg"),
        ev(2, "amare", "Grupo de Oração Aberto — Amare", "Grupo de oração", "Toda quinta-feira às 19h30", "Shalom Asa Sul, 507 Sul", "amare.jpeg"),
        ev(3, "missa-misericordia", "Missa da Misericórdia", "Missa especial", "Quinta-feira, 30/07", "Shalom Asa Sul", "missa-misericordia.jpeg")
      ],
      menu_categories: [],
      menu_products: [],
      storage: []
    };
  }
  function ev(i, slug, title, badge, date_text, location, img) {
    return {
      id: "aaaaaaaa-0000-4000-8000-00000000000" + i,
      site: "asasul", slug: slug, title: title, badge: badge,
      date_text: date_text, location: location,
      image_url: "https://brasilia.comshalom.org/asasul/images/eventos/" + img,
      summary: "", description: "<p>" + title + "</p>",
      link_text: "", link_url: "",
      published: true, publish_at: null, unpublish_at: null,
      position: i, updated_at: "2026-08-16T18:00:00.000Z"
    };
  }

  var db = seed();
  var seq = 0;
  function uid() { seq++; return "bbbbbbbb-0000-4000-8000-" + String(1e11 + seq).slice(1); }
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function ok(data) { return { data: clone(data), error: null, status: 200, count: null }; }
  function fail(message, code) { return { data: null, error: { message: message, code: code || "MOCK", details: null, hint: null }, status: 400 }; }

  // Chaves que identificam uma linha em cada tabela (para upsert/update/delete).
  var UNIQUE = { settings: ["site", "key"], events: ["site", "slug"], menu_categories: ["site", "slug"], menu_products: ["site", "slug"], page_permissions: ["user_id", "site"] };

  function matches(row, filters) {
    return filters.every(function (f) { return String(row[f.col]) === String(f.val); });
  }
  function sameUnique(table, a, b) {
    var keys = UNIQUE[table]; if (!keys) return false;
    return keys.every(function (k) { return a[k] != null && String(a[k]) === String(b[k]); });
  }

  function Query(table) {
    this.table = table; this.filters = []; this.op = "select";
    this.payload = null; this.orderBy = null; this.limitTo = null; this.opts = null;
  }
  Query.prototype.select = function () { if (this.op === "select") this.op = "select"; return this; };
  Query.prototype.eq = function (col, val) { this.filters.push({ col: col, val: val }); return this; };
  Query.prototype.order = function (col, o) { this.orderBy = { col: col, asc: !o || o.ascending !== false }; return this; };
  Query.prototype.limit = function (n) { this.limitTo = n; return this; };
  Query.prototype.single = function () { this.wantSingle = true; return this; };
  Query.prototype.maybeSingle = function () { this.wantSingle = true; return this; };
  Query.prototype.insert = function (rows) { this.op = "insert"; this.payload = Array.isArray(rows) ? rows : [rows]; return this; };
  Query.prototype.update = function (patch) { this.op = "update"; this.payload = patch; return this; };
  Query.prototype.upsert = function (rows, opts) { this.op = "upsert"; this.payload = Array.isArray(rows) ? rows : [rows]; this.opts = opts || null; return this; };
  Query.prototype.delete = function () { this.op = "delete"; return this; };

  Query.prototype.run = function () {
    var t = this.table, rows = db[t];
    if (!rows) return fail('relation "' + t + '" does not exist', "42P01");
    var self = this;

    if (this.op === "insert" || this.op === "upsert") {
      var written = [];
      for (var i = 0; i < this.payload.length; i++) {
        var incoming = clone(this.payload[i]);
        var hit = -1;
        for (var j = 0; j < rows.length; j++) { if (sameUnique(t, incoming, rows[j])) { hit = j; break; } }
        if (hit !== -1) {
          if (self.op === "insert") return fail('duplicate key value violates unique constraint "' + t + '_site_slug_key"', "23505");
          rows[hit] = Object.assign({}, rows[hit], incoming);
          written.push(rows[hit]);
        } else {
          if (!incoming.id) incoming.id = uid();
          rows.push(incoming);
          written.push(incoming);
        }
      }
      return ok(this.wantSingle ? written[0] : written);
    }

    var hits = rows.filter(function (r) { return matches(r, self.filters); });

    if (this.op === "update") {
      hits.forEach(function (r) { Object.assign(r, clone(self.payload)); });
      return ok(hits);
    }
    if (this.op === "delete") {
      db[t] = rows.filter(function (r) { return !matches(r, self.filters); });
      return ok(hits);
    }

    if (this.orderBy) {
      var col = this.orderBy.col, asc = this.orderBy.asc;
      hits = hits.slice().sort(function (a, b) {
        var x = a[col], y = b[col];
        if (x === y) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x > y ? 1 : -1) * (asc ? 1 : -1);
      });
    }
    if (this.limitTo != null) hits = hits.slice(0, this.limitTo);
    if (this.wantSingle) return hits.length ? ok(hits[0]) : fail("no rows returned", "PGRST116");
    return ok(hits);
  };
  Query.prototype.then = function (resolve, reject) {
    var self = this;
    return Promise.resolve().then(function () { return self.run(); }).then(resolve, reject);
  };
  Query.prototype.catch = function (fn) { return this.then(null, fn); };

  function Bucket(name) { this.name = name; }
  Bucket.prototype.upload = function (path, body, opts) {
    var size = (body && (body.size || body.length)) || 0;
    db.storage.push({ bucket: this.name, path: path, size: size, options: opts || null, at: new Date().toISOString() });
    return Promise.resolve({ data: { path: path }, error: null });
  };
  Bucket.prototype.getPublicUrl = function (path) {
    return { data: { publicUrl: "https://mock.storage.test/" + this.name + "/" + path } };
  };
  Bucket.prototype.remove = function (paths) {
    var list = Array.isArray(paths) ? paths : [paths], self = this;
    db.storage = db.storage.filter(function (f) { return !(f.bucket === self.name && list.indexOf(f.path) !== -1); });
    return Promise.resolve({ data: [], error: null });
  };

  var session = { access_token: "mock-token", user: { id: MASTER.id, email: MASTER.email } };
  var listeners = [];

  function createClient() {
    return {
      auth: {
        getSession: function () { return Promise.resolve({ data: { session: session }, error: null }); },
        getUser: function () { return Promise.resolve({ data: { user: session ? session.user : null }, error: null }); },
        onAuthStateChange: function (cb) {
          listeners.push(cb);
          return { data: { subscription: { unsubscribe: function () { listeners = listeners.filter(function (f) { return f !== cb; }); } } } };
        },
        signInWithPassword: function () { return Promise.resolve({ data: { session: session, user: session.user }, error: null }); },
        signUp: function () { return Promise.resolve({ data: { user: null, session: null }, error: null }); },
        signOut: function () {
          session = null;
          listeners.slice().forEach(function (cb) { cb("SIGNED_OUT", null); });
          return Promise.resolve({ error: null });
        },
        resetPasswordForEmail: function () { return Promise.resolve({ data: {}, error: null }); }
      },
      from: function (table) { return new Query(table); },
      storage: { from: function (bucket) { return new Bucket(bucket); } }
    };
  }

  global.supabase = { createClient: createClient };
  global.__mockDB = db;
  global.__mockReset = function () { db = seed(); global.__mockDB = db; };
  global.__mockMaster = MASTER;
})(window);
