/* ==========================================================================
   Shalom DS — Lote A: comportamento de navegação
   drawer · tabs · accordion · menu

   Vanilla, sem dependência, sem build, mesmo padrão de js/shalom-ds.js:
   delegação no document, API por data-attribute, eventos sh:* canceláveis.
   Não edita nem depende de shalom-ds.js — carregue os dois com defer, em
   qualquer ordem:

     <script src="/ds/v2/js/shalom-ds.js" defer></script>
     <script src="/ds/v2/js/shalom-ds-navigation.js" defer></script>

   PROGRESSIVO até onde o HTML permite. sh-accordion é <details>/<summary>
   nativo: continua abrindo, fechando e sendo buscável com Ctrl+F sem uma
   linha deste arquivo. sh-drawer é <dialog> nativo: sem JS ele nunca abre
   (não existe gesto declarativo para showModal()), mas também não trava
   nada — o gatilho continua sendo um <button> normal. sh-tabs e sh-menu
   dependem deste arquivo para trocar de painel/abrir o menu: sem ele, a
   aba e o item marcados no HTML como o estado inicial permanecem visíveis,
   e nada mais no documento fica ilegível por causa disso.

   --------------------------------------------------------------------------
   CONTRATO — a API é o atributo no HTML
   --------------------------------------------------------------------------

   1. drawer — <dialog class="sh-drawer"> aberto com showModal(). Foco
      preso, Esc e inert no resto da página são o próprio <dialog>; este
      módulo só decide QUANDO abrir/fechar e anima a troca.

      data-sh-drawer-open="#id"    abre o <dialog> #id, guarda quem pediu
      data-sh-drawer-close         fecha o <dialog> ancestral mais próximo
      data-sh-drawer-close="#id"   fecha o <dialog> #id

      Fecha também: clique fora do painel (::backdrop ou a própria área do
      <dialog>), Esc (evento nativo "cancel", com a animação de saída no
      lugar do fechamento instantâneo do navegador) e clique em qualquer
      <a href> dentro de .sh-drawer__body (a navegação real acontece, o
      drawer só não fica aberto por cima do destino).

      Se o gatilho de abertura estiver dentro de um .sh-header, este módulo
      marca data-menu="open" nele ao abrir e data-menu="closed" ao fechar —
      nenhum atributo extra é necessário no HTML para isso.

      Eventos: sh:drawer-open / sh:drawer-close no <dialog>, canceláveis
      (preventDefault() no listener impede a abertura ou o fechamento).

   2. tabs — role="tablist" > [role="tab"] ligadas a [role="tabpanel"] por
      aria-controls/aria-labelledby. Clique ou seta ativam a aba (ativação
      automática: mover o foco já troca o painel, como abas de sistema).

      Teclado: ArrowLeft/ArrowRight movem entre abas habilitadas; Home/End
      vão para a primeira/última; abas [disabled] ou [aria-disabled="true"]
      são puladas. tabindex fica rotativo (0 na selecionada, -1 nas outras).

      Evento: sh:tabs-change na aba, cancelável — preventDefault() impede a
      troca antes de qualquer painel mudar de [hidden].

   3. accordion — <details class="sh-accordion__item"> é nativo; nenhum
      atributo deste módulo é necessário para abrir ou fechar. Ele só
      espelha o ciclo de vida nativo em eventos sh:*, para quem quiser
      interceptar (analytics, carregar conteúdo tardio, impedir a abertura):

      sh:accordion-beforetoggle   cancelável — preventDefault() chama
                                  preventDefault() no "beforetoggle" nativo
                                  e o item não abre/fecha
      sh:accordion-toggle         avisa depois de já ter mudado; não
                                  cancelável, o nativo já aconteceu

   4. menu — gatilho com [data-sh-menu-toggle="#id"] alterna o [hidden] de
      .sh-menu#id. O gatilho precisa de aria-haspopup="menu" e
      aria-expanded no HTML (este módulo só troca o valor).

      Teclado, com o menu aberto: ArrowDown/ArrowUp navegam os
      [role="menuitem"] não desabilitados; Home/End vão para o primeiro/
      último; Esc fecha e devolve o foco ao gatilho; Tab fecha sem roubar
      a tabulação. Clique fora fecha. Abrir um menu fecha qualquer outro
      que já estivesse aberto.

      Eventos: sh:menu-open / sh:menu-close no .sh-menu, canceláveis.

   --------------------------------------------------------------------------
   API de programa (opcional)
   --------------------------------------------------------------------------
     ShalomDSNavigation.version
     ShalomDSNavigation.closeAllMenus()        fecha o menu aberto, se houver
     ShalomDSNavigation.closeDrawer(dialogEl)   fecha um <dialog> por código
     ShalomDSNavigation.refresh(root = document) reaplica o tabindex rotativo
   ========================================================================== */

