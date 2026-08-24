/* ==========================================================================
   Shalom DS — Lote H: comportamento de marketing e evento
   countdown · carousel · share · reveal

   Vanilla, sem dependência, sem build, mesmo padrão dos demais módulos.
   Carregue com defer, em qualquer ordem em relação aos outros:

     <script src="/ds/v2/js/shalom-ds.js"          defer></script>
     <script src="/ds/v2/js/shalom-ds-surface.js"  defer></script>
     <script src="/ds/v2/js/shalom-ds-extras.js"   defer></script>

   sh-pix não aparece aqui: a única interação dele é copiar a chave PIX, e
   isso já é o contrato de data-sh-copy — js/shalom-ds-surface.js. Nada a
   acrescentar sem duplicar o mecanismo de cópia.

   PROGRESSIVO, com uma ressalva por componente:
     · sh-countdown sem este arquivo não conta: os blocos mostram o valor
       estático do HTML e __summary já diz a data por extenso. Nada some.
     · sh-carousel sem este arquivo perde setas, bolinhas e barra de
       progresso — os três nascem [hidden] e só este módulo os revela. A
       rolagem nativa (toque, arrasto, roda, teclado no trilho focável)
       continua funcionando sozinha.
     · sh-share sem este arquivo perde o botão de compartilhamento nativo
       (também nasce [hidden]) — o link do WhatsApp (estático) e o "copiar
       link" (via shalom-ds-surface.js, se presente) continuam de pé.
     · sh-reveal sem este arquivo NUNCA esconde nada: o CSS em
       components/extras.css só aplica opacity:0 quando ESTE módulo marca
       <html data-sh-reveal-armed>, e só depois de confirmar suporte a
       IntersectionObserver e prefers-reduced-motion:no-preference. Sem JS,
       sem marca, sem esconder — o conteúdo nasce visível.

   --------------------------------------------------------------------------
   CONTRATO — a API é o atributo no HTML
   --------------------------------------------------------------------------

   1. sh-countdown

      data-sh-countdown              marca o bloco.
      data-sh-countdown-target="…"   data/hora ISO 8601 com fuso. Obrigatório.
      data-sh-countdown-unit="days|hours|minutes|seconds"
                                      no elemento que recebe o número.

      Recalcula a diferença a partir de Date.now() a cada tique — nunca
      decrementa um contador local, então não há deriva por tique perdido
      (aba em segundo plano, throttling do navegador). Ao chegar a zero,
      esconde .sh-countdown__clock, revela .sh-countdown__ended e para o
      timer. Não decrementa para negativo.

      Evento: sh:countdown-end no bloco. Não cancelável — é um aviso depois
      do fato, não um pedido de permissão (a diferença já chegou a zero;
      nada há para impedir).

   2. sh-carousel

      data-sh-carousel                    marca o bloco.
      data-sh-carousel-label="…"          nome acessível (vira aria-label
                                           + role="region" no bloco).
      data-sh-carousel-track              a lista rolável (.sh-reel).
      data-sh-carousel-prev / -next       setas — nascem [hidden].
      data-sh-carousel-dots               contêiner das bolinhas — nasce
                                           [hidden] e VAZIO; este módulo
                                           gera uma bolinha por slide, para
                                           nunca dessincronizar da contagem
                                           real de fotos.
      data-sh-carousel-progress-wrap /
      data-sh-carousel-progress           barra auxiliar (compõe
                                           .sh-progress do Lote D) — nasce
                                           [hidden].

      Teclado nas bolinhas: ArrowLeft/ArrowRight/Home/End, como sh-tabs
      (Lote A). Setas desabilitam ([disabled], grátis por composição com
      sh-btn) no início/fim da lista — sem loop. Clicar em seta ou bolinha
      atualiza bolinhas/setas/barra de duas formas ao mesmo tempo: OTIMISTA,
      na hora (a rolagem que este módulo pede é sempre instantânea — nenhuma
      janela onde a UI mentiria sobre uma posição ainda não alcançada), e
      CONFIRMADA por um listener de "scroll" no próprio trilho (debounced),
      que é a ÚNICA fonte de verdade para arrasto, roda do mouse e teclado
      nativo — os três não passam por goTo() e não têm outro ponto de
      confirmação. A posição corrente nunca é calculada por
      IntersectionObserver/intersectionRatio: com mais de um slide cabendo ao
      mesmo tempo no trilho (comum em telas largas), vários passariam de
      qualquer limiar de interseção ao mesmo tempo, e intersectionRatio
      sozinho não diz qual É o atual — só a posição de rolagem responde isso
      sem ambiguidade.
      Nunca avança sozinho: não existe temporizador de auto-avanço aqui, de
      propósito — o inventário do sistema proíbe sh-carousel--auto.

      Evento: sh:carousel-change no bloco, detail { index }. Não cancelável
      pelo mesmo motivo do countdown: confirma uma posição que já mudou.

   3. sh-share

      data-sh-share                  marca o bloco.
      data-sh-share-title/-text/-url passados a navigator.share(). url usa
                                      location.href quando ausente.
      data-sh-share-native           o botão nativo — nasce [hidden] e só
                                      aparece quando navigator.share existe.

      O link do WhatsApp e o bloco sh-copy NÃO passam por aqui: o primeiro é
      um <a href> estático escrito pelo autor, o segundo é 100% de
      js/shalom-ds-surface.js (data-sh-copy). Este módulo só cuida do botão
      nativo.

   4. sh-reveal

      .sh-reveal                      classe que marca o elemento.
      data-sh-reveal="up|down|left|right|fade"   direção; "up" é o padrão
                                                  (inclusive quando o
                                                  atributo vem vazio).

      Observa .sh-reveal por IntersectionObserver (threshold 0.2) e marca
      [data-sh-reveal-visible] na primeira vez que cada bloco entra na
      tela — uma vez só (unobserve em seguida); não some de novo ao rolar
      para trás, para não distrair quem já viu o conteúdo.
      A marca <html data-sh-reveal-armed> só é escrita se (a) o navegador
      tem IntersectionObserver e (b) prefers-reduced-motion NÃO pede
      redução. Ver components/extras.css para a garantia completa — aqui
      só a metade que decide QUANDO armar.

   --------------------------------------------------------------------------
   API de programa (opcional)
   --------------------------------------------------------------------------
     ShalomDSExtras.version
     ShalomDSExtras.carousel.goTo(trackOrBlock, index)
     ShalomDSExtras.refresh(root = document)   reprocessa uma subárvore nova
                                                (conteúdo inserido depois,
                                                 SPA, fetch, template clonado)
   ========================================================================== */

