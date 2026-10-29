/* ==========================================================================
   Shalom DS — comportamento do Lote D (feedback)
   Vanilla, sem dependência, ~2 KB. Carregue depois de shalom-ds.js, também
   com `defer`:

     <script src="/ds/v2/js/shalom-ds.js" defer></script>
     <script src="/ds/v2/js/shalom-ds-feedback.js" defer></script>

   PROGRESSIVO. Sem este arquivo, um sh-toast aparece, pode ser dispensado à
   mão pelo mecanismo de js/shalom-ds.js (data-sh-dismiss já funciona sem
   nada aqui) e simplesmente não expira sozinho. Nenhum toast fica ilegível
   ou inacessível por falta deste arquivo — só não some por conta própria.

   NÃO REIMPLEMENTA. Fechar um toast é sempre ShalomDS.dismiss(el): mesmo
   atributo [hidden], mesmo evento `sh:dismiss` cancelável, mesmo retorno de
   foco. Este arquivo só decide QUANDO chamar isso sozinho.

   DELEGAÇÃO. Um toast quase sempre chega por JS depois da carga da página —
   é uma mutação, não um clique em algo que já existia. Por isso o mecanismo
   aqui é um MutationObserver sobre as regiões, não um listener de clique:
   qualquer .sh-toast que aparecer dentro de .sh-toast-region, de qualquer
   jeito (innerHTML, template clonado, framework), é ligado sozinho.

   --------------------------------------------------------------------------
   CONTRATO — a API é o atributo no HTML
   --------------------------------------------------------------------------

   <div class="sh-toast-region" aria-live="polite">
     <div class="sh-toast sh-toast--success" data-sh-dismissible role="status">
       <svg class="sh-icon sh-toast__icon" aria-hidden="true">…</svg>
       <p class="sh-toast__message">Inscrição confirmada.</p>
       <button class="sh-toast__dismiss" data-sh-dismiss aria-label="Dispensar aviso">…</button>
     </div>
   </div>

   sh-toast-region é sempre filha direta de <body>, nunca descendente de um
   <dialog> (sh-modal/sh-sheet do Lote C) — contrato completo no comentário
   de .sh-toast-region em components/feedback.css. Este arquivo não sabe
   onde a região está no HTML e não precisa saber: liga qualquer .sh-toast
   que aparecer dentro de QUALQUER .sh-toast-region, onde quer que ela esteja.

   data-sh-toast-duration="8000"   substitui os 5000ms padrão (em ms)
   data-sh-toast-duration="0"      desliga a expiração automática deste toast
   .sh-toast--danger                NUNCA expira sozinho — regra de
                                     acessibilidade fixa no JS, não no atributo.
                                     Erro sempre pede dispensa manual.
   .sh-toast--loading                sem data-sh-toast-duration explícito,
                                     também não expira sozinho: quem fecha um
                                     toast de carregamento é a operação
                                     assíncrona que ele representa.

   Enquanto o ponteiro OU o foco estão dentro do toast, o relógio pausa
   (resta o tempo que faltava; não reinicia). A barra de tempo em
   .sh-toast::before (feedback.css) é decorativa e segue as mesmas variáveis
   que o relógio real usa — pausa junto, visualmente.

   --------------------------------------------------------------------------
   API de programa (opcional)
   --------------------------------------------------------------------------
     ShalomDSFeedback.version            string
     ShalomDSFeedback.wire(toast)        liga um toast específico (idempotente)
     ShalomDSFeedback.refresh(root)      varre uma subárvore por toasts novos
   ========================================================================== */