(function (window, document) {
  'use strict';

  var VERSION = '2.0.0';

  /* ---------------------------------------------------------------- util */

  function closest(el, selector) {
    return el && el.closest ? el.closest(selector) : null;
  }

  function emit(el, name, detail) {
    var ev = new CustomEvent(name, {
      bubbles: true,
      cancelable: true,
      detail: detail || {}
    });
    return el.dispatchEvent(ev);
  }

  function motionMs(el, fallback) {
    if (!el || !window.getComputedStyle) return fallback;
    var css = window.getComputedStyle(el);
    var values = (css.transitionDuration || '').split(',').map(function (value) {
      var text = value.trim();
      if (text.slice(-2) === 'ms') return parseFloat(text) || 0;
      if (text.slice(-1) === 's') return (parseFloat(text) || 0) * 1000;
      return 0;
    });
    var duration = Math.max.apply(Math, values);
    return duration > 0 ? duration : fallback;
  }

  /* --------------------------------------------- trava de rolagem (delegada) */

  /* A gaveta é um overlay como o modal e a folha, e a página não pode rolar
     por trás dela. Quem conta overlays abertos é shalom-ds-surface.js, num
     contador único — manter um segundo contador aqui traria de volta o bug que
     aquele contador existe para evitar: com gaveta e modal abertos ao mesmo
     tempo, fechar um destravaria a página com o outro ainda aberto.

     A resolução é em tempo de chamada, não de carga: a ordem dos <script> na
     página deixa de importar. Sem shalom-ds-surface.js na página, a trava
     local abaixo cobre o caso de uma gaveta sozinha — que é o único possível
     quando o arquivo de superfícies não está presente.

     O delegado é resolvido UMA vez, na primeira trava, e fica cacheado: travar
     por um mecanismo e destravar pelo outro deixaria um dos contadores
     desequilibrado para sempre. */
  var travaLocal = 0;
  var delegado;   /* undefined = ainda não resolvido; null = não há delegado */

  function resolverDelegado() {
    if (delegado === undefined) {
      var s = window.ShalomSurface;
      delegado = (s && s.lockScroll && s.unlockScroll) ? s : null;
    }
    return delegado;
  }

  function travarRolagem() {
    var d = resolverDelegado();
    if (d) return d.lockScroll();
    if (travaLocal++ > 0) return;
    var folga = window.innerWidth - document.documentElement.clientWidth;
    if (folga > 0) document.documentElement.style.setProperty('--sh-scroll-lock-gutter', folga + 'px');
    document.documentElement.setAttribute('data-sh-scroll-lock', '');
  }

  function destravarRolagem() {
    var d = resolverDelegado();
    if (d) return d.unlockScroll();
    if (travaLocal > 0) travaLocal--;
    if (travaLocal > 0) return;
    document.documentElement.removeAttribute('data-sh-scroll-lock');
    document.documentElement.style.removeProperty('--sh-scroll-lock-gutter');
  }

  /* -------------------------------------------------------------- drawer */

  var drawer = {
    OPEN_TRIGGER: '[data-sh-drawer-open]',
    CLOSE_TRIGGER: '[data-sh-drawer-close]',
    triggersFor: function (dialogEl) {
      if (!dialogEl.id) return [];
      return Array.prototype.slice.call(
        document.querySelectorAll('[data-sh-drawer-open="#' + dialogEl.id + '"]')
      );
    },

    open: function (dialogEl, trigger) {
      if (!dialogEl || dialogEl.open) return;
      if (!emit(dialogEl, 'sh:drawer-open', { trigger: trigger || null })) return;

      dialogEl.__shTrigger = trigger || null;
      dialogEl.showModal();
      travarRolagem();

      var header = trigger && closest(trigger, '.sh-header');
      if (header) header.setAttribute('data-menu', 'open');
      drawer.triggersFor(dialogEl).forEach(function (t) { t.setAttribute('aria-expanded', 'true'); });

      // Força um reflow antes de trocar o estado: garante que o navegador já
      // pintou a posição fechada, e a transição para "open" corre de verdade
      // em vez de saltar direto para o fim.
      var panel = dialogEl.querySelector('.sh-drawer__panel');
      void (panel || dialogEl).offsetWidth;
      dialogEl.setAttribute('data-state', 'open');
    },

    close: function (dialogEl) {
      if (!dialogEl || !dialogEl.open || dialogEl.getAttribute('data-state') === 'closed') return;
      if (!emit(dialogEl, 'sh:drawer-close', {})) return;

      dialogEl.setAttribute('data-state', 'closed');

      var panel = dialogEl.querySelector('.sh-drawer__panel');
      var done = false;
      var timer = window.setTimeout(finish, motionMs(panel || dialogEl, 480) + 80);

      function finish() {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        if (panel) panel.removeEventListener('transitionend', onEnd);
        if (dialogEl.open) dialogEl.close();
        destravarRolagem();   /* par de travarRolagem() em open(); `done` garante uma vez só */

        var trigger = dialogEl.__shTrigger;
        var header = trigger && closest(trigger, '.sh-header');
        if (header) header.setAttribute('data-menu', 'closed');
        drawer.triggersFor(dialogEl).forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });

        dialogEl.__shTrigger = null;
        if (trigger && typeof trigger.focus === 'function') trigger.focus({ preventScroll: true });
      }
      function onEnd(ev) {
        if (ev.target === panel && ev.propertyName === 'translate') finish();
      }
      if (panel) panel.addEventListener('transitionend', onEnd);
    },

    onClick: function (event) {
      var openTrigger = closest(event.target, drawer.OPEN_TRIGGER);
      if (openTrigger) {
        event.preventDefault();
        drawer.open(document.querySelector(openTrigger.getAttribute('data-sh-drawer-open')), openTrigger);
        return;
      }

      var closeTrigger = closest(event.target, drawer.CLOSE_TRIGGER);
      if (closeTrigger) {
        event.preventDefault();
        var selector = closeTrigger.getAttribute('data-sh-drawer-close');
        drawer.close(selector ? document.querySelector(selector) : closest(closeTrigger, '.sh-drawer'));
        return;
      }

      // Clique fora do painel: o alvo do clique é o próprio <dialog> — tanto
      // no ::backdrop nativo quanto na área do <dialog> não coberta pelo
      // .sh-drawer__panel (ver navigation.css: o <dialog> ocupa a tela toda).
      if (event.target.classList && event.target.classList.contains('sh-drawer')) {
        drawer.close(event.target);
        return;
      }

      // Link real dentro do corpo: deixa a navegação acontecer e fecha.
      var link = closest(event.target, '.sh-drawer__body a[href]');
      if (link) {
        var host = closest(link, '.sh-drawer');
        if (host && host.open) drawer.close(host);
      }
    },

    onCancel: function (event) {
      if (!event.target.classList || !event.target.classList.contains('sh-drawer')) return;
      event.preventDefault(); // troca o fechamento instantâneo do Esc pela transição
      drawer.close(event.target);
    }
  };

  document.addEventListener('click', drawer.onClick);
  document.addEventListener('cancel', drawer.onCancel, true); // "cancel" não sobe: precisa de captura

  /* ---------------------------------------------------------------- tabs */

  var tabs = {
    LIST: '[role="tablist"]',
    TAB: '[role="tab"]',

    tabsIn: function (list) {
      return Array.prototype.slice.call(list.querySelectorAll(tabs.TAB));
    },
    enabled: function (tab) {
      return !tab.disabled && tab.getAttribute('aria-disabled') !== 'true';
    },
    panelFor: function (tab) {
      var id = tab.getAttribute('aria-controls');
      return id ? document.getElementById(id) : null;
    },

    activate: function (tab, opts) {
      opts = opts || {};
      var list = closest(tab, tabs.LIST);
      if (!list || !tabs.enabled(tab)) return;
      if (!emit(tab, 'sh:tabs-change', { tab: tab, panel: tabs.panelFor(tab) })) return;

      tabs.tabsIn(list).forEach(function (t) {
        var selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        var panel = tabs.panelFor(t);
        if (panel) panel.hidden = !selected;
      });

      if (opts.focus) tab.focus();
    },

    onClick: function (event) {
      var tab = closest(event.target, tabs.TAB);
      if (tab) tabs.activate(tab, { focus: false });
    },

    onKeydown: function (event) {
      var list = closest(event.target, tabs.LIST);
      var current = list && closest(event.target, tabs.TAB);
      if (!current) return;

      var enabledTabs = tabs.tabsIn(list).filter(tabs.enabled);
      if (!enabledTabs.length) return;
      var i = enabledTabs.indexOf(current);
      var moveBy = { ArrowRight: 1, ArrowLeft: -1 }[event.key];

      if (moveBy) {
        event.preventDefault();
        var next = enabledTabs[((i < 0 ? 0 : i) + moveBy + enabledTabs.length) % enabledTabs.length];
        tabs.activate(next, { focus: true });
      } else if (event.key === 'Home') {
        event.preventDefault();
        tabs.activate(enabledTabs[0], { focus: true });
      } else if (event.key === 'End') {
        event.preventDefault();
        tabs.activate(enabledTabs[enabledTabs.length - 1], { focus: true });
      }
    },

    refresh: function (root) {
      Array.prototype.forEach.call((root || document).querySelectorAll(tabs.LIST), function (list) {
        var all = tabs.tabsIn(list);
        var hasSelected = all.some(function (t) { return t.getAttribute('aria-selected') === 'true'; });
        if (!hasSelected) {
          var first = all.filter(tabs.enabled)[0];
          if (first) first.setAttribute('aria-selected', 'true');
        }
        all.forEach(function (t) {
          var selected = t.getAttribute('aria-selected') === 'true';
          t.tabIndex = selected ? 0 : -1;
          var panel = tabs.panelFor(t);
          if (panel) panel.hidden = !selected;
        });
      });
    }
  };

  document.addEventListener('click', tabs.onClick);
  document.addEventListener('keydown', tabs.onKeydown);

  /* ----------------------------------------------------------- accordion */

  var accordion = {
    ITEM: 'sh-accordion__item',

    onBeforeToggle: function (event) {
      var item = event.target;
      if (!item.classList || !item.classList.contains(accordion.ITEM)) return;
      var willOpen = event.newState ? event.newState === 'open' : !item.open;
      if (!emit(item, 'sh:accordion-beforetoggle', { open: willOpen })) event.preventDefault();
    },

    onToggle: function (event) {
      var item = event.target;
      if (!item.classList || !item.classList.contains(accordion.ITEM)) return;
      emit(item, 'sh:accordion-toggle', { open: item.open });
    }
  };

  // Nem "beforetoggle" nem "toggle" sobem em <details> — escuta na captura.
  document.addEventListener('beforetoggle', accordion.onBeforeToggle, true);
  document.addEventListener('toggle', accordion.onToggle, true);

  /* ---------------------------------------------------------------- menu */

  var menu = {
    TRIGGER: '[data-sh-menu-toggle]',
    ITEM: '[role="menuitem"]',
    open: null,     // .sh-menu atualmente aberto, ou null
    trigger: null,  // gatilho correspondente

    itemsIn: function (menuEl) {
      return Array.prototype.slice.call(menuEl.querySelectorAll(menu.ITEM))
        .filter(function (it) { return it.getAttribute('aria-disabled') !== 'true'; });
    },

    openMenu: function (menuEl, trigger) {
      if (!menuEl || menuEl === menu.open) return;
      if (menu.open) menu.closeMenu({ returnFocus: false });
      if (!emit(menuEl, 'sh:menu-open', { trigger: trigger })) return;

      menuEl.hidden = false;
      menuEl.setAttribute('data-state', 'closed');
      void menuEl.offsetWidth;
      menuEl.setAttribute('data-state', 'open');
      trigger.setAttribute('aria-expanded', 'true');
      menu.open = menuEl;
      menu.trigger = trigger;

      var items = menu.itemsIn(menuEl);
      if (items.length) items[0].focus();
    },

    closeMenu: function (opts) {
      opts = opts || {};
      var menuEl = menu.open;
      var trigger = menu.trigger;
      if (!menuEl) return;
      if (!emit(menuEl, 'sh:menu-close', {})) return;

      menuEl.setAttribute('data-state', 'closing');
      var duration = motionMs(menuEl, 480);
      window.setTimeout(function () {
        if (menuEl === menu.open || menuEl.getAttribute('data-state') !== 'closing') return;
        menuEl.hidden = true;
        menuEl.removeAttribute('data-state');
      }, duration + 20);
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      menu.open = null;
      menu.trigger = null;

      if (opts.returnFocus !== false && trigger && typeof trigger.focus === 'function') trigger.focus();
    },

    onClick: function (event) {
      var trigger = closest(event.target, menu.TRIGGER);
      if (trigger) {
        event.preventDefault();
        var selector = trigger.getAttribute('data-sh-menu-toggle');
        var menuEl = selector ? document.querySelector(selector) : null;
        if (menuEl === menu.open) menu.closeMenu({ returnFocus: false });
        else menu.openMenu(menuEl, trigger);
        return;
      }
      if (menu.open && !closest(event.target, '.sh-menu')) menu.closeMenu({ returnFocus: false });
    },

    onKeydown: function (event) {
      if (!menu.open) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        menu.closeMenu();
        return;
      }

      var withinMenu = closest(event.target, '.sh-menu') === menu.open;
      if (!withinMenu && event.target !== menu.trigger) return;

      if (event.key === 'Tab') { menu.closeMenu({ returnFocus: false }); return; }

      var items = menu.itemsIn(menu.open);
      if (!items.length) return;
      var i = items.indexOf(document.activeElement);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        items[(i + 1 + items.length) % items.length].focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        items[(i - 1 + items.length) % items.length].focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        items[0].focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        items[items.length - 1].focus();
      }
    },

    onFocusOut: function () {
      if (!menu.open) return;
      window.setTimeout(function () {
        var active = document.activeElement;
        if (active && (closest(active, '.sh-menu') === menu.open || active === menu.trigger)) return;
        menu.closeMenu({ returnFocus: false });
      }, 0);
    }
  };

  document.addEventListener('click', menu.onClick);
  document.addEventListener('keydown', menu.onKeydown);
  document.addEventListener('focusout', menu.onFocusOut);

  /* ----------------------------------------------------------------- init */

  function refresh(root) { tabs.refresh(root); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { refresh(); });
  } else {
    refresh();
  }

  window.ShalomDSNavigation = {
    version: VERSION,
    closeAllMenus: function () { if (menu.open) menu.closeMenu({ returnFocus: false }); },
    closeDrawer: function (el) { drawer.close(el); },
    refresh: refresh
  };

}(window, document));
