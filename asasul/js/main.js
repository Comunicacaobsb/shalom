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
     Rolagem nativa (swipe) com scroll-snap + autoplay com barra de progresso.
  */
  function initCarousel(eventos) {
    var track = $("#carTrack");
    if (!track || !eventos.length) return;
    var dotsWrap = $("#carDots"), bar = $("#carBar");
    var prevBtn = $("#carPrev"), nextBtn = $("#carNext");
    var controls = document.querySelector(".carousel__controls");
    var progress = document.querySelector(".carousel__progress");
    var AUTO_MS = 6000;
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" })[c]; }); }

    track.innerHTML = eventos.map(function (ev, i) {
      var href = "evento.html?id=" + encodeURIComponent(ev.id);
      var fallback = '<div class="poster-fallback"><div><h4>' + esc(ev.titulo) + '</h4><small>' + esc(ev.badge || "Shalom Asa Sul") + '</small></div></div>';
      var img = ev.imagem
        ? '<img src="' + esc(ev.imagem) + '" alt="' + esc(ev.titulo) + '" loading="' + (i === 0 ? "eager" : "lazy") + '" onerror="var p=this.parentElement;this.style.display=\'none\';p.insertAdjacentHTML(\'beforeend\', this.dataset.fb)" data-fb="' + esc(fallback).replace(/"/g, "&quot;") + '">'
        : fallback;
      return '' +
      '<div class="slide" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' de ' + eventos.length + '">' +
        '<article class="event-card">' +
          '<a class="event-card__media" href="' + href + '" aria-label="' + esc(ev.titulo) + '">' + img + '</a>' +
          '<a class="btn btn--primary event-card__cta" href="' + href + '">' + esc(ev.acao || "Saiba mais") + '</a>' +
        '</article>' +
      '</div>';
    }).join("");

    function stepSize() {
      var s = track.querySelector(".slide");
      if (!s) return track.clientWidth || 1;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return s.getBoundingClientRect().width + gap;
    }
    function perView() { return Math.max(1, Math.round(track.clientWidth / stepSize())); }
    function maxIndex() { return Math.max(0, eventos.length - perView()); }
    function current() { return Math.min(maxIndex(), Math.round(track.scrollLeft / stepSize())); }

    var dots = [];
    function buildDots() {
      var n = maxIndex() + 1;
      dotsWrap.innerHTML = "";
      for (var i = 0; i < n; i++) {
        var b = document.createElement("button");
        b.setAttribute("role", "tab");
        b.setAttribute("aria-label", "Ir para a posição " + (i + 1));
        b.setAttribute("data-i", i);
        dotsWrap.appendChild(b);
      }
      dots = $$("button", dotsWrap);
      dots.forEach(function (d) { d.addEventListener("click", function () { goTo(+d.getAttribute("data-i")); restart(); }); });
      // esconde controles quando não há o que rolar
      var scrollable = maxIndex() > 0;
      if (controls) controls.style.display = scrollable ? "" : "none";
      if (progress) progress.style.display = scrollable ? "" : "none";
      syncDots();
    }
    function goTo(i) {
      i = Math.max(0, Math.min(i, maxIndex()));
      track.scrollTo({ left: i * stepSize(), behavior: reduceMotion ? "auto" : "smooth" });
    }
    function syncDots() {
      var c = current();
      dots.forEach(function (d, i) { d.setAttribute("aria-current", String(i === c)); });
    }

    if (nextBtn) nextBtn.addEventListener("click", function () { var c = current(); goTo(c >= maxIndex() ? 0 : c + 1); restart(); });
    if (prevBtn) prevBtn.addEventListener("click", function () { var c = current(); goTo(c <= 0 ? maxIndex() : c - 1); restart(); });

    var st = null;
    track.addEventListener("scroll", function () { clearTimeout(st); st = setTimeout(syncDots, 80); }, { passive: true });

    // autoplay + barra de progresso
    var raf = null, startTime = 0;
    function tick(now) {
      if (!startTime) startTime = now;
      var p = Math.min(1, (now - startTime) / AUTO_MS);
      if (bar) bar.style.width = (p * 100) + "%";
      if (p >= 1) { startTime = now; var c = current(); goTo(c >= maxIndex() ? 0 : c + 1); }
      raf = requestAnimationFrame(tick);
    }
    function start() { if (reduceMotion || maxIndex() < 1) return; stop(); startTime = 0; raf = requestAnimationFrame(tick); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; if (bar) bar.style.width = "0%"; }
    function restart() { stop(); start(); }

    ["mouseenter", "focusin", "pointerdown", "touchstart"].forEach(function (e) { track.addEventListener(e, stop, { passive: true }); });
    ["mouseleave", "touchend", "pointerup"].forEach(function (e) { track.addEventListener(e, start, { passive: true }); });
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });

    var rt = null;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(buildDots, 150); });

    buildDots(); start();
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
