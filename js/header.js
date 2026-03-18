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
        'width:44px;height:44px;border-radius:50%;border:1px solid var(--border,#e5e7eb);' +
        'background:var(--bg-card,#fff);color:var(--text,#111);' +
        'box-shadow:0 4px 14px rgba(0,0,0,.12);' +
        'cursor:pointer;display:flex;align-items:center;justify-content:center;' +
        'transition:transform .2s ease,box-shadow .2s ease,background .2s ease;' +
        'font-size:0;line-height:0;padding:0;' +
      '}' +
      '.theme-toggle:hover{transform:scale(1.1);box-shadow:0 6px 20px rgba(0,0,0,.18);}' +
      '.theme-toggle svg{width:20px;height:20px;fill:currentColor;}' +
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
        // Sol (mudar para claro)
        target.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-4a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0V4a1 1 0 0 1 1-1Zm0 17a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0v-1a1 1 0 0 1 1-1ZM4 12a1 1 0 0 1-1 1H2a1 1 0 0 1 0-2h1a1 1 0 0 1 1 1Zm17 0a1 1 0 0 1 1 0h1a1 1 0 0 1 0 2h-1a1 1 0 0 1-1-1ZM6.34 6.34a1 1 0 0 1 0-1.41l.7-.71a1 1 0 1 1 1.42 1.42l-.71.7a1 1 0 0 1-1.41 0Zm11.32 11.32a1 1 0 0 1 0-1.41l.7-.71a1 1 0 1 1 1.42 1.42l-.71.7a1 1 0 0 1-1.41 0ZM6.34 17.66a1 1 0 0 1-1.41 0l-.71-.7a1 1 0 1 1 1.42-1.42l.7.71a1 1 0 0 1 0 1.41ZM17.66 6.34a1 1 0 0 1-1.41 0l-.71-.7a1 1 0 0 1 1.42-1.42l.7.71a1 1 0 0 1 0 1.41Z"/></svg>';
      } else {
        // Lua (mudar para escuro)
        target.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9c0-.5-.04-.99-.13-1.47A7.5 7.5 0 0 1 10.47 4.13 8.96 8.96 0 0 0 12 3Z"/></svg>';
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createToggle);
    } else {
      createToggle();
    }
  })();
})();
