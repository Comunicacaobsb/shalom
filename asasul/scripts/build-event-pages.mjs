/* =====================================================================
   Gera uma página estática por evento em /asasul/e/<slug>/index.html
   com a og:image do evento "assada" no HTML — para o WhatsApp/Facebook
   mostrarem a arte do evento na prévia do link compartilhado.

   Fonte dos eventos (sem dado editável no código):
     --from-json <arquivo>  lê sites.asasul.events de um JSON no formato do
                            seed (docs/seeds/2026-09-07-seed-cev.json).
     (sem a flag)           busca em
                            {url}/rest/v1/events?site=eq.asasul&published=eq.true&order=position
                            no Supabase, com a apikey lida de ../js/config.js.

   Uso (a partir da pasta asasul/):
       node scripts/build-event-pages.mjs
       node scripts/build-event-pages.mjs --from-json ../docs/seeds/2026-09-07-seed-cev.json

   Apaga, antes de gerar, as pastas de e/<slug> cujo slug não existe mais na
   fonte. Rode sempre que os eventos publicados mudarem.
   ===================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");             // pasta asasul/
const SITE_ID = "asasul";
const SITE = "https://brasilia.comshalom.org";
const BASE = SITE + "/asasul";                           // URL pública da pasta
const SITE_NAME = "Shalom Asa Sul";
const DEFAULT_IMAGE = SITE + "/images/shalom-asa-sul.webp";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/\s+/g, " ").trim();
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from-json") out.fromJson = argv[++i];
  }
  return out;
}

function eventsFromJson(file) {
  const abs = path.resolve(file);
  const json = JSON.parse(fs.readFileSync(abs, "utf8"));
  const site = json.sites && json.sites[SITE_ID];
  return (site && site.events) || [];
}

async function eventsFromSupabase() {
  const cfgSrc = fs.readFileSync(path.join(ROOT, "..", "js", "config.js"), "utf8");
  const win = {};
  new Function("window", cfgSrc)(win);
  const cfg = win.SHALOM_SUPABASE || {};
  if (!cfg.url || !cfg.anonKey) throw new Error("js/config.js sem url/anonKey do Supabase.");
  const url = cfg.url.replace(/\/+$/, "") +
    "/rest/v1/events?site=eq." + encodeURIComponent(SITE_ID) + "&published=eq.true&order=position";
  const res = await fetch(url, { headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey } });
  if (!res.ok) throw new Error("Supabase REST respondeu " + res.status + " ao buscar eventos.");
  return await res.json();
}

function pruneGenerated(keepSlugs) {
  const dir = path.join(ROOT, "e");
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (!keepSlugs.has(name)) {
      fs.rmSync(path.join(dir, name), { recursive: true, force: true });
      console.log("  removido: e/" + name + "/ (slug não existe mais na fonte)");
    }
  }
}

const args = parseArgs(process.argv.slice(2));
const events = args.fromJson ? eventsFromJson(args.fromJson) : await eventsFromSupabase();
if (!events.length && !process.argv.includes("--allow-empty") && fs.existsSync(path.join(ROOT, "e"))) {
  throw new Error("A fonte devolveu 0 eventos — abortando para não apagar e/. Use --allow-empty se for intencional.");
}

pruneGenerated(new Set(events.filter((ev) => ev.slug).map((ev) => ev.slug)));

// Usa evento.html como molde
const template = fs.readFileSync(path.join(ROOT, "evento.html"), "utf8");

let count = 0;
for (const ev of events) {
  if (!ev.slug) continue;
  const title = esc(ev.title + " — " + SITE_NAME);
  const desc = esc(ev.summary || ev.title);
  const img = ev.image_url ? String(ev.image_url) : DEFAULT_IMAGE;
  const canonical = BASE + "/e/" + ev.slug + "/";

  const head =
`  <base href="../../">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${img}">
  <meta property="og:url" content="${canonical}">
  <link rel="canonical" href="${canonical}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${img}">
  <script>window.__EVENT_ID__=${JSON.stringify(ev.slug)};</script>`;

  let html = template.replace("<head>", () => "<head>\n" + head); // função: evita que "$&"/"$1" no conteúdo sejam interpretados
  html = html.replace(/<title>[\s\S]*?<\/title>/, "<title>" + title + "</title>");

  const dir = path.join(ROOT, "e", ev.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
  count++;
  console.log("  gerado: e/" + ev.slug + "/index.html");
}

console.log("\nOK — " + count + " página(s) de evento gerada(s) em asasul/e/.");
