/* =====================================================================
   Teste do painel /admin/ com o mock de Supabase (sem credenciais reais).

   Pré-requisito: servidor estático na raiz do repositório, por exemplo
       cd ~/Documents/GitHub/Shalom && python3 -m http.server 8766
   Depois:
       node scripts/qa/admin-mock/run.mjs
       node scripts/qa/admin-mock/run.mjs --shots /caminho/para/shots

   O que faz: injeta mock-supabase.js no lugar do bundle do Supabase,
   percorre os editores de Capa, Horários e Eventos das três páginas de
   Centro de Evangelização, confere o pré-preenchimento com os dados locais
   de cada site, o que seria gravado no banco (window.__mockDB), a faixa
   "Você está editando", os links "Ver no site", a navegação por teclado e a
   ausência de erros de console. Sai com código 1 se algo falhar.
   ===================================================================== */
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const require = createRequire("/Users/joaoroque/Documents/GitHub/Shalom/inscricoes/package.json");
const { chromium } = require("playwright");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const BASE = process.env.ADMIN_MOCK_BASE || "http://127.0.0.1:8766";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PUBLIC_ORIGIN = "https://brasilia.comshalom.org/";

const shotsArg = process.argv.indexOf("--shots");
const SHOTS = shotsArg !== -1 && process.argv[shotsArg + 1]
  ? path.resolve(process.argv[shotsArg + 1])
  : path.join(os.tmpdir(), "shalom-admin-mock-shots"); // fora do repo por padrão (não suja o git status)

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

/* ---------------- dados locais de cada site (fonte da verdade do teste) --- */
async function localData(site) {
  const src = await readFile(path.join(REPO, site, "js/data.js"), "utf8");
  const sandbox = {};
  new Function("window", src)(sandbox);
  return {
    home: sandbox.SHALOM_HOME || null,
    schedules: sandbox.SHALOM_SCHEDULES || null,
    events: (sandbox.SHALOM_EVENTOS || []).filter((e) => e && e.featuredLocal === true)
  };
}
const abs = (p, site) => (p ? new URL(p, PUBLIC_ORIGIN + site + "/").href : "");

/* ---------------- boot ---------------- */
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const consoleErrors = [];
let currentStep = "boot";