(function (window, document) {
  'use strict';

  var VERSION = '2.0.0';

  /* ---------------------------------------------------------------- util */

  function closest(el, selector) {
    return el && el.closest ? el.closest(selector) : null;
  }

  /* Todo evento deste arquivo é uma CONFIRMAÇÃO depois do fato (o relógio já
     chegou a zero, a rolagem já terminou) — não um pedido de permissão.
     Por isso, ao contrário de emit() em shalom-ds.js/-surface.js/-navigation.js,
     nenhum aqui é cancelável nem seu retorno é checado antes de agir. */
  function announce(el, name, detail) {
    el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: false, detail: detail || {} }));
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* ------------------------------------------------------------ countdown */

  var countdown = {
    SELECTOR: '[data-sh-countdown]',
    DAY: 86400000, HOUR: 3600000, MINUTE: 60000, SECOND: 1000,

    start: function (block) {
      if (block.__shCountdownTimer || block.__shCountdownEnded) return;

      var iso = block.getAttribute('data-sh-countdown-target');
      var target = iso ? new Date(iso).getTime() : NaN;
      if (isNaN(target)) return;

      var clock = block.querySelector('.sh-countdown__clock');
      var ended = block.querySelector('.sh-countdown__ended');
      var days = block.querySelector('[data-sh-countdown-unit="days"]');
      var hours = block.querySelector('[data-sh-countdown-unit="hours"]');
      var minutes = block.querySelector('[data-sh-countdown-unit="minutes"]');
      var seconds = block.querySelector('[data-sh-countdown-unit="seconds"]');

      function tick() {
        var diff = target - Date.now();

        if (diff <= 0) {
          window.clearInterval(block.__shCountdownTimer);
          block.__shCountdownTimer = null;
          block.__shCountdownEnded = true;
          if (clock) clock.hidden = true;
          if (ended) ended.hidden = false;
          announce(block, 'sh:countdown-end', {});
          return;
        }

        if (days)    days.textContent    = pad2(Math.floor(diff / countdown.DAY));
        if (hours)   hours.textContent   = pad2(Math.floor((diff % countdown.DAY) / countdown.HOUR));
        if (minutes) minutes.textContent = pad2(Math.floor((diff % countdown.HOUR) / countdown.MINUTE));
        if (seconds) seconds.textContent = pad2(Math.floor((diff % countdown.MINUTE) / countdown.SECOND));
      }

      tick();
      block.__shCountdownTimer = window.setInterval(tick, 1000);
    },

    refresh: function (root) {
      var blocks = (root || document).querySelectorAll(countdown.SELECTOR);
      for (var i = 0; i < blocks.length; i++) countdown.start(blocks[i]);
    }
  };

  /* -------------------------------------------------------------- carousel */

  var carousel = {
    SELECTOR: '[data-sh-carousel]',

    /* Qual slide está encostado (ou mais perto) da borda inicial do trilho
       agora. Geométrico via getBoundingClientRect — mesma técnica de goTo,
       pelo mesmo motivo: independe do offsetParent de cada slide e não
       precisa saber se o documento é LTR ou RTL.

       Os dois extremos respondem sozinhos, ANTES da geometria: quando mais
       de um slide cabe ao mesmo tempo no trilho (comum em telas largas — é
       o caso dos dois carrosséis de prova-extras.html, que mostram ~2,5
       fotos por vez), o ÚLTIMO slide pode não ter espaço de rolagem
       suficiente para ficar encostado na borda esquerda: a posição máxima
       de rolagem para ali mesmo com outro slide ainda mais próximo da
       borda. Sem este caso especial, "Fim"/última bolinha (que aplicam o
       índice de forma otimista em goTo) e uma rolagem manual até o fim
       (que só tem este cálculo para confirmar) discordariam sobre qual é
       "o atual" no mesmíssimo ponto de rolagem. */
    currentIndex: function (state) {
      var track = state.track;
      var maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft <= 0) return 0;
      if (track.scrollLeft >= maxScroll - 1) return state.slides.length - 1;

      var trackLeft = track.getBoundingClientRect().left;
      var best = 0, bestDist = Infinity;
      state.slides.forEach(function (slide, i) {
        var dist = Math.abs(slide.getBoundingClientRect().left - trackLeft);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      return best;
    },

    /* Delta em pixels puramente geométrico (via getBoundingClientRect, não
       offsetLeft): funciona qualquer que seja o ancestral posicionado do
       slide, e é neutro a LTR/RTL — não precisa de um branch de direção. */
    goTo: function (state, index, opts) {
      opts = opts || {};
      index = Math.max(0, Math.min(index, state.slides.length - 1));
      var slide = state.slides[index];
      if (!slide) return;

      var track = state.track;
      var delta = slide.getBoundingClientRect().left - track.getBoundingClientRect().left;
      track.scrollTo({ left: track.scrollLeft + delta, top: 0, behavior: 'auto' });

      /* Atualiza otimista: a rolagem que ESTE módulo pede é sempre instantânea
         (behavior:'auto' sobre um trilho sem scroll-behavior próprio — só
         <html> herda "smooth" de foundations/reset.css, e isso não alcança um
         contêiner de rolagem interno). Sem animação em voo, não existe janela
         onde a UI mentiria sobre uma posição ainda não alcançada — então
         confirmar aqui, e não só esperar o listener de "scroll", torna o
         clique em botão/bolinha independente de o navegador disparar (ou não)
         o evento nativo para uma rolagem programática. O listener continua
         sendo a ÚNICA fonte de verdade para arrasto/roda/teclado nativo, onde
         não há outro ponto de confirmação. */
      if (state.applyIndex) state.applyIndex(index);

      if (opts.focusDot && state.dots[index]) state.dots[index].focus();
    },

    render: function (block) {
      if (block.__shCarousel) return;

      var track = block.querySelector('[data-sh-carousel-track]');
      if (!track) return;
      var slides = Array.prototype.slice.call(track.children);
      if (!slides.length) return;

      var prevBtn = block.querySelector('[data-sh-carousel-prev]');
      var nextBtn = block.querySelector('[data-sh-carousel-next]');
      var dotsWrap = block.querySelector('[data-sh-carousel-dots]');
      var progressWrap = block.querySelector('[data-sh-carousel-progress-wrap]');
      var progressFill = block.querySelector('[data-sh-carousel-progress]');
      var single = slides.length < 2;

      var label = block.getAttribute('data-sh-carousel-label');
      if (label) {
        block.setAttribute('role', 'region');
        block.setAttribute('aria-roledescription', 'carrossel');
        block.setAttribute('aria-label', label);
      }
      track.setAttribute('tabindex', '0');

      slides.forEach(function (slide, i) {
        if (!slide.id) {
          slide.id = 'sh-carousel-slide-' + Math.random().toString(36).slice(2, 8) + '-' + i;
        }
        slide.setAttribute('aria-roledescription', 'slide');
      });

      var dots = [];
      if (dotsWrap) {
        dotsWrap.innerHTML = '';
        if (!single) {
          slides.forEach(function (slide, i) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'sh-carousel__dot';
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
            dot.setAttribute('aria-controls', slide.id);
            dot.setAttribute('aria-label', 'Foto ' + (i + 1) + ' de ' + slides.length);
            dotsWrap.appendChild(dot);
            dots.push(dot);
          });
        }
        dotsWrap.hidden = single;
      }
      if (prevBtn) prevBtn.hidden = single;
      if (nextBtn) nextBtn.hidden = single;
      if (progressWrap) progressWrap.hidden = single;

      /* -1 de propósito: garante que a primeira applyIndex(0), logo abaixo,
         não seja descartada pela guarda de "já está nesse índice" — goTo()
         chama applyIndex de forma otimista e o listener de scroll confirma
         depois; sem a guarda, a confirmação re-emitiria sh:carousel-change
         em cima do mesmo índice que o clique já tinha aplicado. */
      var state = { block: block, track: track, slides: slides, dots: dots, index: -1 };
      block.__shCarousel = state;

      function applyIndex(i) {
        if (state.index === i) return;
        state.index = i;
        dots.forEach(function (dot, di) { dot.setAttribute('aria-selected', di === i ? 'true' : 'false'); });
        if (prevBtn) prevBtn.disabled = i === 0;
        if (nextBtn) nextBtn.disabled = i === slides.length - 1;
        if (progressFill) {
          var pct = slides.length < 2 ? 100 : Math.round((i / (slides.length - 1)) * 100);
          progressFill.style.setProperty('--sh-progress-value', pct + '%');
        }
        announce(block, 'sh:carousel-change', { index: i });
      }
      state.applyIndex = applyIndex;
      applyIndex(0);

      if (prevBtn) prevBtn.addEventListener('click', function () { carousel.goTo(state, state.index - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function () { carousel.goTo(state, state.index + 1); });

      if (dotsWrap) {
        dotsWrap.addEventListener('click', function (ev) {
          var dot = closest(ev.target, '.sh-carousel__dot');
          if (dot) carousel.goTo(state, dots.indexOf(dot));
        });
        dotsWrap.addEventListener('keydown', function (ev) {
          var i = dots.indexOf(document.activeElement);
          if (i === -1) return;
          var moveBy = { ArrowRight: 1, ArrowLeft: -1 }[ev.key];
          if (moveBy) {
            ev.preventDefault();
            carousel.goTo(state, i + moveBy, { focusDot: true });
          } else if (ev.key === 'Home') {
            ev.preventDefault();
            carousel.goTo(state, 0, { focusDot: true });
          } else if (ev.key === 'End') {
            ev.preventDefault();
            carousel.goTo(state, slides.length - 1, { focusDot: true });
          }
        });
      }

      /* Confirma a posição real depois de qualquer rolagem — arrasto, roda,
         teclado nativo no trilho — não só depois de um clique em botão ou
         bolinha. A posição "atual" é geométrica (qual slide está encostado
         na borda inicial do trilho agora), não por intersectionRatio: com
         mais de um slide cabendo ao mesmo tempo no trilho (comum em telas
         largas, onde cada slide tem só min(20rem, 82%) de largura), VÁRIOS
         slides passam de qualquer limiar de interseção ao mesmo tempo, e não
         há como saber qual é "o atual" só por essa fração — só a posição de
         rolagem responde isso sem ambiguidade. */
      var scrollTimer = null;
      track.addEventListener('scroll', function () {
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(function () {
          applyIndex(carousel.currentIndex(state));
        }, 100);
      }, { passive: true });
    },

    refresh: function (root) {
      var blocks = (root || document).querySelectorAll(carousel.SELECTOR);
      for (var i = 0; i < blocks.length; i++) carousel.render(blocks[i]);
    }
  };

  /* ----------------------------------------------------------------- share */

  var share = {
    SELECTOR: '[data-sh-share]',

    render: function (block) {
      if (block.__shShare) return;
      block.__shShare = true;

      var button = block.querySelector('[data-sh-share-native]');
      if (!button || !navigator.share) return;

      button.hidden = false;
      button.addEventListener('click', function () {
        var data = {
          title: block.getAttribute('data-sh-share-title') || document.title,
          text: block.getAttribute('data-sh-share-text') || '',
          url: block.getAttribute('data-sh-share-url') || window.location.href
        };
        try {
          navigator.share(data).catch(function () { /* cancelado pela pessoa: silêncio é o certo */ });
        } catch (e) { /* implementação inconsistente do navegador: os outros caminhos continuam de pé */ }
      });
    },

    refresh: function (root) {
      var blocks = (root || document).querySelectorAll(share.SELECTOR);
      for (var i = 0; i < blocks.length; i++) share.render(blocks[i]);
    }
  };

  /* ---------------------------------------------------------------- reveal */

  var reveal = {
    SELECTOR: '.sh-reveal',
    armed: false,
    io: null,

    setup: function (root) {
      if (!window.IntersectionObserver) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      if (!reveal.armed) {
        document.documentElement.setAttribute('data-sh-reveal-armed', '');
        reveal.armed = true;
      }
      if (!reveal.io) {
        reveal.io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.setAttribute('data-sh-reveal-visible', '');
            reveal.io.unobserve(entry.target);
          });
        }, { threshold: 0.2 });
      }

      var els = (root || document).querySelectorAll(reveal.SELECTOR + ':not([data-sh-reveal-visible])');
      for (var i = 0; i < els.length; i++) reveal.io.observe(els[i]);
    }
  };

  /* A preferência do sistema pode mudar com a página aberta. Se passou a
     pedir redução, o CSS já resolve sozinho (a media query reage sem
     ajuda); se deixou de pedir, religamos a observação do zero. */
  if (window.matchMedia) {
    var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var onPreferenceChange = function () { if (!reduceQuery.matches) reveal.setup(document); };
    if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onPreferenceChange);
  }

  /* ----------------------------------------------------------------- init */

  function refresh(root) {
    countdown.refresh(root);
    carousel.refresh(root);
    share.refresh(root);
    reveal.setup(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { refresh(); });
  } else {
    refresh();
  }

  window.ShalomDSExtras = {
    version: VERSION,
    carousel: {
      goTo: function (trackOrBlock, index) {
        var block = closest(trackOrBlock, '[data-sh-carousel]') ||
          (trackOrBlock && trackOrBlock.matches && trackOrBlock.matches('[data-sh-carousel]') ? trackOrBlock : null);
        if (block && block.__shCarousel) carousel.goTo(block.__shCarousel, index);
      }
    },
    refresh: refresh
  };

}(window, document));
