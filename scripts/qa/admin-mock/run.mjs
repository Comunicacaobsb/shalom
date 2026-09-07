/* =====================================================================
   Teste do painel /admin/ com o mock de Supabase (sem credenciais reais).

   Pré-requisito: servidor estático na raiz do repositório, por exemplo
       cd ~/Documents/GitHub/Shalom && python3 -m http.server 8766
   Depois:
       node scripts/qa/admin-mock/run.mjs
       node scripts/qa/admin-mock/run.mjs --base http://127.0.0.1:8768
       node scripts/qa/admin-mock/run.mjs --shots /caminho/para/shots

   O que faz: injeta mock-supabase.js no lugar do bundle do Supabase, com o
   banco já no estado de produção DEPOIS do seed
   (docs/seeds/2026-09-07-seed-cev.json). Percorre os editores de Capa,
   Horários e Eventos das três páginas de Centro de Evangelização, confere o
   que é lido e o que seria gravado (window.__mockDB), a compressão das
   imagens enviadas (capa, evento e cardápio: nunca acima de 300 KB), as
   recusas (imagem incompressível e arquivo que não é imagem), a ausência de
   qualquer requisição a js/data.js e a ausência de erros de console.
   Sai com código 1 se algo falhar.
   ===================================================================== */
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const require = createRequire("/Users/joaoroque/Documents/GitHub/Shalom/inscricoes/package.json");
const { chromium } = require("playwright");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const SEED_JSON = path.join(REPO, "docs/seeds/2026-09-07-seed-cev.json");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LIMIT = 300 * 1024;

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : "";
}
const BASE = arg("--base") || process.env.ADMIN_MOCK_BASE || "http://127.0.0.1:8766";
const SHOTS = arg("--shots")
  ? path.resolve(arg("--shots"))
  : path.join(os.tmpdir(), "shalom-admin-mock-shots"); // fora do repo por padrão (não suja o git status)
const TMP = os.tmpdir();

/* ---------------- relatório ---------------- */
const results = [];
function check(name, passed, detail) {
  results.push({ name, passed: !!passed, detail: detail || "" });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}
function eq(name, actual, expected) {
  const passed = actual === expected;
  check(name, passed, passed ? "" : `esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`);
}

