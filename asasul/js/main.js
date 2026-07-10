/* =====================================================================
   Shalom Asa Sul — interações da página
   ===================================================================== */

/* copyText global — usado também pelo cev-data.js (campo PIX do CSV) */
function copyText(text) {
  function done() { showToast("Copiado!"); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallbackCopy);
  } else { fallbackCopy(); }
  function fallbackCopy() {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta); done();
  }
}
function showToast(msg) {
  var t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
}

(function () {
  "use strict";
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();

  /* header ao rolar */
  var header = $("#header");
  function onScroll() { if (header) header.classList.toggle("scrolled", window.scrollY > 24); }
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });

  /* menu mobile */
  var toggle = $("#navToggle"), menu = $("#mobileMenu");
  if (toggle && menu) {
    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      menu.classList.toggle("open", open);
    }
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
  }

  /* copiar chave Pix (botão estático) */
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () { copyText(b.getAttribute("data-copy")); });
  });

  /* reveal on scroll */
  var reveals = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ===================== HORÁRIOS & SERVIÇOS (Supabase) ===================== */
  var SCHED = { funcionamento:"field-funcionamento", missa:"field-missa", adoracao:"field-adoracao", aconselhamento:"field-aconselhamento", grupos:"field-grupos", servicos:"field-servicos" };
  function renderSchedules(data) {
    Object.keys(SCHED).forEach(function (k) {
      var el = document.getElementById(SCHED[k]); if (!el) return;
      var arr = (data && data[k]) || [];
      if (!arr.length) { el.innerHTML = '<li class="text-muted">A confirmar</li>'; return; }
      el.innerHTML = arr.map(function (line) {
        var safe = String(line).replace(/[&<>]/g, function (c) { return ({ "&":"&amp;","<":"&lt;",">":"&gt;" })[c]; });
        safe = safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">agendar aqui</a>');
        return '<li>' + safe + '</li>';
      }).join("");
    });
  }
  if (window.SHALOM && SHALOM.loadSchedules) {
    SHALOM.loadSchedules().then(function (data) { renderSchedules(data || window.SHALOM_SCHEDULES || null); });
  } else {
    renderSchedules(window.SHALOM_SCHEDULES || null);
  }

  /* ===================== CARROSSEL DE EVENTOS =====================
     Foco na imagem + botão "Saiba mais". Vários cards por vez no desktop.
     Rotação INFINITA (loop contínuo) via clones + transform. Swipe + autoplay.
  */
  function initCarousel(eventos) {
    var track = $("#carTrack");
    if (!track || !eventos.length) return;
    var dotsWrap = $("#carDots"), bar = $("#carBar");
    var prevBtn = $("#carPrev"), nextBtn = $("#carNext");
    var controls = document.querySelector(".carousel__top");
    var progress = document.querySelector(".carousel__progress");
    var AUTO_MS = 6000;
    var N = eventos.length;
    var loop = N > 1;
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" })[c]; }); }

    function buildSlide(ev, eager) {
      var href = "evento.html?id=" + encodeURIComponent(ev.id);
      var fallback = '<div class="poster-fallback"><div><h4>' + esc(ev.titulo) + '</h4><small>' + esc(ev.badge || "Shalom Asa Sul") + '</small></div></div>';
      var img = ev.imagem
        ? '<img src="' + esc(ev.imagem) + '" alt="' + esc(ev.titulo) + '" loading="' + (eager ? "eager" : "lazy") + '" onerror="var p=this.parentElement;this.style.display=\'none\';p.insertAdjacentHTML(\'beforeend\', this.dataset.fb)" data-fb="' + esc(fallback).replace(/"/g, "&quot;") + '">'
        : fallback;
      return '' +
      '<div class="slide" role="group" aria-roledescription="slide" aria-label="' + esc(ev.titulo) + '">' +
        '<article class="event-card">' +
          '<a class="event-card__media" href="' + href + '" aria-label="' + esc(ev.titulo) + '">' + img + '</a>' +
          '<div class="event-card__row">' +
            '<a class="btn btn--primary event-card__cta" href="' + href + '">' + esc(ev.acao || "Saiba mais") + '</a>' +
            '<button class="btn btn--ghost btn--icon" type="button" data-share="' + esc(ev.id) + '" data-share-title="' + esc(ev.titulo) + '" aria-label="Compartilhar ' + esc(ev.titulo) + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>' +
            '</button>' +
          '</div>' +
        '</article>' +
      '</div>';
    }

    // Monta os slides. Com loop: [cópia] + [reais] + [cópia] para rotação infinita.
    var real = eventos.map(function (ev, i) { return buildSlide(ev, i === 0); });
    var clone = eventos.map(function (ev) { return buildSlide(ev, false); });
    track.innerHTML = loop ? (clone.join("") + real.join("") + clone.join("")) : real.join("");

    // compartilhar (inclui clones — mesmo slug)
    $$("[data-share]", track).forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        if (window.shareEvent) window.shareEvent(b.getAttribute("data-share"), b.getAttribute("data-share-title"));
      });
    });

    var p = loop ? N : 0;   // posição atual (índice de slide na fita)

    function step() {
      var s = track.querySelector(".slide");
      if (!s) return track.clientWidth || 1;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return s.getBoundingClientRect().width + gap;
    }
    function apply(animate) {
      track.classList.toggle("animate", !!animate && !reduceMotion);
      track.style.transform = "translateX(" + (-p * step()) + "px)";
      updateDots();
    }
    function wrap() {
      if (!loop) return;
      if (p >= 2 * N) { p -= N; apply(false); }
      else if (p < N) { p += N; apply(false); }
    }
    track.addEventListener("transitionend", function (e) { if (e.propertyName === "transform") wrap(); });

    function next() { p += 1; apply(true); }
    function prev() { p -= 1; apply(true); }
    function goReal(i) { p = (loop ? N : 0) + i; apply(true); }

    // dots (um por evento real)
    var dots = [];
    dotsWrap.innerHTML = "";
    for (var i = 0; i < N; i++) {
      var b = document.createElement("button");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", "Ir para o evento " + (i + 1));
      b.setAttribute("data-i", i);
      dotsWrap.appendChild(b);
    }
    dots = $$("button", dotsWrap);
    dots.forEach(function (d) { d.addEventListener("click", function () { goReal(+d.getAttribute("data-i")); restart(); }); });
    function updateDots() {
      var cur = loop ? (((p - N) % N) + N) % N : p;
      dots.forEach(function (d, i) { d.setAttribute("aria-current", String(i === cur)); });
    }

    var showControls = loop;
    if (controls) controls.style.display = showControls ? "" : "none";
    if (progress) progress.style.display = showControls ? "" : "none";

    if (nextBtn) nextBtn.addEventListener("click", function () { next(); restart(); });
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restart(); });

    // autoplay + barra de progresso
    var raf = null, startTime = 0;
    function tick(now) {
      if (!startTime) startTime = now;
      var pr = Math.min(1, (now - startTime) / AUTO_MS);
      if (bar) bar.style.width = (pr * 100) + "%";
      if (pr >= 1) { startTime = now; next(); }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (reduceMotion || !loop) return; stop(); startTime = 0; raf = requestAnimationFrame(tick); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; if (bar) bar.style.width = "0%"; }
    function restart() { stop(); start(); }

    ["mouseenter", "focusin"].forEach(function (e) { track.addEventListener(e, stop); });
    ["mouseleave", "focusout"].forEach(function (e) { track.addEventListener(e, start); });
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });

    // swipe (um passo por gesto)
    var dragging = false, x0 = 0, dx = 0;
    track.style.touchAction = "pan-y";
    track.addEventListener("pointerdown", function (e) { dragging = true; x0 = e.clientX; dx = 0; track.classList.remove("animate"); stop(); });
    track.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      dx = e.clientX - x0;
      track.style.transform = "translateX(" + (-p * step() + dx) + "px)";
    });
    function release() {
      if (!dragging) return; dragging = false;
      var th = step() * 0.15;
      if (dx <= -th) next(); else if (dx >= th) prev(); else apply(true);
      start();
    }
    track.addEventListener("pointerup", release);
    track.addEventListener("pointercancel", release);
    track.addEventListener("pointerleave", release);
    // evita que o clique dispare logo após arrastar
    track.addEventListener("click", function (e) { if (Math.abs(dx) > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

    // teclado
    track.setAttribute("tabindex", "0");
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); restart(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); restart(); }
    });

    var rt = null;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { apply(false); }, 150); });

    apply(false);
    start();
  }

  if (window.SHALOM && SHALOM.loadEvents) {
    SHALOM.loadEvents().then(initCarousel);
  } else {
    initCarousel(window.SHALOM_EVENTOS || []);
  }

  /* ===================== NOTÍCIAS (comshalom — WordPress REST) ===================== */
  var list = $("#comshalom-list");
  if (list) {
    var API = "https://comshalom.org/wp-json/wp/v2/posts?per_page=3&_embed=1";
    var PLACEHOLDER = "../images/shalom-brasilia.jpg"; // imagem de reserva on-brand

    function fmt(d) { try { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }); } catch (e) { return ""; } }
    function strip(html) { var d = document.createElement("div"); d.innerHTML = html || ""; return (d.textContent || "").trim(); }

    function render(items) {
      list.classList.remove("skeleton");
      list.innerHTML = items.map(function (n) {
        return '<li><a class="news-card" href="' + n.link + '" target="_blank" rel="noopener">' +
          '<div class="news-card__media"><img src="' + n.img + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'"></div>' +
          '<div class="news-card__body">' +
            (n.date ? '<span class="news-card__date">' + n.date + '</span>' : "") +
            '<h3>' + n.title + '</h3>' +
            (n.excerpt ? '<p>' + n.excerpt + '</p>' : "") +
            '<span class="news-card__more">Ler no comshalom →</span>' +
          '</div></a></li>';
      }).join("");
    }

    function showFallback() {
      list.classList.remove("skeleton");
      list.innerHTML =
        '<li><a class="news-card" href="https://comshalom.org/brasilia" target="_blank" rel="noopener">' +
        '<div class="news-card__media"><img src="' + PLACEHOLDER + '" alt="" loading="lazy"></div>' +
        '<div class="news-card__body"><span class="news-card__date">Comshalom</span>' +
        '<h3>Acesse as últimas notícias no portal</h3>' +
        '<p>Toque para abrir as novidades no comshalom.org.</p>' +
        '<span class="news-card__more">Abrir portal →</span></div></a></li>';
    }

    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 8000);
    fetch(API, { signal: ctrl.signal, headers: { "Accept": "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (posts) {
        clearTimeout(to);
        if (!Array.isArray(posts) || !posts.length) throw new Error("vazio");
        var items = posts.map(function (p) {
          var img = PLACEHOLDER;
          try { var m = p._embedded && p._embedded["wp:featuredmedia"]; if (m && m[0] && m[0].source_url) img = m[0].source_url; } catch (e) {}
          var ex = strip(p.excerpt && p.excerpt.rendered);
          if (ex.length > 120) ex = ex.slice(0, 120).replace(/\s+\S*$/, "") + "…";
          return {
            title: strip(p.title && p.title.rendered) || "Notícia",
            excerpt: ex,
            date: fmt(p.date),
            link: p.link || "https://comshalom.org/brasilia",
            img: img
          };
        });
        render(items);
      })
      .catch(function () { clearTimeout(to); showFallback(); });
  }
})();
