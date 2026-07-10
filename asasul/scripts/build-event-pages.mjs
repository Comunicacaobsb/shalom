/* =====================================================================
   Gera uma página estática por evento em /asasul/e/<slug>/index.html
   com a og:image do evento "assada" no HTML — para o WhatsApp/Facebook
   mostrarem a arte do evento na prévia do link compartilhado.

   Uso (a partir da pasta asasul/):
       node scripts/build-event-pages.mjs

   Rode sempre que criar/editar eventos em js/data.js.
   (Para eventos gerenciados pelo Supabase, veja a observação no ADMIN-SETUP.md.)
   ===================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");            // pasta asasul/
const SITE = "https://brasilia.comshalom.org";
const BASE = SITE + "/asasul";                          // URL pública da pasta

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/\s+/g, " ").trim();
}

// 1) Carrega os eventos de js/data.js
const dataSrc = fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8");
const win = {};
new Function("window", dataSrc)(win);
const events = win.SHALOM_EVENTOS || [];

// 2) Usa evento.html como molde
const template = fs.readFileSync(path.join(ROOT, "evento.html"), "utf8");

let count = 0;
for (const ev of events) {
  if (!ev.id) continue;
  const title = esc(ev.titulo + " — Shalom Asa Sul");
  const desc = esc(ev.resumo || ev.titulo);
  const img = ev.imagem ? BASE + "/" + String(ev.imagem).replace(/^\/+/, "") : SITE + "/images/shalom-asa-sul.webp";
  const canonical = BASE + "/e/" + ev.id + "/";

  const head =
`  <base href="../../">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Shalom Asa Sul">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${img}">
  <meta property="og:url" content="${canonical}">
  <link rel="canonical" href="${canonical}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${img}">
  <script>window.__EVENT_ID__=${JSON.stringify(ev.id)};</script>`;

  let html = template.replace("<head>", "<head>\n" + head);
  html = html.replace(/<title>[\s\S]*?<\/title>/, "<title>" + title + "</title>");

  const dir = path.join(ROOT, "e", ev.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
  count++;
  console.log("  gerado: e/" + ev.id + "/index.html");
}

console.log("\nOK — " + count + " página(s) de evento gerada(s) em asasul/e/.");