/* ---------------- PNG gerado aqui (nada é lido do repositório) ------------ */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 0);
  return Buffer.concat([head, data, crcBuf]);
}
// PNG RGB de 8 bits, sem filtro. `pixel(x, y)` devolve [r, g, b].
function makePng(width, height, pixel) {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const off = y * stride;
    for (let x = 0; x < width; x++) {
      const p = pixel(x, y);
      raw[off + 1 + x * 3] = p[0];
      raw[off + 2 + x * 3] = p[1];
      raw[off + 3 + x * 3] = p[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bits por canal
  ihdr[9] = 2;   // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 1 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}
// Foto grande e "normal": degradê, faixas e blocos escuros no lugar do texto.
function fotoGrande(w, h) {
  const wave = new Uint8Array(w);
  for (let x = 0; x < w; x++) wave[x] = 128 + Math.round(90 * Math.sin((x / w) * 14));
  return makePng(w, h, (x, y) => {
    const bloco = y > h * 0.7 && y < h * 0.82 && ((x / 90) | 0) % 3 !== 2 && x > w * 0.08 && x < w * 0.7;
    if (bloco) return [24, 26, 34];
    const g = 40 + ((y * 150) / h) | 0;
    return [(30 + (x * 190) / w) | 0, g, (wave[x] + g) >> 1];
  });
}
// Ruído incompressível: blocos de 3 px de cor aleatória (sobrevive ao
// redimensionamento até 800 px, que é onde a escada de compressão termina).
function ruido(w, h, bloco) {
  const gw = Math.ceil(w / bloco), gh = Math.ceil(h / bloco);
  const grid = new Uint8Array(gw * gh * 3);
  for (let i = 0; i < grid.length; i++) grid[i] = (Math.random() * 256) | 0;
  return makePng(w, h, (x, y) => {
    const i = (((y / bloco) | 0) * gw + ((x / bloco) | 0)) * 3;
    return [grid[i], grid[i + 1], grid[i + 2]];
  });
}
// Imagem detalhada: passa do limite na primeira qualidade e obriga a escada
// a descer alguns degraus antes de caber nos 300 KB.
function fotoDetalhada(w, h) {
  return makePng(w, h, (x, y) => {
    const n = ((x * 1103515245 + y * 12345) >>> 16) & 0x7f;
    const g = ((x + y) * 255) / (w + h);
    return [(g + n) & 255, (255 - g + n) & 255, (n * 2) & 255];
  });
}

/* ---------------- boot ---------------- */
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
// Quill não é baixado no teste; este substituto expõe só o que o painel usa
// (new Quill(seletor).root), para o editor de evento salvar a descrição.
const QUILL_STUB = `window.Quill = function (sel) { this.root = document.querySelector(sel) || document.createElement("div"); };`;

const consoleErrors = [];
const dataJsRequests = [];
let currentStep = "boot";

async function main() {
  if (!existsSync(CHROME)) throw new Error(`Chrome não encontrado em ${CHROME}`);
  if (!existsSync(SEED_JSON)) throw new Error(`Seed não encontrado em ${SEED_JSON}`);
  await mkdir(SHOTS, { recursive: true });

  const seed = JSON.parse(await readFile(SEED_JSON, "utf8"));
  const mockSrc = await readFile(path.join(HERE, "mock-supabase.js"), "utf8");

  // arquivos de teste (todos gerados agora, em $TMPDIR)
  const files = {
    capa: path.join(TMP, "shalom-teste-capa-4000x2500.png"),
    detalhada: path.join(TMP, "shalom-teste-detalhada-2400x1600.png"),
    ruido: path.join(TMP, "shalom-teste-ruido-2000x2000.png"),
    texto: path.join(TMP, "shalom-teste-nao-imagem.txt")
  };
  await writeFile(files.capa, fotoGrande(4000, 2500));
  await writeFile(files.detalhada, fotoDetalhada(2400, 1600));
  await writeFile(files.ruido, ruido(2000, 2000, 3));
  await writeFile(files.texto, "Isto não é uma imagem, é um texto simples.\n");

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  // O bundle do Supabase é substituído pelo mock; o resto do que é externo
  // vira resposta vazia para o teste rodar offline e sem ruído no console.
  await context.route("**/@supabase/supabase-js@2**", (r) =>
    r.fulfill({ status: 200, contentType: "application/javascript; charset=utf-8", body: mockSrc })
  );
  await context.route("**/quill@2/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: r.request().url().endsWith(".css") ? "text/css" : "application/javascript",
      body: r.request().url().endsWith(".css") ? "" : QUILL_STUB
    })
  );
  await context.route("https://fonts.googleapis.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/css", body: "" })
  );
  for (const pattern of ["https://brasilia.comshalom.org/**", "https://mock.storage.test/**"]) {
    await context.route(pattern, (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG_1x1 }));
  }
  // O banco do mock nasce com o estado pós-seed.
  await context.addInitScript((json) => { window.__MOCK_SEED = json; }, seed);

  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`[${currentStep}] ${m.text()}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${currentStep}] pageerror: ${e.message}`));
  page.on("request", (r) => {
    if (/\/js\/data\.js(\?|$)/.test(r.url())) dataJsRequests.push(`[${currentStep}] ${r.url()}`);
  });

  await page.goto(`${BASE}/admin/#page/taguatinga/home`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appView:not(.hidden)", { timeout: 15000 });
  check("painel abre logado com o usuário do mock", true);

  /* ---- o banco do teste está no estado pós-seed ---- */
  const esperadoSettings = new Set();
  const esperadoEventos = [];
  for (const [siteId, bloco] of Object.entries(seed.sites)) {
    for (const key of ["home", "schedules"]) if (bloco[key]) esperadoSettings.add(`${siteId}|${key}`);
    for (const ev of bloco.events || []) esperadoEventos.push(`${siteId}|${ev.slug}`);
  }
  esperadoSettings.add("asasul|schedules"); // já existia antes do seed
  const dbInicial = await page.evaluate(() => ({
    settings: window.__mockDB.settings.map((r) => `${r.site}|${r.key}`).sort(),
    events: window.__mockDB.events.map((r) => `${r.site}|${r.slug}`).sort(),
    asasulSched: window.__mockDB.settings.find((r) => r.site === "asasul" && r.key === "schedules")
  }));
  eq("banco de teste começa com as linhas do seed em settings",
    dbInicial.settings.join(","), [...esperadoSettings].sort().join(","));
  eq("banco de teste começa com os 4 eventos originais + os do seed",
    dbInicial.events.join(","), esperadoEventos.sort().join(","));
  eq("banco de teste tem 14 eventos (4 originais da Asa Sul + 10 do seed)", dbInicial.events.length, 14);
  check("seed não sobrescreve os horários que a Asa Sul já tinha",
    dbInicial.asasulSched && dbInicial.asasulSched.updated_at === "2026-08-16T18:00:00.000Z",
    dbInicial.asasulSched && dbInicial.asasulSched.updated_at);

  /* ---- os elementos do recurso "Trazer para o painel" não existem mais ---- */
  const mortos = await page.evaluate(() => ({
    eventImport: !!document.querySelector("#eventImport"),
    capaNotice: !!document.querySelector("#capaNotice"),
    schedNotice: !!document.querySelector("#schedNotice")
  }));
  check('painel não tem mais o bloco "Trazer para o painel" (#eventImport)', !mortos.eventImport);
  check("painel não tem mais os avisos de dados locais (#capaNotice/#schedNotice)",
    !mortos.capaNotice && !mortos.schedNotice, JSON.stringify(mortos));

  for (const site of ["taguatinga", "santamaria", "asasul"]) {
    await runSite(page, site, seed.sites[site]);
  }

  await runUploads(page, files);

  /* ---- cardápio e usuários continuam funcionando ---- */
  currentStep = "sh82cafe/menu";
  const before = consoleErrors.length;
  await goRoute(page, "#page/sh82cafe/menu");
  await page.waitForSelector("#tab-cardapio.is-editor-visible", { timeout: 8000 });
  await page.waitForFunction(() => !/Carregando/.test(document.querySelector("#prodList").textContent), null, { timeout: 8000 });
  check("cardápio do SH-82 abre sem erro de console", consoleErrors.length === before, consoleErrors.slice(before).join(" | "));
  await shot(page, "sh82cafe-cardapio");

  await runUploadProduto(page, files);

  currentStep = "users";
  const beforeUsers = consoleErrors.length;
  await goRoute(page, "#users");
  await page.waitForSelector("#route-users:not(.hidden)", { timeout: 8000 });
  await page.waitForFunction(() => /Editor de Teste/.test(document.querySelector("#userList").textContent), null, { timeout: 8000 });
  check("usuários e acessos abre sem erro de console", consoleErrors.length === beforeUsers, consoleErrors.slice(beforeUsers).join(" | "));

  /* ---- navegação por teclado até Salvar capa ---- */
  currentStep = "teclado";
  await goRoute(page, "#page/taguatinga/home");
  await page.waitForSelector("#tab-capa.is-editor-visible", { timeout: 8000 });
  await page.focus("#capa-titulo");
  let reached = false;
  const order = [];
  for (let i = 0; i < 12 && !reached; i++) {
    await page.keyboard.press("Tab");
    const id = await page.evaluate(() => document.activeElement && document.activeElement.id);
    order.push(id || "(sem id)");
    if (id === "saveCapaBtn") reached = true;
  }
  check("Tab a partir do título chega ao botão Salvar capa", reached, order.join(" → "));
  const focusRing = await page.evaluate(() => {
    const el = document.querySelector("#saveCapaBtn");
    el.focus();
    const s = getComputedStyle(el);
    return { outline: s.outlineStyle, width: s.outlineWidth, shadow: s.boxShadow };
  });
  check(
    "botão Salvar capa mostra foco visível",
    focusRing.outline !== "none" || (focusRing.shadow && focusRing.shadow !== "none"),
    JSON.stringify(focusRing)
  );

  /* ---- nada de js/data.js e nada de erro no console ---- */
  check("nenhuma requisição a js/data.js durante todo o percurso",
    dataJsRequests.length === 0, dataJsRequests.join(" | "));
  check("nenhum erro de console durante o teste", consoleErrors.length === 0, consoleErrors.join(" | "));

  await browser.close();

  const failed = results.filter((r) => !r.passed);
  console.log("\n" + "-".repeat(64));
  console.log(`RESUMO: ${results.length - failed.length} PASS · ${failed.length} FAIL`);
  console.log(`Screenshots: ${SHOTS}`);
  console.log(`Arquivos de teste: ${Object.values(files).join(", ")}`);
  if (failed.length) {
    console.log("\nFalhas:");
    failed.forEach((f) => console.log(`  · ${f.name}${f.detail ? ` — ${f.detail}` : ""}`));
    process.exitCode = 1;
  }
}

