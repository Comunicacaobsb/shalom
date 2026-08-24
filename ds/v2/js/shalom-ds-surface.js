/* ==========================================================================
   Shalom DS — comportamento das superfícies (Lote C)
   Vanilla, sem dependência, sem build. Carregue com `defer`:

     <script src="/ds/v2/js/shalom-ds.js"          defer></script>
     <script src="/ds/v2/js/shalom-ds-surface.js"  defer></script>

   Independente de shalom-ds.js: os dois podem ser carregados juntos, em
   qualquer ordem, ou sozinhos. Não há símbolo compartilhado.

   PROGRESSIVO, com uma ressalva honesta. Sem este arquivo:
     · sh-tooltip continua aparecendo em hover e em foco (é CSS);
     · sh-popover continua abrindo e fechando (é o [popover] do navegador),
       só aparece centralizado em vez de ancorado ao gatilho;
     · sh-copy continua com o valor legível e selecionável, só não copia;
     · sh-modal e sh-sheet PRECISAM de JS para abrir — <dialog> só entra em
       modo modal por showModal(). Onde o overlay é essencial, ofereça o
       caminho sem overlay (página dedicada), que é a recomendação da spec.

   DELEGAÇÃO. Tudo escuta no `document`, na fase de captura onde o evento não
   borbulha (`close`, `cancel`, `toggle`, `pointerleave`). Elemento inserido
   depois funciona sem re-inicializar nada.

   --------------------------------------------------------------------------
   CONTRATO — a API é o atributo no HTML
   --------------------------------------------------------------------------

   1. Overlay — sh-modal e sh-sheet

      <button class="sh-btn sh-btn--primary" data-sh-open="#cancelar">
        Cancelar inscrição
      </button>

      <dialog class="sh-modal sh-modal--sm" id="cancelar"
              aria-labelledby="cancelar-titulo">
        <div class="sh-modal__box"> … <button data-sh-close>…</button> … </div>
      </dialog>

      data-sh-open="#id"      abre o <dialog> alvo com showModal()
      data-sh-close           fecha o <dialog> ancestral
      data-sh-close="#id"     fecha o alvo
      data-sh-backdrop="static"  (no <dialog>) clique no backdrop NÃO fecha

      O que o <dialog> modal dá sozinho: foco preso, resto da página inerte,
      Esc, ::backdrop. O que este arquivo acrescenta:
        · trava de rolagem do corpo, com contador para overlays empilhados;
        · fechar por clique no backdrop (com guarda de pointerdown, para que
          arrastar de dentro para fora não feche);
        · devolução EXPLÍCITA do foco ao gatilho no fechamento;
        · eventos sh:open e sh:close, canceláveis.

   2. Popover — [popover] nativo

      <button class="sh-btn" popovertarget="filtros" aria-expanded="false">…</button>
      <div class="sh-popover" id="filtros" popover data-position="bottom">…</div>

      data-position="top|bottom|start|end"   lado preferido (padrão: bottom)
      Vira para o lado oposto sozinho quando não cabe, e encosta na margem da
      janela em vez de sair dela. O vão entre gatilho e painel é do CSS
      (--sh-space-2 por `translate`), não deste arquivo.
      Ao abrir: foca o primeiro focável e marca data-sh-anchored.
      Ao fechar: devolve o foco ao gatilho e sincroniza aria-expanded.

   3. Tooltip — sh-tooltip

      Hover, foco e persistência são CSS. Aqui entram duas coisas que CSS não
      alcança:
        · o "dispensável" da WCAG 1.4.13 — Esc marca data-dismissed="true";
          sair com o ponteiro ou com o foco limpa a marca. Se um diálogo
          estiver aberto, o mesmo Esc que dispensa a dica NÃO o fecha;
        · o enquadramento na janela — uma bolha centrada num gatilho colado na
          lateral do celular sairia da tela, e CSS não sabe onde o gatilho
          está. O ajuste vai por --sh-tooltip-shift e, nas posições laterais
          que não cabem, virando para baixo. Sem JS a dica ainda aparece.

      data-sh-position-base   guardado por este arquivo na primeira medida,
                              para saber ao que voltar depois de virar.

   4. Copiar — sh-copy

      <div class="sh-copy" data-sh-copy>
        <code class="sh-copy__value" id="pix">…</code>
        <button class="sh-btn sh-btn--sm sh-copy__button" data-sh-copy-button
                aria-describedby="pix" hidden>…</button>
        <span class="sh-copy__status" role="status" aria-live="polite"></span>
      </div>

      data-sh-copy                  marca o bloco
      data-sh-copy-value="…"        valor a copiar (padrão: texto de __value)
      data-sh-copy-done="Copiado"   confirmação (padrão: "Copiado")
      O botão pode nascer [hidden]: este arquivo o revela. Sem JS ele nunca
      aparece e o valor continua selecionável.
      Falha de área de transferência não fica em silêncio: o valor é
      selecionado e a região viva pede para copiar à mão.

   --------------------------------------------------------------------------
   API de programa (opcional)
   --------------------------------------------------------------------------
     ShalomSurface.version                  string
     ShalomSurface.open(alvo, gatilho)      abre um overlay
     ShalomSurface.close(alvo)              fecha um overlay
     ShalomSurface.position(popover)        reancora um popover aberto
     ShalomSurface.copy(bloco)              copia por código (Promise)
     ShalomSurface.refresh(raiz = document) revela botões de cópia novos

   Eventos (bubbles, cancelable): sh:open, sh:close, sh:copy.
   ========================================================================== */