(function (window, document) {
  'use strict';

  var VERSION = '2.0.0';
  var DEFAULT_DURATION = 5000; // ms — só sucesso e info usam por padrão.

  var REGION_SELECTOR = '.sh-toast-region';
  var TOAST_SELECTOR = '.sh-toast';

  function closest(el, selector) {
    return el && el.closest ? el.closest(selector) : null;
  }

  /* Fecha reusando o mecanismo de shalom-ds.js. Se por algum motivo aquele
     arquivo não estiver carregado, um fallback mínimo mantém o mesmo
     contrato (evento cancelável + [hidden]) em vez de falhar silenciosamente. */
  function baseDismiss(el) {
    if (window.ShalomDS && typeof window.ShalomDS.dismiss === 'function') {
      return window.ShalomDS.dismiss(el);
    }
    if (!el || el.hidden) return false;
    var ev = new CustomEvent('sh:dismiss', { bubbles: true, cancelable: true, detail: {} });
    if (!el.dispatchEvent(ev)) return false;
    el.hidden = true;
    return true;
  }

  /* ----------------------------------------------------------------- wire */

  function wire(toast) {
    if (!toast || toast.__shToastWired) return;
    toast.__shToastWired = true;

    // Erro nunca expira sozinho. Decisão fica no JS — não depende de o
    // autor lembrar de omitir (ou zerar) o atributo de duração.
    if (toast.matches('.sh-toast--danger')) return;

    var declared = toast.getAttribute('data-sh-toast-duration');
    var duration = declared === null ? DEFAULT_DURATION : parseInt(declared, 10);

    // "0", vazio ou inválido: dispensa manual explícita, sem temporizador.
    if (!duration || isNaN(duration) || duration <= 0) return;

    // Loading sem duração explícita: quem fecha é a operação, não o relógio.
    if (declared === null && toast.matches('.sh-toast--loading')) return;

    // Reflete a duração resolvida no DOM — liga a barra de tempo do CSS
    // ([data-sh-toast-duration] em feedback.css) mesmo quando veio do default.
    if (declared === null) toast.setAttribute('data-sh-toast-duration', String(duration));
    toast.style.setProperty('--sh-toast-duration-ms', duration + 'ms');

    var remaining = duration;
    var startedAt = 0;
    var timer = null;
    var hovering = false;
    var focused = false;

    function setPlayState(state) {
      toast.style.setProperty('--sh-toast-play-state', state);
    }

    function start() {
      startedAt = Date.now();
      timer = window.setTimeout(expire, remaining);
      setPlayState('running');
    }

    function pause() {
      if (!timer) return;
      window.clearTimeout(timer);
      timer = null;
      remaining -= Date.now() - startedAt;
      setPlayState('paused');
    }

    function resume() {
      if (timer || remaining <= 0) return;
      start();
    }

    // Ponto único de decisão: pausa se QUALQUER um dos dois for verdadeiro,
    // só retoma quando nenhum for. Evita que soltar o hover retome o relógio
    // enquanto o foco ainda está no botão de dispensar, por exemplo.
    function evaluate() {
      if (hovering || focused) pause();
      else resume();
    }

    function expire() {
      timer = null;
      baseDismiss(toast);
    }

    toast.addEventListener('mouseenter', function () { hovering = true; evaluate(); });
    toast.addEventListener('mouseleave', function () { hovering = false; evaluate(); });
    toast.addEventListener('focusin', function () { focused = true; evaluate(); });
    toast.addEventListener('focusout', function (event) {
      if (toast.contains(event.relatedTarget)) return; // foco só moveu dentro do toast
      focused = false;
      evaluate();
    });

    // sh:dismiss dispara tanto por este relógio (via baseDismiss) quanto por
    // um clique em [data-sh-dismiss]. Nos dois casos, limpa o temporizador e
    // remove o nó da DOM pouco depois — sem isso, uma sessão longa acumula
    // toasts fechados e escondidos (display:none, mas ainda no documento).
    toast.addEventListener('sh:dismiss', function (event) {
      window.clearTimeout(timer);
      timer = null;
      if (event.defaultPrevented) return;
      window.setTimeout(function () {
        if (toast.isConnected) toast.remove();
      }, 0);
    });

    start();
  }

  function refresh(root) {
    var scope = root || document;
    var toasts = scope.querySelectorAll(REGION_SELECTOR + ' ' + TOAST_SELECTOR);
    for (var i = 0; i < toasts.length; i++) wire(toasts[i]);
  }

  /* ------------------------------------------------------------ observer */

  function handleAdded(node) {
    if (node.nodeType !== 1) return;
    if (node.matches && node.matches(TOAST_SELECTOR) && closest(node, REGION_SELECTOR)) {
      wire(node);
    }
    if (node.querySelectorAll) {
      var nested = node.querySelectorAll(TOAST_SELECTOR);
      for (var i = 0; i < nested.length; i++) {
        if (closest(nested[i], REGION_SELECTOR)) wire(nested[i]);
      }
    }
  }

  function onMutations(mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) handleAdded(added[j]);
    }
  }

  function boot() {
    refresh();
    if ('MutationObserver' in window && document.body) {
      new MutationObserver(onMutations).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.ShalomDSFeedback = {
    version: VERSION,
    wire: wire,
    refresh: refresh
  };

}(window, document));