/* ---------------- navegação ---------------- */
async function goRoute(page, hash) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(120);
}

async function shot(page, name) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, `${name}-1280.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, `${name}-390.png`), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(120);
}

/* ---------------- um site inteiro ---------------- */
async function runSite(page, site, semeado) {
  const nomes = { taguatinga: "Shalom Taguatinga", santamaria: "Shalom Santa Maria", asasul: "Shalom Asa Sul" };
  const nome = nomes[site];

  /* ---------- cards de módulo da página ---------- */
  currentStep = `${site}/módulos`;
  await goRoute(page, `#page/${site}`);
  await page.waitForSelector("#workspaceModules .workspace-module", { timeout: 8000 });
  const cards = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#workspaceModules .workspace-module")).map((el) => ({
      titulo: el.querySelector("h2").textContent,
      descricao: el.querySelector("p").textContent,
      miniatura: !!el.querySelector("svg.page-thumb")
    }))
  );
  eq(`${site} · workspace mostra os três módulos na ordem da página`,
    cards.map((c) => c.titulo).join(" | "),
    "Capa (topo da página) | Horários e serviços | Eventos e encontros");
  check(`${site} · cada card de módulo tem descrição e miniatura`,
    cards.every((c) => c.descricao.length > 30 && c.miniatura),
    JSON.stringify(cards.map((c) => c.descricao.slice(0, 24))));
  if (site === "taguatinga") await shot(page, "workspace-modulos");

  /* ---------- CAPA ---------- */
  currentStep = `${site}/capa`;
  await goRoute(page, `#page/${site}/home`);
  await page.waitForSelector("#tab-capa.is-editor-visible", { timeout: 8000 });
  await page.waitForFunction(
    (t) => document.querySelector("#capa-titulo").value === t,
    semeado.home.titulo,
    { timeout: 8000 }
  ).catch(() => {});

  const capa = await page.evaluate(() => ({
    titulo: document.querySelector("#capa-titulo").value,
    subtitulo: document.querySelector("#capa-subtitulo").value,
    imagem: document.querySelector("#capa-image-url").value,
    previaTitulo: document.querySelector("#capaPreviewTitle").textContent,
    previaSub: document.querySelector("#capaPreviewSub").textContent,
    temFoto: !!document.querySelector("#capaPreview .capa-preview__img"),
    gradiente: document.querySelector("#capaPreview").classList.contains("capa-preview--nophoto"),
    contexto: document.querySelector("#capaContext").textContent.replace(/\s+/g, " ").trim(),
    verNoSite: document.querySelector("#capaContext a").getAttribute("href"),
    temMiniatura: !!document.querySelector("#capaContext svg.page-thumb")
  }));

  eq(`${site} · capa carrega o título do banco`, capa.titulo, semeado.home.titulo);
  eq(`${site} · capa carrega a frase de apoio do banco`, capa.subtitulo, semeado.home.subtitulo);
  eq(`${site} · capa carrega a imagem do banco`, capa.imagem, semeado.home.imagem || "");
  eq(`${site} · prévia da capa mostra o título`, capa.previaTitulo, semeado.home.titulo);
  eq(`${site} · prévia da capa mostra a frase de apoio`, capa.previaSub, semeado.home.subtitulo);
  if (semeado.home.imagem) {
    check(`${site} · prévia da capa usa a foto do banco`, capa.temFoto && !capa.gradiente);
  } else {
    check(`${site} · prévia da capa sem foto usa o gradiente institucional`, !capa.temFoto && capa.gradiente);
  }
  check(`${site} · faixa "Você está editando" nomeia página e módulo`,
    capa.contexto.includes("Você está editando") && capa.contexto.includes(nome) && capa.contexto.includes("Capa (topo da página)"),
    capa.contexto);
  check(`${site} · faixa da capa traz a miniatura da página`, capa.temMiniatura);
  eq(`${site} · "Ver no site" da capa aponta para a página`, capa.verNoSite, `../${site}/`);

  await shot(page, `${site}-capa`);

  // edita e salva
  const novoTitulo = `Um lugar para\nencontrar Deus\nteste ${site}`;
  const novaFrase = `Frase de teste do painel (${site}).`;
  await page.fill("#capa-titulo", novoTitulo);
  await page.fill("#capa-subtitulo", novaFrase);
  const previaAoVivo = await page.evaluate(() => ({
    titulo: document.querySelector("#capaPreviewTitle").textContent,
    sub: document.querySelector("#capaPreviewSub").textContent
  }));
  eq(`${site} · prévia acompanha a digitação do título`, previaAoVivo.titulo, novoTitulo);
  eq(`${site} · prévia acompanha a digitação da frase`, previaAoVivo.sub, novaFrase);

  await page.click("#saveCapaBtn");
  await page.waitForFunction(() => /Capa salva/.test(document.querySelector("#capaMsg").textContent), null, { timeout: 8000 });
  const salvo = await page.evaluate((s) => window.__mockDB.settings.find((r) => r.site === s && r.key === "home") || null, site);
  check(`${site} · salvar capa grava settings.home`, !!salvo, JSON.stringify(salvo && salvo.value && salvo.value.titulo));
  if (salvo) {
    eq(`${site} · settings.home guarda o título editado`, salvo.value.titulo, novoTitulo);
    eq(`${site} · settings.home guarda a frase editada`, salvo.value.subtitulo, novaFrase);
    eq(`${site} · settings.home preserva a imagem do banco`, salvo.value.imagem, semeado.home.imagem || "");
    check(`${site} · settings.home guarda o texto alternativo da imagem`,
      semeado.home.imagem ? !!salvo.value.imagem_alt : salvo.value.imagem_alt === "",
      String(salvo.value.imagem_alt));
    check(`${site} · settings.home tem data de atualização`, !!salvo.updated_at);
  }

  /* ---------- HORÁRIOS ---------- */
  currentStep = `${site}/horarios`;
  const schedNoBanco = await page.evaluate((s) => {
    const r = window.__mockDB.settings.find((x) => x.site === s && x.key === "schedules");
    return r ? r.value : null;
  }, site);
  check(`${site} · seed deixou os horários no banco`, !!schedNoBanco);
  await goRoute(page, `#page/${site}/schedules`);
  await page.waitForSelector("#tab-horarios.is-editor-visible", { timeout: 8000 });
  await page.waitForFunction(
    (t) => document.querySelector("#sch-funcionamento") && document.querySelector("#sch-funcionamento").value === t,
    (schedNoBanco.funcionamento || []).join("\n"),
    { timeout: 8000 }
  ).catch(() => {});

  const sched = await page.evaluate(() => {
    const val = {};
    ["funcionamento", "missa", "adoracao", "aconselhamento", "grupos", "servicos"].forEach((k) => {
      const ta = document.querySelector("#sch-" + k);
      val[k] = ta ? ta.value : null;
    });
    return {
      val,
      contexto: document.querySelector("#horariosContext").textContent.replace(/\s+/g, " ").trim(),
      verNoSite: document.querySelector("#horariosContext a").getAttribute("href")
    };
  });
  const esperado = Object.fromEntries(
    Object.keys(sched.val).map((k) => [k, (schedNoBanco[k] || []).join("\n")])
  );
  check(`${site} · horários carregados do banco`,
    JSON.stringify(sched.val) === JSON.stringify(esperado),
    JSON.stringify(sched.val));
  check(`${site} · faixa de horários nomeia página e módulo`,
    sched.contexto.includes("Você está editando") && sched.contexto.includes(nome) && sched.contexto.includes("Horários e serviços"),
    sched.contexto);
  eq(`${site} · "Ver no site" dos horários leva à âncora #horarios`, sched.verNoSite, `../${site}/#horarios`);

  await shot(page, `${site}-horarios`);

  const novoItem = `Teste do painel (${site})`;
  await page.fill("#sch-funcionamento", `${(schedNoBanco.funcionamento || []).join("\n")}\n${novoItem}`);
  await page.click("#saveSchedBtn");
  await page.waitForFunction(() => /Horários salvos/.test(document.querySelector("#schedMsg").textContent), null, { timeout: 8000 });
  const schedSalvo = await page.evaluate((s) => window.__mockDB.settings.find((r) => r.site === s && r.key === "schedules") || null, site);
  check(`${site} · salvar horários grava settings.schedules`, !!schedSalvo);
  if (schedSalvo) {
    check(`${site} · settings.schedules tem as seis categorias`,
      Object.keys(schedSalvo.value).length === 6,
      Object.keys(schedSalvo.value).join(","));
    eq(`${site} · settings.schedules guarda a linha acrescentada`,
      JSON.stringify(schedSalvo.value.funcionamento),
      JSON.stringify([...(schedNoBanco.funcionamento || []), novoItem]));
  }

  /* ---------- EVENTOS ---------- */
  currentStep = `${site}/eventos`;
  await goRoute(page, `#page/${site}/events`);
  await page.waitForSelector("#tab-eventos.is-editor-visible", { timeout: 8000 });
  await page.waitForFunction(() => document.querySelectorAll("#eventList .ev-row").length > 0, null, { timeout: 8000 }).catch(() => {});

  const noBanco = await page.evaluate((s) => window.__mockDB.events.filter((e) => e.site === s).length, site);
  const lista = await page.evaluate(() => ({
    linhas: document.querySelectorAll("#eventList .ev-row").length,
    titulos: Array.from(document.querySelectorAll("#eventList .ev-row h3")).map((h) => h.textContent),
    contexto: document.querySelector("#eventosContext").textContent.replace(/\s+/g, " ").trim(),
    verNoSite: document.querySelector("#eventosContext a").getAttribute("href"),
    importBlock: !!document.querySelector("#eventImport, .import-block")
  }));
  eq(`${site} · lista mostra os ${noBanco} eventos do banco`, lista.linhas, noBanco);
  check(`${site} · lista traz os eventos do seed`,
    (semeado.events || []).every((ev) => lista.titulos.includes(ev.title)),
    lista.titulos.join(" | "));
  check(`${site} · nenhum bloco de importação de eventos locais`, !lista.importBlock);
  check(`${site} · faixa de eventos nomeia página e módulo`,
    lista.contexto.includes("Você está editando") && lista.contexto.includes(nome) && lista.contexto.includes("Eventos e encontros"),
    lista.contexto);
  eq(`${site} · "Ver no site" dos eventos leva à âncora #eventos`, lista.verNoSite, `../${site}/#eventos`);

  await shot(page, `${site}-eventos`);

  // edita o primeiro evento e salva
  const alvo = await page.evaluate((s) => {
    const r = window.__mockDB.events.filter((e) => e.site === s).sort((a, b) => a.position - b.position)[0];
    return r ? { id: r.id, slug: r.slug, title: r.title, description: r.description } : null;
  }, site);
  check(`${site} · há um evento no banco para editar`, !!alvo);
  if (alvo) {
    const novaData = `Data de teste (${site})`;
    await page.click(`#eventList [data-edit="${alvo.id}"]`);
    await page.waitForSelector("#eventModal:not(.hidden)", { timeout: 8000 });
    await page.fill("#ev-date", novaData);
    await page.click("#modalSave");
    await page.waitForSelector("#eventModal", { state: "hidden", timeout: 8000 });
    const depois = await page.evaluate((id) => window.__mockDB.events.find((e) => e.id === id) || null, alvo.id);
    eq(`${site} · editar o evento "${alvo.slug}" grava a nova data`, depois && depois.date_text, novaData);
    eq(`${site} · editar o evento não muda o slug`, depois && depois.slug, alvo.slug);
    eq(`${site} · editar o evento preserva a descrição em HTML`, depois && depois.description, alvo.description);
    const total = await page.evaluate(() => window.__mockDB.events.length);
    eq(`${site} · editar não cria evento novo`, total, 14);
  }
}