async function main() {
  if (!existsSync(CHROME)) throw new Error(`Chrome não encontrado em ${CHROME}`);
  await mkdir(SHOTS, { recursive: true });

  const mockSrc = await readFile(path.join(HERE, "mock-supabase.js"), "utf8");
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
      body: ""
    })
  );
  await context.route("https://fonts.googleapis.com/**", (r) =>
    r.fulfill({ status: 200, contentType: "text/css", body: "" })
  );
  for (const pattern of ["https://brasilia.comshalom.org/**", "https://mock.storage.test/**"]) {
    await context.route(pattern, (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG_1x1 }));
  }

  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`[${currentStep}] ${m.text()}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${currentStep}] pageerror: ${e.message}`));

  await page.goto(`${BASE}/admin/#page/taguatinga/home`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appView:not(.hidden)", { timeout: 15000 });
  check("painel abre logado com o usuário do mock", true);

  const dbBefore = await page.evaluate(() => ({
    settings: window.__mockDB.settings.length,
    events: window.__mockDB.events.length
  }));
  eq("banco começa com 1 linha em settings", dbBefore.settings, 1);
  eq("banco começa com 4 eventos (Asa Sul)", dbBefore.events, 4);

  for (const site of ["taguatinga", "santamaria", "asasul"]) {
    await runSite(page, site);
  }

  /* ---- cardápio e usuários continuam funcionando ---- */
  currentStep = "sh82cafe/menu";
  const before = consoleErrors.length;
  await goRoute(page, "#page/sh82cafe/menu");
  await page.waitForSelector("#tab-cardapio.is-editor-visible", { timeout: 8000 });
  await page.waitForFunction(() => !/Carregando/.test(document.querySelector("#prodList").textContent), null, { timeout: 8000 });
  check("cardápio do SH-82 abre sem erro de console", consoleErrors.length === before, consoleErrors.slice(before).join(" | "));
  await shot(page, "sh82cafe-cardapio");

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

  check("nenhum erro de console durante o teste", consoleErrors.length === 0, consoleErrors.join(" | "));

  await browser.close();

  const failed = results.filter((r) => !r.passed);
  console.log("\n" + "-".repeat(64));
  console.log(`RESUMO: ${results.length - failed.length} PASS · ${failed.length} FAIL`);
  console.log(`Screenshots: ${SHOTS}`);
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
async function runSite(page, site) {
  const local = await localData(site);
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

  if (!local.home || !local.schedules) {
    check(`${site} · js/data.js tem SHALOM_HOME e SHALOM_SCHEDULES`, false, "sem os dados locais, o pré-preenchimento não pode ser verificado");
    return;
  }

  /* ---------- CAPA ---------- */
  currentStep = `${site}/capa`;
  await goRoute(page, `#page/${site}/home`);
  await page.waitForSelector("#tab-capa.is-editor-visible", { timeout: 8000 });
  await page.waitForFunction(
    (t) => document.querySelector("#capa-titulo").value === t,
    local.home.titulo,
    { timeout: 8000 }
  ).catch(() => {});

  const capa = await page.evaluate(() => ({
    titulo: document.querySelector("#capa-titulo").value,
    subtitulo: document.querySelector("#capa-subtitulo").value,
    imagem: document.querySelector("#capa-image-url").value,
    aviso: document.querySelector("#capaNotice").classList.contains("hidden")
      ? ""
      : document.querySelector("#capaNotice").textContent.trim(),
    previaTitulo: document.querySelector("#capaPreviewTitle").textContent,
    previaSub: document.querySelector("#capaPreviewSub").textContent,
    temFoto: !!document.querySelector("#capaPreview .capa-preview__img"),
    gradiente: document.querySelector("#capaPreview").classList.contains("capa-preview--nophoto"),
    contexto: document.querySelector("#capaContext").textContent.replace(/\s+/g, " ").trim(),
    verNoSite: document.querySelector("#capaContext a").getAttribute("href"),
    temMiniatura: !!document.querySelector("#capaContext svg.page-thumb")
  }));

  eq(`${site} · capa pré-preenche o título com o arquivo do site`, capa.titulo, local.home.titulo);
  eq(`${site} · capa pré-preenche a frase de apoio`, capa.subtitulo, local.home.subtitulo);
  eq(`${site} · capa pré-preenche a imagem com endereço absoluto`, capa.imagem, abs(local.home.imagem, site));
  check(`${site} · capa avisa que os dados vieram do arquivo do site`, /arquivo do site/.test(capa.aviso), capa.aviso);
  eq(`${site} · prévia da capa mostra o título`, capa.previaTitulo, local.home.titulo);
  eq(`${site} · prévia da capa mostra a frase de apoio`, capa.previaSub, local.home.subtitulo);
  if (local.home.imagem) {
    check(`${site} · prévia da capa usa a foto enviada`, capa.temFoto && !capa.gradiente);
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
  check(`${site} · salvar capa grava settings.home`, !!salvo, JSON.stringify(salvo));
  if (salvo) {
    eq(`${site} · settings.home guarda o título editado`, salvo.value.titulo, novoTitulo);
    eq(`${site} · settings.home guarda a frase editada`, salvo.value.subtitulo, novaFrase);
    eq(`${site} · settings.home guarda a imagem absoluta`, salvo.value.imagem, abs(local.home.imagem, site));
    check(`${site} · settings.home guarda o texto alternativo da imagem`,
      local.home.imagem ? !!salvo.value.imagem_alt : salvo.value.imagem_alt === "",
      String(salvo.value.imagem_alt));
    check(`${site} · settings.home tem data de atualização`, !!salvo.updated_at);
  }
  const avisoDepois = await page.evaluate(() => document.querySelector("#capaNotice").classList.contains("hidden"));
  check(`${site} · aviso de dados locais some depois de salvar`, avisoDepois);

  /* ---------- HORÁRIOS ---------- */
  currentStep = `${site}/horarios`;
  // A Asa Sul já tem horários salvos no banco (semeados no mock): nesse caso o
  // editor mostra o banco e NÃO deve avisar sobre o arquivo do site.
  const schedNoBanco = await page.evaluate((s) => {
    const r = window.__mockDB.settings.find((x) => x.site === s && x.key === "schedules");
    return r ? r.value : null;
  }, site);
  await goRoute(page, `#page/${site}/schedules`);
  await page.waitForSelector("#tab-horarios.is-editor-visible", { timeout: 8000 });
  await page.waitForFunction(
    (t) => document.querySelector("#sch-funcionamento") && document.querySelector("#sch-funcionamento").value === t,
    (local.schedules.funcionamento || []).join("\n"),
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
      aviso: document.querySelector("#schedNotice").classList.contains("hidden") ? "" : document.querySelector("#schedNotice").textContent.trim(),
      contexto: document.querySelector("#horariosContext").textContent.replace(/\s+/g, " ").trim(),
      verNoSite: document.querySelector("#horariosContext a").getAttribute("href")
    };
  });
  const fonteSched = schedNoBanco || local.schedules;
  const esperado = Object.fromEntries(
    Object.keys(sched.val).map((k) => [k, (fonteSched[k] || []).join("\n")])
  );
  check(`${site} · horários carregados ${schedNoBanco ? "do banco" : "do arquivo do site"}`,
    JSON.stringify(sched.val) === JSON.stringify(esperado),
    JSON.stringify(sched.val));
  if (schedNoBanco) {
    check(`${site} · horários já salvos não mostram aviso de dados locais`, sched.aviso === "", sched.aviso);
  } else {
    check(`${site} · horários avisam que vieram do arquivo do site`, /arquivo do site/.test(sched.aviso), sched.aviso);
  }
  check(`${site} · faixa de horários nomeia página e módulo`,
    sched.contexto.includes("Você está editando") && sched.contexto.includes(nome) && sched.contexto.includes("Horários e serviços"),
    sched.contexto);
  eq(`${site} · "Ver no site" dos horários leva à âncora #horarios`, sched.verNoSite, `../${site}/#horarios`);

  await shot(page, `${site}-horarios`);

  await page.click("#saveSchedBtn");
  await page.waitForFunction(() => /Horários salvos/.test(document.querySelector("#schedMsg").textContent), null, { timeout: 8000 });
  const schedSalvo = await page.evaluate((s) => window.__mockDB.settings.find((r) => r.site === s && r.key === "schedules") || null, site);
  check(`${site} · salvar horários grava settings.schedules`, !!schedSalvo);
  if (schedSalvo) {
    check(`${site} · settings.schedules tem as seis categorias`,
      Object.keys(schedSalvo.value).length === 6,
      Object.keys(schedSalvo.value).join(","));
    eq(`${site} · settings.schedules guarda os itens de funcionamento`,
      JSON.stringify(schedSalvo.value.funcionamento),
      JSON.stringify(fonteSched.funcionamento || []));
  }

  /* ---------- EVENTOS ---------- */
  currentStep = `${site}/eventos`;
  await goRoute(page, `#page/${site}/events`);
  await page.waitForSelector("#tab-eventos.is-editor-visible", { timeout: 8000 });
  await page.waitForFunction(() => document.querySelectorAll("#eventImport [data-import]").length > 0, null, { timeout: 8000 }).catch(() => {});

  const imp = await page.evaluate(() => ({
    pendentes: document.querySelectorAll("#eventImport [data-import]").length,
    titulo: (document.querySelector("#importTitle") || {}).textContent || "",
    explicacao: (document.querySelector(".import-block__head p") || {}).textContent || "",
    contexto: document.querySelector("#eventosContext").textContent.replace(/\s+/g, " ").trim(),
    verNoSite: document.querySelector("#eventosContext a").getAttribute("href"),
    botaoTodos: (document.querySelector("#importAllBtn") || {}).textContent || ""
  }));
  eq(`${site} · lista os eventos locais pendentes`, imp.pendentes, local.events.length);
  check(`${site} · seção "No site, mas ainda não no painel" aparece`, /No site, mas ainda não no painel/.test(imp.titulo), imp.titulo);
  check(`${site} · explica o que acontece ao trazer`, /passam a ser editados só por aqui/.test(imp.explicacao), imp.explicacao);
  check(`${site} · faixa de eventos nomeia página e módulo`,
    imp.contexto.includes("Você está editando") && imp.contexto.includes(nome) && imp.contexto.includes("Eventos e encontros"),
    imp.contexto);
  eq(`${site} · "Ver no site" dos eventos leva à âncora #eventos`, imp.verNoSite, `../${site}/#eventos`);
  check(`${site} · botão "Trazer todos" mostra a quantidade`, imp.botaoTodos.includes(String(local.events.length)), imp.botaoTodos);

  await shot(page, `${site}-eventos`);

  const antes = await page.evaluate((s) => window.__mockDB.events.filter((e) => e.site === s).length, site);
  const totalAntes = await page.evaluate(() => window.__mockDB.events.length);
  await page.click("#importAllBtn");
  await page.waitForFunction(
    (n) => document.querySelectorAll("#eventList .ev-row").length >= n,
    antes + local.events.length,
    { timeout: 10000 }
  );
  const trazidos = await page.evaluate((s) => window.__mockDB.events.filter((e) => e.site === s), site);
  eq(`${site} · "Trazer todos" grava ${local.events.length} evento(s)`, trazidos.length, antes + local.events.length);

  const semPendentes = await page.evaluate(() => document.querySelectorAll("#eventImport [data-import]").length);
  eq(`${site} · seção de pendentes some depois de trazer`, semPendentes, 0);

  for (const ev of local.events) {
    const row = trazidos.find((r) => r.slug === ev.id);
    check(`${site} · evento "${ev.id}" chegou ao banco`, !!row);
    if (!row) continue;
    eq(`${site} · "${ev.id}" mantém o título`, row.title, ev.titulo);
    eq(`${site} · "${ev.id}" mantém a data`, row.date_text, ev.data);
    eq(`${site} · "${ev.id}" mantém o local`, row.location, ev.local);
    eq(`${site} · "${ev.id}" grava a imagem em endereço absoluto`, row.image_url, abs(ev.imagem, site));
    check(`${site} · "${ev.id}" grava a descrição em HTML`,
      row.description.startsWith("<p>") && row.description.endsWith("</p>") && !/\n/.test(row.description),
      row.description.slice(0, 70));
    const parags = (ev.descricao || "").trim().split(/\n{2,}/).length;
    eq(`${site} · "${ev.id}" converte ${parags} parágrafo(s)`, (row.description.match(/<p>/g) || []).length, parags);
    if (/https?:\/\//.test(ev.descricao || "")) {
      check(`${site} · "${ev.id}" transforma links em <a>`, /<a href="https?:\/\/[^"]+" target="_blank" rel="noopener">/.test(row.description));
    }
    eq(`${site} · "${ev.id}" é publicado`, row.published, true);
    eq(`${site} · "${ev.id}" guarda o texto do botão`, row.link_text, (ev.link && ev.link.texto) || "");
    eq(`${site} · "${ev.id}" guarda o link do botão`, row.link_url, (ev.link && ev.link.url) || "");
  }
  const posicoes = local.events.map((ev) => trazidos.find((r) => r.slug === ev.id)?.position);
  const esperadas = local.events.map((_, i) => antes + i);
  eq(`${site} · posições seguem a ordem do arquivo, depois das existentes`,
    JSON.stringify(posicoes), JSON.stringify(esperadas));

  const totalDepois = await page.evaluate(() => window.__mockDB.events.length);
  eq(`${site} · nada foi gravado em outra página`, totalDepois - totalAntes, local.events.length);

}

main().catch((err) => {
  console.error("\nERRO ao rodar o teste:", err && err.message ? err.message : err);
  process.exitCode = 1;
});
