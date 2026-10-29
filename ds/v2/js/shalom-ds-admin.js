/* ==========================================================================
   Shalom DS — Lote G: comportamento do painel administrativo
   sh-app-shell — colapso da barra lateral (desktop) e painel sobreposto
   (celular). Vanilla, sem dependência, mesmo padrão de js/shalom-ds.js.
   Carregue com `defer`, em qualquer ordem em relação aos outros arquivos:

     <script src="/ds/v2/js/shalom-ds.js"             defer></script>
     <script src="/ds/v2/js/shalom-ds-navigation.js"  defer></script>
     <script src="/ds/v2/js/shalom-ds-admin.js"       defer></script>

   PROGRESSIVO, com o mesmo grau de honestidade que sh-drawer já assume em
   navigation.js. Sem este arquivo:
     · `.sh-app-shell[data-collapsed]` escrito no HTML continua colapsando
       a barra — o CSS não depende de JS para renderizar o trilho;
     · o botão de colapsar (`[data-sh-shell-collapse]`) fica visível mas
       não faz nada — nenhum componente vira ilegível por isso;
     · o botão de menu do celular (`[data-sh-shell-menu]`) também não abre
       o painel sobreposto — a barra permanece fora da tela abaixo de
       64rem. É a MESMA degradação que o próprio sh-drawer aceita
       ("o gatilho continua sendo um <button> normal"). Quem não pode
       assumir JS no celular usa a variante `sh-app-shell--mobile`
       (barra inferior, sh-nav--bottom do Lote A — não depende de JS).

   DELEGAÇÃO. Escuta no `document`; um app-shell inserido depois (SPA,
   fetch) funciona sem reinicializar nada.

   --------------------------------------------------------------------------
   CONTRATO — a API é o atributo no HTML
   --------------------------------------------------------------------------

   1. colapso da barra (desktop, >=64rem)

      <button class="sh-btn sh-btn--ghost sh-btn--icon sh-btn--sm
                     sh-app-shell__collapse-btn" data-sh-shell-collapse
              aria-expanded="true" aria-controls="app-sidebar">…</button>

      Alterna [data-collapsed] no `.sh-app-shell` mais próximo do gatilho.
      Lembra a escolha em localStorage (chave "sh-shell-collapsed") e
      aplica de novo na carga seguinte — é o exemplo que a especificação
      do lote cita ("colapso de sidebar com persistência"). Evento:
      sh:shell-collapse no `.sh-app-shell`, cancelável — preventDefault()
      no listener mantém o estado anterior.

   2. painel sobreposto (celular, <64rem)

      <button class="sh-btn sh-btn--ghost sh-btn--icon sh-app-shell__menu-btn"
              data-sh-shell-menu aria-expanded="false"
              aria-controls="app-sidebar">…</button>
      <aside class="sh-app-shell__sidebar" id="app-sidebar">…</aside>
      <button class="sh-app-shell__scrim" data-sh-shell-menu tabindex="-1"
              aria-hidden="true"></button>

      Alterna [data-state="open"|"closed"] em `.sh-app-shell__sidebar`.
      Qualquer elemento com [data-sh-shell-menu] dentro do MESMO
      `.sh-app-shell` (topbar ou o próprio scrim) serve de gatilho — não
      precisa ser sempre o mesmo botão. Fecha também: Esc, clique num link
      de navegação dentro da barra (a navegação acontece, o painel só não
      fica aberto por cima do destino) e redimensionamento para >=64rem
      (o painel sobreposto não faz sentido em desktop). Devolve o foco ao
      gatilho que abriu. Evento: sh:shell-menu no `.sh-app-shell__sidebar`,
      cancelável.

   --------------------------------------------------------------------------
   API de programa (opcional)
   --------------------------------------------------------------------------
     ShalomDSAdmin.version                    string
     ShalomDSAdmin.setCollapsed(shell, bool)  aplica o colapso por código
     ShalomDSAdmin.closeMenu(shell)           fecha o painel sobreposto
   ========================================================================== */