/* ---------------- uploads com compressão ---------------- */
const SENTINELA = "__aguardando o painel__";
async function upload(page, inputSel, statusSel, file) {
  const antes = await page.evaluate(() => window.__mockDB.storage.length);
  await page.evaluate((sel) => { document.querySelector(sel).textContent = "__aguardando o painel__"; }, statusSel);
  const t0 = Date.now();
  await page.setInputFiles(inputSel, file, { timeout: 15000 });
  await page.waitForFunction(
    (args) => {
      const t = (document.querySelector(args.sel).textContent || "").trim();
      return t.length > 0 && t !== args.sentinela && !/Preparando|Enviando/.test(t);
    },
    { sel: statusSel, sentinela: SENTINELA },
    { timeout: 180000, polling: 250 }
  );
  const segundos = ((Date.now() - t0) / 1000).toFixed(1);
  return {
    segundos,
    status: (await page.textContent(statusSel)).trim(),
    novos: await page.evaluate((n) => window.__mockDB.storage.slice(n), antes)
  };
}

async function runUploads(page, files) {
  const site = "taguatinga";

  /* ---------- capa: foto grande (4000×2500) ---------- */
  currentStep = `${site}/capa/upload`;
  await goRoute(page, `#page/${site}/home`);
  await page.waitForSelector("#tab-capa.is-editor-visible", { timeout: 8000 });
  const grande = await upload(page, "#capa-image-file", "#capa-upload-status", files.capa);
  check("capa · foto de 4000×2500 é aceita e enviada", grande.novos.length === 1, `${grande.status} (${grande.segundos}s)`);
  if (grande.novos.length === 1) {
    const f = grande.novos[0];
    check(`capa · blob final tem no máximo 300 KB (${Math.round(f.size / 1024)} KB)`, f.size <= LIMIT, String(f.size));
    check("capa · caminho fica na pasta da própria página, com extensão do formato gerado",
      new RegExp(`^${site}/capa-\\d+\\.(webp|jpg)$`).test(f.path), f.path);
    check("capa · contentType combina com a extensão e com o blob",
      (f.path.endsWith(".webp") ? "image/webp" : "image/jpeg") === (f.options && f.options.contentType) &&
      f.type === (f.options && f.options.contentType),
      `${f.path} · ${f.options && f.options.contentType} · ${f.type}`);
    eq("capa · vai para o bucket eventos", f.bucket, "eventos");
    check("capa · status mostra o tamanho final em KB", /Imagem enviada \(\d+ KB\)/.test(grande.status), grande.status);
    const urlNaCapa = await page.inputValue("#capa-image-url");
    check("capa · o endereço público do arquivo enviado entra no campo da imagem",
      urlNaCapa.includes(f.path), urlNaCapa);
  }
  await shot(page, "capa-upload");

  /* ---------- capa: imagem detalhada (escada desce alguns degraus) ------- */
  currentStep = `${site}/capa/upload-detalhada`;
  const detalhada = await upload(page, "#capa-image-file", "#capa-upload-status", files.detalhada);
  check("capa · imagem detalhada também é aceita", detalhada.novos.length === 1, `${detalhada.status} (${detalhada.segundos}s)`);
  if (detalhada.novos.length === 1) {
    check(`capa · imagem detalhada cabe em 300 KB (${Math.round(detalhada.novos[0].size / 1024)} KB)`,
      detalhada.novos[0].size <= LIMIT, String(detalhada.novos[0].size));
  }

  /* ---------- capa: ruído incompressível ---------- */
  currentStep = `${site}/capa/upload-ruido`;
  const ruidoUp = await upload(page, "#capa-image-file", "#capa-upload-status", files.ruido);
  check("capa · ruído incompressível é recusado com a mensagem da decisão D6",
    /Não foi possível deixar a imagem abaixo de 300 KB/.test(ruidoUp.status), `${ruidoUp.status} (${ruidoUp.segundos}s)`);
  eq("capa · nada é gravado quando a imagem é recusada", ruidoUp.novos.length, 0);

  /* ---------- capa: arquivo que não é imagem ---------- */
  currentStep = `${site}/capa/upload-texto`;
  const texto = await upload(page, "#capa-image-file", "#capa-upload-status", files.texto);
  check("capa · arquivo que não é imagem é recusado",
    /não é uma imagem/i.test(texto.status), texto.status);
  eq("capa · nada é gravado quando o arquivo não é imagem", texto.novos.length, 0);

  /* ---------- evento: a arte também é comprimida ---------- */
  currentStep = `${site}/eventos/upload`;
  await goRoute(page, `#page/${site}/events`);
  await page.waitForSelector("#tab-eventos.is-editor-visible", { timeout: 8000 });
  await page.click("#newEventBtn");
  await page.waitForSelector("#eventModal:not(.hidden)", { timeout: 8000 });
  await page.fill("#ev-title", "Evento de teste com arte");
  const ev = await upload(page, "#ev-image-file", "#ev-upload-status", files.capa);
  check("evento · a arte enviada é comprimida e sobe", ev.novos.length === 1, `${ev.status} (${ev.segundos}s)`);
  if (ev.novos.length === 1) {
    const f = ev.novos[0];
    check(`evento · blob final tem no máximo 300 KB (${Math.round(f.size / 1024)} KB)`, f.size <= LIMIT, String(f.size));
    check("evento · caminho usa o slug dentro da pasta da página",
      new RegExp(`^${site}/evento-de-teste-com-arte-\\d+\\.(webp|jpg)$`).test(f.path), f.path);
    check("evento · contentType combina com a extensão",
      (f.path.endsWith(".webp") ? "image/webp" : "image/jpeg") === (f.options && f.options.contentType),
      `${f.path} · ${f.options && f.options.contentType}`);
    eq("evento · vai para o bucket eventos", f.bucket, "eventos");
    check("evento · status mostra o tamanho final em KB", /Imagem enviada \(\d+ KB\)/.test(ev.status), ev.status);
  }
  const evRuido = await upload(page, "#ev-image-file", "#ev-upload-status", files.ruido);
  check("evento · ruído incompressível é recusado",
    /Não foi possível deixar a imagem abaixo de 300 KB/.test(evRuido.status), evRuido.status);
  eq("evento · nada é gravado quando a arte é recusada", evRuido.novos.length, 0);
  await shot(page, "evento-upload");
  await page.click("#modalCancel");
  await page.waitForSelector("#eventModal", { state: "hidden", timeout: 8000 });
}