(function (window, document) {
  'use strict';

  var VERSION = '2.0.0';

  var OVERLAY = '.sh-modal, .sh-sheet';
  var FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  /* Margem mínima entre o popover e a borda da janela. Não é cor nem espaço
     de desenho: é uma guarda de layout do algoritmo de posicionamento. */
  var VIEWPORT_MARGIN = 12;

  var root = document.documentElement;

  /* ---------------------------------------------------------------- util */

  function closest(el, selector) {
    return el && el.closest ? el.closest(selector) : null;
  }

  function emit(el, name, detail) {
    return el.dispatchEvent(new CustomEvent(name, {
      bubbles: true, cancelable: true, detail: detail || {}
    }));
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

  function resolve(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    return target.nodeType === 1 ? target : null;
  }

  function escapeId(id) {
    return (window.CSS && CSS.escape) ? CSS.escape(id) : id.replace(/"/g, '\\"');
  }

  function firstFocusable(container) {
    var pre = container.querySelector('[autofocus]');
    if (pre) return pre;
    var all = container.querySelectorAll(FOCUSABLE);
    for (var i = 0; i < all.length; i++) {
      if (all[i].offsetParent !== null || all[i].getClientRects().length) return all[i];
    }
    return null;
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(Math.max(value, min), max);
  }

  /* ------------------------------------------------- trava de rolagem */

  var locks = 0;

  function lockScroll() {
    if (locks++ > 0) return;
    var gutter = window.innerWidth - root.clientWidth;
    if (gutter > 0) root.style.setProperty('--sh-scroll-lock-gutter', gutter + 'px');
    root.setAttribute('data-sh-scroll-lock', '');
  }

  function unlockScroll() {
    if (locks > 0) locks--;
    if (locks > 0) return;
    root.removeAttribute('data-sh-scroll-lock');
    root.style.removeProperty('--sh-scroll-lock-gutter');
  }

  /* -------------------------------------------------------------- overlay */

  var openers = new WeakMap();   /* dialog -> elemento que abriu */

  var overlay = {
    open: function (target, trigger) {
      var dlg = resolve(target);
      if (!dlg || dlg.open) return false;
      if (!emit(dlg, 'sh:open', { trigger: trigger || null })) return false;

      openers.set(dlg, trigger || document.activeElement || null);

      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');          /* navegador sem <dialog> */

      lockScroll();
      dlg.setAttribute('data-state', 'closed');
      void dlg.offsetWidth;
      dlg.setAttribute('data-state', 'open');
      return true;
    },

    close: function (target, reason) {
      var dlg = resolve(target);
      if (!dlg || !dlg.open) return false;
      if (dlg.getAttribute('data-state') === 'closing') return false;
      if (!emit(dlg, 'sh:close', { reason: reason || 'script' })) return false;
      dlg.setAttribute('data-state', 'closing');
      var box = dlg.querySelector('.sh-modal__box, .sh-sheet__box') || dlg;
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        box.removeEventListener('transitionend', onEnd);
        if (typeof dlg.close === 'function') dlg.close();
        else dlg.removeAttribute('open');
        dlg.removeAttribute('data-state');
      };
      var onEnd = function (event) {
        if (event.target === box && event.propertyName === 'opacity') finish();
      };
      box.addEventListener('transitionend', onEnd);
      window.setTimeout(finish, motionMs(box, 480) + 80);
      return true;
    },

    /* Depois de fechado: destrava a página e devolve o foco ao gatilho.
       O <dialog> já devolve o foco por conta própria na maioria dos
       navegadores; aqui a devolução é garantida e vai por último. */
    afterClose: function (dlg) {
      unlockScroll();
      var trigger = openers.get(dlg);
      openers.delete(dlg);
      if (!trigger || !trigger.isConnected || typeof trigger.focus !== 'function') return;
      window.requestAnimationFrame(function () {
        if (document.querySelector('dialog[open]')) return;   /* overlay empilhado */
        trigger.focus({ preventScroll: true });
      });
    }
  };

  /* --------------------------------------------------------------- popover */

  var popoverTriggers = new WeakMap();
  var anchored = [];

  function triggerOf(pop) {
    if (popoverTriggers.has(pop)) {
      var known = popoverTriggers.get(pop);
      if (known && known.isConnected) return known;
    }
    if (!pop.id) return null;
    var found = document.querySelector('[popovertarget="' + escapeId(pop.id) + '"]');
    if (found) popoverTriggers.set(pop, found);
    return found;
  }

  /* Ancora o painel no gatilho. Quatro lados, virada automática quando não
     cabe, e clamp na janela. Sem biblioteca e sem observar mutação. */
  function position(pop) {
    if (!pop || !pop.matches(':popover-open')) return;

    var trigger = triggerOf(pop);
    if (!trigger) { pop.removeAttribute('data-sh-anchored'); return; }

    var side = pop.getAttribute('data-position') || 'bottom';
    var t = trigger.getBoundingClientRect();

    /* Mede com o painel encostado no início da janela: com inset em 50% a
       largura disponível cairia pela metade e max-content mediria errado. */
    pop.style.setProperty('--sh-popover-x', '0px');
    pop.style.setProperty('--sh-popover-y', '0px');
    var p = pop.getBoundingClientRect();
    var vw = root.clientWidth;
    var vh = root.clientHeight;

    var roomBelow = vh - t.bottom;
    var roomAbove = t.top;
    var roomEnd   = vw - t.right;
    var roomStart = t.left;

    if (side === 'bottom' && roomBelow < p.height + VIEWPORT_MARGIN && roomAbove > roomBelow) side = 'top';
    else if (side === 'top' && roomAbove < p.height + VIEWPORT_MARGIN && roomBelow > roomAbove) side = 'bottom';
    else if (side === 'end' && roomEnd < p.width + VIEWPORT_MARGIN && roomStart > roomEnd) side = 'start';
    else if (side === 'start' && roomStart < p.width + VIEWPORT_MARGIN && roomEnd > roomStart) side = 'end';

    var x, y;
    if (side === 'bottom' || side === 'top') {
      x = t.left + t.width / 2 - p.width / 2;
      y = side === 'bottom' ? t.bottom : t.top - p.height;
    } else {
      x = side === 'end' ? t.right : t.left - p.width;
      y = t.top + t.height / 2 - p.height / 2;
    }

    x = clamp(x, VIEWPORT_MARGIN, vw - p.width - VIEWPORT_MARGIN);
    y = clamp(y, VIEWPORT_MARGIN, vh - p.height - VIEWPORT_MARGIN);

    /* Documento em RTL: inset-inline-start conta a partir da direita. */
    var rtl = window.getComputedStyle(pop).direction === 'rtl';
    var inlineStart = rtl ? (vw - x - p.width) : x;

    pop.setAttribute('data-position', side);
    pop.style.setProperty('--sh-popover-x', Math.round(inlineStart) + 'px');
    pop.style.setProperty('--sh-popover-y', Math.round(y) + 'px');

    /* Bico apontando para o centro do gatilho, sem escapar do painel. */
    if (side === 'bottom' || side === 'top') {
      var ax = clamp(t.left + t.width / 2 - x, 16, Math.max(16, p.width - 16));
      pop.style.setProperty('--sh-popover-arrow-x', Math.round(rtl ? p.width - ax : ax) + 'px');
    } else {
      var ay = clamp(t.top + t.height / 2 - y, 16, Math.max(16, p.height - 16));
      pop.style.setProperty('--sh-popover-arrow-y', Math.round(ay) + 'px');
    }

    pop.setAttribute('data-sh-anchored', '');
  }

  function repositionAll() {
    for (var i = anchored.length - 1; i >= 0; i--) {
      if (!anchored[i].isConnected || !anchored[i].matches(':popover-open')) anchored.splice(i, 1);
      else position(anchored[i]);
    }
  }

  function onPopoverToggle(pop, isOpen) {
    var trigger = triggerOf(pop);
    if (trigger) trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    if (isOpen) {
      position(pop);
      if (anchored.indexOf(pop) === -1) anchored.push(pop);
      var target = firstFocusable(pop);
      if (target) target.focus({ preventScroll: true });
    } else {
      if (pop.getAttribute('data-state') === 'closing') return;
      var i = anchored.indexOf(pop);
      if (i !== -1) anchored.splice(i, 1);
      pop.removeAttribute('data-sh-anchored');
      var active = document.activeElement;
      if (trigger && trigger.isConnected &&
          (!active || active === document.body || pop.contains(active))) {
        trigger.focus({ preventScroll: true });
      }
    }
  }

  function closePopover(pop) {
    if (!pop || !pop.matches(':popover-open') || pop.getAttribute('data-state') === 'closing') return;
    pop.setAttribute('data-state', 'closing');
    var duration = motionMs(pop, 480);
    window.setTimeout(function () {
      if (pop.getAttribute('data-state') !== 'closing') return;
      pop.hidePopover();
      pop.removeAttribute('data-state');
      onPopoverToggle(pop, false);
    }, duration + 20);
  }

  /* --------------------------------------------------------------- tooltip */

  /* Enquadramento na janela. É a única parte da dica que precisa de JS: uma
     bolha centrada num gatilho encostado na lateral do celular sai da tela, e
     CSS não sabe onde o gatilho está. Sem JS a dica continua aparecendo — só
     pode ficar cortada perto da borda.
     Vai por --sh-tooltip-shift (empurra a bolha, o bico anda ao contrário) e,
     nas posições laterais que não cabem de jeito nenhum, virando para baixo. */
  function fitTooltip(tip) {
    var bubble = tip.querySelector('.sh-tooltip__bubble');
    if (!bubble) return;

    if (!tip.hasAttribute('data-sh-position-base')) {
      tip.setAttribute('data-sh-position-base', tip.getAttribute('data-position') || 'top');
    }
    tip.setAttribute('data-position', tip.getAttribute('data-sh-position-base'));
    bubble.style.removeProperty('--sh-tooltip-shift');

    var side = tip.getAttribute('data-position');
    var vw = root.clientWidth;
    var r = bubble.getBoundingClientRect();

    if ((side === 'start' || side === 'end') &&
        (r.left < VIEWPORT_MARGIN || r.right > vw - VIEWPORT_MARGIN)) {
      tip.setAttribute('data-position', 'bottom');
      r = bubble.getBoundingClientRect();
    }

    var shift = 0;
    if (r.left < VIEWPORT_MARGIN) shift = VIEWPORT_MARGIN - r.left;
    else if (r.right > vw - VIEWPORT_MARGIN) shift = vw - VIEWPORT_MARGIN - r.right;
    if (shift) bubble.style.setProperty('--sh-tooltip-shift', Math.round(shift) + 'px');
  }

  function fitAllTooltips() {
    var tips = document.querySelectorAll('.sh-tooltip[data-sh-position-base]');
    for (var i = 0; i < tips.length; i++) fitTooltip(tips[i]);
  }

  function dismissTooltips() {
    var open = document.querySelectorAll('.sh-tooltip:hover, .sh-tooltip:focus-within');
    var any = false;
    for (var i = 0; i < open.length; i++) {
      if (open[i].getAttribute('data-dismissed') === 'true') continue;
      open[i].setAttribute('data-dismissed', 'true');
      any = true;
    }
    return any;
  }

  /* ------------------------------------------------------------------ copy */

  function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (ok, fail) {
      var field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      field.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(field);
      field.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (e) { done = false; }
      field.remove();
      done ? ok() : fail(new Error('clipboard'));
    });
  }

  function selectValue(block) {
    var value = block.querySelector('.sh-copy__value');
    if (!value || !window.getSelection) return;
    var range = document.createRange();
    range.selectNodeContents(value);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  var copyTimers = new WeakMap();

  function copy(block) {
    block = resolve(block);
    if (!block) return Promise.reject(new Error('sh-copy: bloco não encontrado'));

    var valueEl = block.querySelector('.sh-copy__value');
    var text = block.getAttribute('data-sh-copy-value');
    if (text === null) text = valueEl ? valueEl.textContent.trim() : '';
    if (!text) return Promise.reject(new Error('sh-copy: nada a copiar'));

    var status = block.querySelector('.sh-copy__status');
    var done = block.getAttribute('data-sh-copy-done') || 'Copiado';

    if (!emit(block, 'sh:copy', { value: text })) return Promise.resolve(false);

    return writeClipboard(text).then(function () {
      block.setAttribute('data-copied', 'true');
      if (status) status.textContent = done;
      window.clearTimeout(copyTimers.get(block));
      copyTimers.set(block, window.setTimeout(function () {
        block.removeAttribute('data-copied');
        if (status) status.textContent = '';
      }, 2000));
      return true;
    }).catch(function () {
      block.removeAttribute('data-copied');
      selectValue(block);
      if (status) status.textContent = 'Não foi possível copiar. O valor está selecionado: use Ctrl+C.';
      return false;
    });
  }

  /* Botão de cópia pode nascer [hidden] e só existir quando há JS. */
  function refresh(scope) {
    var buttons = (scope || document).querySelectorAll('[data-sh-copy-button][hidden]');
    for (var i = 0; i < buttons.length; i++) buttons[i].hidden = false;
  }

  /* ----------------------------------------------------------------- init */

  var pointerDownOn = null;

  document.addEventListener('pointerdown', function (ev) {
    pointerDownOn = ev.target;
  }, true);

  document.addEventListener('click', function (ev) {
    var opener = closest(ev.target, '[data-sh-open]');
    if (opener) {
      ev.preventDefault();
      overlay.open(opener.getAttribute('data-sh-open'), opener);
      return;
    }

    var closer = closest(ev.target, '[data-sh-close]');
    if (closer) {
      ev.preventDefault();
      var named = closer.getAttribute('data-sh-close');
      if (named) { overlay.close(named); return; }
      var pop = closest(closer, '.sh-popover');
      if (pop && pop.matches(':popover-open')) { closePopover(pop); return; }
      overlay.close(closest(closer, OVERLAY));
      return;
    }

    var copyButton = closest(ev.target, '[data-sh-copy-button]');
    if (copyButton) {
      ev.preventDefault();
      copy(closest(copyButton, '[data-sh-copy]') || closest(copyButton, '.sh-copy'));
      return;
    }

    /* Backdrop: só fecha quando o gesto começou E terminou fora da caixa. */
    var el = ev.target;
    if (el && el.nodeType === 1 && el.matches(OVERLAY) && el.open &&
        pointerDownOn === el && el.getAttribute('data-sh-backdrop') !== 'static') {
      overlay.close(el);
    }
  });

  /* `close` e `cancel` não borbulham: captura no document alcança os dois. */
  document.addEventListener('close', function (ev) {
    var el = ev.target;
    if (el && el.nodeType === 1 && el.matches(OVERLAY)) overlay.afterClose(el);
  }, true);

  document.addEventListener('cancel', function (ev) {
    var el = ev.target;
    if (!el || el.nodeType !== 1 || !el.matches(OVERLAY)) return;
    ev.preventDefault();
    overlay.close(el, 'escape');
  }, true);

  /* `toggle` do [popover] também não borbulha. */
  document.addEventListener('toggle', function (ev) {
    var el = ev.target;
    if (!el || el.nodeType !== 1 || !el.classList.contains('sh-popover')) return;
    onPopoverToggle(el, ev.newState === 'open');
  }, true);

  document.addEventListener('beforetoggle', function (ev) {
    var el = ev.target;
    if (!el || !el.classList || !el.classList.contains('sh-popover') || ev.newState !== 'closed') return;
    if (el.getAttribute('data-state') === 'closing') return;
    ev.preventDefault();
    closePopover(el);
  }, true);

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    if (!dismissTooltips()) return;
    /* A dica foi dispensada por este Esc: o diálogo aberto não fecha junto. */
    var dlg = document.querySelector('dialog[open]');
    if (!dlg) return;
    var block = function (e) { e.preventDefault(); dlg.removeEventListener('cancel', block); };
    dlg.addEventListener('cancel', block);
    window.setTimeout(function () { dlg.removeEventListener('cancel', block); }, 0);
  });

  /* `pointerenter`/`pointerleave` não borbulham: captura no document alcança. */
  document.addEventListener('pointerenter', function (ev) {
    var el = ev.target;
    if (el && el.nodeType === 1 && el.classList &&
        el.classList.contains('sh-tooltip')) fitTooltip(el);
  }, true);

  document.addEventListener('pointerleave', function (ev) {
    var el = ev.target;
    if (el && el.nodeType === 1 && el.classList &&
        el.classList.contains('sh-tooltip')) el.removeAttribute('data-dismissed');
  }, true);

  document.addEventListener('focusin', function (ev) {
    var tip = closest(ev.target, '.sh-tooltip');
    if (tip) fitTooltip(tip);
  });

  document.addEventListener('focusout', function (ev) {
    var tip = closest(ev.target, '.sh-tooltip[data-dismissed]');
    if (tip) tip.removeAttribute('data-dismissed');
  });

  window.addEventListener('resize', function () {
    repositionAll();
    fitAllTooltips();
  });
  window.addEventListener('scroll', repositionAll, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { refresh(); });
  } else {
    refresh();
  }

  window.ShalomSurface = {
    version: VERSION,
    open: function (target, trigger) { return overlay.open(target, trigger); },
    close: function (target) { return overlay.close(target); },
    position: function (pop) { position(resolve(pop)); },
    copy: copy,
    refresh: refresh,
    /* Expostos para que OUTRO arquivo do DS possa entrar no mesmo contador em
       vez de manter o seu. Quem abre um overlay por conta própria (a gaveta,
       em shalom-ds-navigation.js) chama estes dois: dois contadores separados
       destravariam a página no fechamento do primeiro de dois overlays
       empilhados — gaveta aberta + modal aberto, fecha o modal, a página volta
       a rolar por trás da gaveta. Sempre em par. */
    lockScroll: lockScroll,
    unlockScroll: unlockScroll
  };

}(window, document));
