/* ========================================================================== 
   Shalom DS — integrações progressivas
   sh-cart-bar · sh-map · sh-embed

   Sem este módulo, o HTML continua legível: mapas e embeds com `data-src`
   ficam no estado de consentimento e oferecem fallback; a barra continua
   visível e o espaçamento padrão evita cobertura. Não há dependências.
   ========================================================================== */
(function (window, document) {
  'use strict';

  var VERSION = '2.0.0';
  var INTEGRATION = '.sh-map[data-sh-map], .sh-embed[data-sh-embed]';

  function closest(el, selector) {
    return el && el.closest ? el.closest(selector) : null;
  }

  function setStatus(block, message, state) {
    var status = block.querySelector('.sh-map__status, .sh-embed__status');
    if (!status) return;
    status.textContent = message || '';
    if (state) status.setAttribute('data-state', state);
    else status.removeAttribute('data-state');
  }

  function activate(block) {
    if (!block || block.hasAttribute('data-sh-integration-active')) return false;
    var frame = block.querySelector('iframe[data-src]');
    if (!frame) {
      setStatus(block, 'Este conteúdo externo não está disponível.', 'error');
      return false;
    }

    var src = frame.getAttribute('data-src');
    var title = frame.getAttribute('title');
    if (!src || !title) {
      setStatus(block, 'Não foi possível ativar este conteúdo externo.', 'error');
      return false;
    }

    frame.setAttribute('loading', 'lazy');
    frame.setAttribute('src', src);
    block.setAttribute('data-sh-integration-active', '');
    block.setAttribute('data-state', 'active');

    var placeholder = block.querySelector('.sh-map__placeholder, .sh-embed__placeholder');
    if (placeholder) window.setTimeout(function () {
      placeholder.hidden = true;
    }, transitionMs(placeholder));
    setStatus(block, 'Conteúdo externo ativado.', 'active');
    return true;
  }

  function measureCartBar(bar) {
    if (!bar) return;
    if (bar.hidden || bar.getAttribute('data-state') === 'closed') {
      document.documentElement.style.removeProperty('--sh-cart-bar-reserve');
      return;
    }
    var height = Math.ceil(bar.getBoundingClientRect().height);
    if (height > 0) {
      document.documentElement.style.setProperty('--sh-cart-bar-reserve', height + 'px');
    }
  }

  function transitionMs(el) {
    var style = window.getComputedStyle(el);
    var values = (style.transitionDuration || '0s').split(',');
    var max = 0;
    for (var i = 0; i < values.length; i++) {
      var value = values[i].trim();
      var ms = value.indexOf('ms') > -1 ? parseFloat(value) : parseFloat(value) * 1000;
      if (!isNaN(ms)) max = Math.max(max, ms);
    }
    return max;
  }

  function closeCartBar(bar) {
    if (!bar || bar.hidden || bar.getAttribute('data-state') === 'closing') return false;
    bar.setAttribute('data-state', 'closing');
    window.setTimeout(function () {
      bar.hidden = true;
      bar.setAttribute('data-state', 'closed');
      measureCartBar(bar);
    }, transitionMs(bar));
    return true;
  }

  function openCartBar(bar) {
    if (!bar) return false;
    bar.hidden = false;
    bar.setAttribute('data-state', 'closed');
    window.requestAnimationFrame(function () {
      bar.setAttribute('data-state', 'open');
      measureCartBar(bar);
    });
    return true;
  }

  function refresh(root) {
    var scope = root || document;
    var bars = scope.querySelectorAll('[data-sh-cart-bar]');
    for (var i = 0; i < bars.length; i++) measureCartBar(bars[i]);
  }

  document.addEventListener('click', function (event) {
    var closeTrigger = closest(event.target, '[data-sh-cart-bar-close]');
    if (closeTrigger) {
      var closeBar = closest(closeTrigger, '[data-sh-cart-bar]');
      if (closeBar) {
        event.preventDefault();
        closeCartBar(closeBar);
      }
      return;
    }
    var closeAllTrigger = closest(event.target, '[data-sh-cart-bar-close-all]');
    if (closeAllTrigger) {
      var allBars = document.querySelectorAll('[data-sh-cart-bar]');
      for (var i = 0; i < allBars.length; i++) closeCartBar(allBars[i]);
      return;
    }
    var openTrigger = closest(event.target, '[data-sh-cart-bar-open]');
    if (openTrigger) {
      var openBar = document.querySelector('[data-sh-cart-bar]');
      if (openBar) { event.preventDefault(); openCartBar(openBar); }
      return;
    }
    var trigger = closest(event.target, '[data-sh-integration-activate]');
    if (!trigger) return;
    var block = closest(trigger, INTEGRATION);
    if (!block) return;
    event.preventDefault();
    activate(block);
  });

  if (window.ResizeObserver) {
    var observer = new ResizeObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) measureCartBar(entries[i].target);
    });
    var bars = document.querySelectorAll('[data-sh-cart-bar]');
    for (var j = 0; j < bars.length; j++) observer.observe(bars[j]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { refresh(); });
  } else {
    refresh();
  }

  window.ShalomDSIntegrations = {
    version: VERSION,
    activate: activate,
    closeCartBar: closeCartBar,
    openCartBar: openCartBar,
    refresh: refresh
  };
}(window, document));
