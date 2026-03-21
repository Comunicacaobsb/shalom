// ================================
// Header.js — Injecao dinamica de recursos
// ================================
// Carrega: Bootstrap CSS, Google Fonts, Favicons, Base CSS, Google Analytics
// Flags de controle (definir ANTES de importar este script):
//   window.skipFonts = true    — nao carregar Montserrat
//   window.skipBaseCSS = true  — nao carregar scss/styles.css

(function () {
  var head = document.head;

  // ---- Detectar basePath a partir do src deste script ----
  function getBasePath() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('header.js') !== -1) {
        return src.replace(/js\/header\.js.*$/, '');
      }
    }
    return '';
  }

  var basePath = getBasePath();

  // ---- Bootstrap CSS (CDN) ----
  var bootstrap = document.createElement('link');
  bootstrap.rel = 'stylesheet';
  bootstrap.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css';
  head.appendChild(bootstrap);

  // ---- Base CSS (scss/styles.css) ----
  if (!window.skipBaseCSS) {
    var baseCSS = document.createElement('link');
    baseCSS.rel = 'stylesheet';
    baseCSS.href = basePath + 'scss/styles.css';
    head.appendChild(baseCSS);
  }

  // ---- Google Fonts (Montserrat) ----
  if (!window.skipFonts) {
    var preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    head.appendChild(preconnect1);

    var preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    head.appendChild(preconnect2);

    var font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap';
    head.appendChild(font);
  }

  // ---- Favicons ----
  var favicons = [
    { rel: 'apple-touch-icon', sizes: '180x180', href: 'apple-touch-icon.png' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: 'favicon-16x16.png' }
  ];

  favicons.forEach(function (fav) {
    var link = document.createElement('link');
    link.rel = fav.rel;
    if (fav.sizes) link.sizes = fav.sizes;
    if (fav.type) link.type = fav.type;
    link.href = basePath + 'favicon/' + fav.href;
    head.appendChild(link);
  });

  // ---- Google Analytics ----
  var gtagScript = document.createElement('script');
  gtagScript.async = true;
  gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-YXNT4YQP1H';
  head.appendChild(gtagScript);

  var gtagConfig = document.createElement('script');
  gtagConfig.innerHTML =
    'window.dataLayer = window.dataLayer || [];' +
    'function gtag(){dataLayer.push(arguments);}' +
    "gtag('js', new Date());" +
    "gtag('config', 'G-YXNT4YQP1H');";
  head.appendChild(gtagConfig);

  // ---- Botão Início (voltar à página principal) ----
  (function initHomeButton() {
    var homeCSS = document.createElement('style');
    homeCSS.textContent =
      '.home-btn{' +
        'position:fixed;top:1.25rem;left:1.25rem;z-index:9990;' +
        'width:44px;height:44px;border-radius:50%;border:1px solid var(--border,#e5e7eb);' +
        'background:var(--bg-card,#fff);color:var(--text,#111);' +
        'box-shadow:0 4px 14px rgba(0,0,0,.12);' +
        'cursor:pointer;display:flex;align-items:center;justify-content:center;' +
        'transition:transform .2s ease,box-shadow .2s ease,background .2s ease;' +
        'text-decoration:none;padding:0;' +
      '}' +
      '.home-btn:hover{transform:scale(1.1);box-shadow:0 6px 20px rgba(0,0,0,.18);color:var(--text,#111);}' +
      '.home-btn svg{width:20px;height:20px;}' +
      '@media print{.home-btn{display:none;}}';
    head.appendChild(homeCSS);

    function createHomeBtn() {
      // Não exibe na página raiz/25anos (que já tem seu próprio menu)
      var path = window.location.pathname;
      if (path === '/' || path === '/index.html' || path.indexOf('/25anos') !== -1) return;

      var a = document.createElement('a');
      a.className = 'home-btn';
      a.href = basePath + '25anos/';
      a.setAttribute('aria-label', 'Voltar ao início');
      a.setAttribute('title', 'Início');
      // Ícone home (Feather style)
      a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
      document.body.appendChild(a);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createHomeBtn);
    } else {
      createHomeBtn();
    }
  })();

  // ---- Theme Toggle (dark/light) ----
  (function initTheme() {
    var STORAGE_KEY = 'shalom-theme';
    var root = document.documentElement;

    // 1) Determinar tema inicial: localStorage > preferência do sistema
    var saved = localStorage.getItem(STORAGE_KEY);
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var current = saved || (prefersDark ? 'dark' : 'light');
    root.setAttribute('data-theme', current);

    // 2) Reagir a mudanças na preferência do sistema (se não houver escolha manual)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem(STORAGE_KEY)) {
        var theme = e.matches ? 'dark' : 'light';
        root.setAttribute('data-theme', theme);
        updateIcon(theme);
      }
    });

    // 3) Injetar CSS do botão toggle
    var toggleCSS = document.createElement('style');
    toggleCSS.textContent =
      '.theme-toggle{' +
        'position:fixed;bottom:1.25rem;left:1.25rem;z-index:9990;' +
        'width:44px;height:44px;border-radius:50%;border:1px solid #e5e7eb;' +
        'background:#fff;color:#111;' +
        'box-shadow:0 4px 14px rgba(0,0,0,.12);' +
        'cursor:pointer;display:flex;align-items:center;justify-content:center;' +
        'transition:transform .2s ease,box-shadow .2s ease,background .2s ease;' +
        'font-size:0;line-height:0;padding:0;' +
      '}' +
      '.theme-toggle:hover{transform:scale(1.1);box-shadow:0 6px 20px rgba(0,0,0,.18);}' +
      '.theme-toggle svg{width:20px;height:20px;}' +
      '[data-theme="dark"] .theme-toggle{background:#1e293b;color:#e2e8f0;border-color:#334155;}' +
      '@media print{.theme-toggle{display:none;}}';
    head.appendChild(toggleCSS);

    // 4) Criar botão quando o DOM estiver pronto
    function createToggle() {
      var btn = document.createElement('button');
      btn.className = 'theme-toggle';
      btn.setAttribute('aria-label', 'Alternar tema claro/escuro');
      btn.setAttribute('title', 'Alternar tema');
      updateIcon(current, btn);

      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE_KEY, next);
        updateIcon(next, btn);
      });

      document.body.appendChild(btn);
    }

    function updateIcon(theme, btn) {
      var target = btn || document.querySelector('.theme-toggle');
      if (!target) return;
      if (theme === 'dark') {
        // Sol — indica que está em dark, clique para light
        target.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
      } else {
        // Lua — indica que está em light, clique para dark
        target.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createToggle);
    } else {
      createToggle();
    }
  })();
})();