async function runUploadProduto(page, files) {
  currentStep = "sh82cafe/cardapio/upload";
  await page.click("#newProductBtn");
  await page.waitForSelector("#productModal:not(.hidden)", { timeout: 8000 });
  const hint = (await page.textContent("#pm-upload-status")).trim();
  check("cardápio · ajuda do uploader fala em compressão automática até 300 KB",
    /comprimida automaticamente \(até 300 KB\)/.test(hint), hint);
  const prod = await upload(page, "#pm-image-file", "#pm-upload-status", files.capa);
  check("cardápio · a foto do produto é comprimida e sobe", prod.novos.length === 1, `${prod.status} (${prod.segundos}s)`);
  if (prod.novos.length === 1) {
    const f = prod.novos[0];
    check(`cardápio · blob final tem no máximo 300 KB (${Math.round(f.size / 1024)} KB)`, f.size <= LIMIT, String(f.size));
    check("cardápio · caminho fica na pasta da própria página",
      /^sh82cafe\/[0-9a-f-]{36}\.(webp|jpg)$/.test(f.path), f.path);
    check("cardápio · contentType combina com a extensão",
      (f.path.endsWith(".webp") ? "image/webp" : "image/jpeg") === (f.options && f.options.contentType),
      `${f.path} · ${f.options && f.options.contentType}`);
    eq("cardápio · vai para o bucket cardapio", f.bucket, "cardapio");
    check("cardápio · status mostra o tamanho final em KB", /Imagem enviada \(\d+ KB\)/.test(prod.status), prod.status);
  }
  await shot(page, "cardapio-upload");
  await page.click("#pmCancel");
  await page.waitForSelector("#productModal", { state: "hidden", timeout: 8000 });
}

main().catch((err) => {
  console.error("\nERRO ao rodar o teste:", err && err.message ? err.message : err);
  process.exitCode = 1;
});