(function (window, document) {
  'use strict';

  var VERSION = '2.0.0';
  var STORAGE_KEY = 'sh-shell-collapsed';
  var DESKTOP_QUERY = '(min-width: 64rem)';

  function closest(el, selector) {
    return el && el.closest ? el.closest(selector) : null;
  }

  function emit(el, name, detail) {
    return el.dispatchEvent(new CustomEvent(name, {
      bubbles: true, cancelable: true, detail: detail || {}
    }));
  }

  function isDesktop() {
    return window.matchMedia && window.matchMedia(DESKTOP_QUERY).matches;
  }

  function readStoredPreference() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch (e) {
      return false; // modo privado / storage bloqueado: começa expandida
    }
  }

  function storePreference(collapsed) {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? 'true' : 'false');
    } catch (e) {
      /* sem storage disponível — a preferência só dura a sessão em memória */
    }
  }

  function collapseTriggersFor(shell) {
    return Array.prototype.slice.call(shell.querySelectorAll('[data-sh-shell-collapse]'));
  }

  /* ---------------------------------------------------------- colapso -- */

  var collapse = {
    apply: function (shell, on, opts) {
      opts = opts || {};
      var already = shell.hasAttribute('data-collapsed');
      if (already === on) return;
      if (!opts.silent && !emit(shell, 'sh:shell-collapse', { collapsed: on })) return;

      if (on) shell.setAttribute('data-collapsed', '');
      else shell.removeAttribute('data-collapsed');

      collapseTriggersFor(shell).forEach(function (btn) {
        btn.setAttribute('aria-expanded', String(!on));
      });

      if (!opts.silent) storePreference(on);
    },

    toggle: function (shell) {
      collapse.apply(shell, !shell.hasAttribute('data-collapsed'));
    },

    /* Aplica a preferência salva só no desktop — no celular a barra é um
       painel sobreposto, e [data-collapsed] não governa a visibilidade
       dela (ver o bloco de mídia em components/admin.css). Começar
       colapsada por engano no celular escondia a barra sem dar jeito de
       reabrir antes do primeiro clique no menu. */
    initFrom: function (shell) {
      if (!isDesktop()) return;
      var stored = readStoredPreference();
      if (stored) collapse.apply(shell, true, { silent: true });
    }
  };

  document.addEventListener('click', function (event) {
    var trigger = closest(event.target, '[data-sh-shell-collapse]');
    if (!trigger) return;
    var shell = closest(trigger, '.sh-app-shell');
    if (!shell) return;
    event.preventDefault();
    collapse.toggle(shell);
  });

  /* -------------------------------------------------------- menu mobile */

  var menu = {
    lastTrigger: new WeakMap(), /* sidebar -> gatilho que abriu */

    triggersFor: function (shell) {
      return Array.prototype.slice.call(shell.querySelectorAll('[data-sh-shell-menu]'));
    },

    open: function (shell, sidebar, trigger) {
      if (sidebar.getAttribute('data-state') === 'open') return;
      if (!emit(sidebar, 'sh:shell-menu', { open: true })) return;

      sidebar.setAttribute('data-state', 'open');
      menu.lastTrigger.set(sidebar, trigger || null);
      menu.triggersFor(shell).forEach(function (btn) {
        if (btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', 'true');
      });

      var firstLink = sidebar.querySelector('a[href], button:not([disabled])');
      if (firstLink) firstLink.focus({ preventScroll: true });
    },

    close: function (shell, sidebar) {
      if (sidebar.getAttribute('data-state') !== 'open') return;
      if (!emit(sidebar, 'sh:shell-menu', { open: false })) return;

      sidebar.setAttribute('data-state', 'closed');
      menu.triggersFor(shell).forEach(function (btn) {
        if (btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', 'false');
      });

      var trigger = menu.lastTrigger.get(sidebar);
      menu.lastTrigger.delete(sidebar);
      if (trigger && trigger.isConnected && typeof trigger.focus === 'function') {
        trigger.focus({ preventScroll: true });
      }
    },

    toggle: function (shell, sidebar, trigger) {
      if (sidebar.getAttribute('data-state') === 'open') menu.close(shell, sidebar);
      else menu.open(shell, sidebar, trigger);
    }
  };

  document.addEventListener('click', function (event) {
    var trigger = closest(event.target, '[data-sh-shell-menu]');
    if (!trigger) return;
    var shell = closest(trigger, '.sh-app-shell');
    var sidebar = shell && shell.querySelector('.sh-app-shell__sidebar');
    if (!shell || !sidebar) return;
    event.preventDefault();
    menu.toggle(shell, sidebar, trigger);
  });

  /* Link real dentro da barra: deixa a navegação acontecer e fecha, para
     o painel não ficar por cima do destino — mesmo padrão de sh-drawer. */
  document.addEventListener('click', function (event) {
    var link = closest(event.target, '.sh-app-shell__sidebar a[href]');
    if (!link) return;
    var sidebar = closest(link, '.sh-app-shell__sidebar');
    var shell = sidebar && closest(sidebar, '.sh-app-shell');
    if (shell && sidebar && sidebar.getAttribute('data-state') === 'open') {
      menu.close(shell, sidebar);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' && event.key !== 'Esc') return;
    var openSidebar = document.querySelector('.sh-app-shell__sidebar[data-state="open"]');
    if (!openSidebar) return;
    var shell = closest(openSidebar, '.sh-app-shell');
    if (shell) menu.close(shell, openSidebar);
  });

  /* Virar para desktop com o painel aberto: o CSS já esconde o scrim e tira
     a barra do fluxo sobreposto, mas o estado lógico (aria-expanded, foco
     pendente) fica quieto até fechar explicitamente — evita reabrir sozinho
     ao voltar para o celular. */
  window.addEventListener('resize', function () {
    if (!isDesktop()) return;
    var openSidebar = document.querySelector('.sh-app-shell__sidebar[data-state="open"]');
    if (!openSidebar) return;
    var shell = closest(openSidebar, '.sh-app-shell');
    if (shell) menu.close(shell, openSidebar);
  });

  /* ----------------------------------------------------------------- init */

  function refresh(root) {
    var shells = (root || document).querySelectorAll('.sh-app-shell');
    for (var i = 0; i < shells.length; i++) collapse.initFrom(shells[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { refresh(); });
  } else {
    refresh();
  }

  window.ShalomDSAdmin = {
    version: VERSION,
    setCollapsed: function (shell, on) { collapse.apply(shell, !!on); },
    closeMenu: function (shell) {
      var sidebar = shell && shell.querySelector('.sh-app-shell__sidebar');
      if (sidebar) menu.close(shell, sidebar);
    },
    refresh: refresh
  };

}(window, document));
