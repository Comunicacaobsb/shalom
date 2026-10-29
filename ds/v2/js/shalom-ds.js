/* ==========================================================================
   Shalom DS — comportamento
   Vanilla, sem dependência, sem build, ~3 KB. Carregue com `defer`:

     <script src="/ds/v2/js/shalom-ds.js" defer></script>

   PROGRESSIVO. Nada aqui é necessário para o CSS funcionar. Sem este arquivo,
   um alerta dispensável apenas não dispensa, um chip de filtro apenas não
   alterna sozinho e o contador de caracteres apenas não conta. Nenhum
   componente fica ilegível, invisível ou inacessível por falta de JS.

   DELEGAÇÃO. Tudo escuta no `document`. Elemento inserido depois (fetch,
   render de SPA, template clonado) funciona sem re-inicializar nada.

   --------------------------------------------------------------------------
   CONTRATO — a API é o atributo no HTML
   --------------------------------------------------------------------------

   1. dismiss — fecha um bloco dispensável
      <div class="sh-alert sh-alert--success" role="status">
        …
        <button class="sh-alert__dismiss" data-sh-dismiss aria-label="Dispensar aviso">…</button>
      </div>

      data-sh-dismiss             fecha o ancestral [data-sh-dismissible] ou,
                                  na falta dele, o .sh-alert mais próximo
      data-sh-dismiss="#id"       fecha o alvo do seletor (qualquer seletor CSS)
      data-sh-dismissible         marca explícita do bloco a fechar

      Fecha com o atributo [hidden] — o elemento continua no DOM, mantendo a
      região viva estável para o leitor de tela. Se o foco estava dentro do
      bloco, ele volta para o pai (que recebe tabindex="-1" temporário), nunca
      para o topo da página. Emite `sh:dismiss` (bubbles), cancelável: chamar
      preventDefault() no listener impede o fechamento.

   2. toggle — alterna um botão de dois estados (chip de filtro, favoritar)
      <button class="sh-chip" data-sh-toggle aria-pressed="false">Servos</button>

      Alterna aria-pressed. Emite `sh:toggle` com detail { pressed }.
      Botão [disabled] ou [aria-disabled="true"] é ignorado.

   3. counter — contagem de caracteres de um campo
      <div class="sh-field" data-sh-counter>
        <label class="sh-field__label" for="x">Mensagem</label>
        <textarea class="sh-input" id="x" maxlength="280"></textarea>
        <p class="sh-field__counter" aria-hidden="true">0/280</p>
      </div>

      Lê `maxlength` do controle (ou data-sh-counter="280"). Atualiza o
      .sh-field__counter a cada `input` e na carga. Ao passar do limite —
      possível apenas sem maxlength — marca data-state="error" no campo e
      aria-invalid no controle. O contador é ruído para leitor de tela:
      mantenha-o aria-hidden="true"; o limite vai dito no .sh-field__hint.

   --------------------------------------------------------------------------
   API de programa (opcional)
   --------------------------------------------------------------------------
     ShalomDS.version                 string
     ShalomDS.dismiss(el)             fecha um bloco por código
     ShalomDS.refresh(root = document) recalcula os contadores de uma subárvore
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
    var values = (window.getComputedStyle(el).transitionDuration || '').split(',').map(function (value) {
      var text = value.trim();
      if (text.slice(-2) === 'ms') return parseFloat(text) || 0;
      if (text.slice(-1) === 's') return (parseFloat(text) || 0) * 1000;
      return 0;
    });
    var duration = Math.max.apply(Math, values);
    return duration > 0 ? duration : fallback;
  }

  /* -------------------------------------------------------------- dismiss */

  var dismiss = {
    TRIGGER: '[data-sh-dismiss]',

    target: function (trigger) {
      var selector = trigger.getAttribute('data-sh-dismiss');
      if (selector) return document.querySelector(selector);
      return closest(trigger, '[data-sh-dismissible]') ||
             closest(trigger, '.sh-alert');
    },

    close: function (block, trigger) {
      if (!block || block.hidden) return false;
      if (!emit(block, 'sh:dismiss', { trigger: trigger || null })) return false;

      // Devolve o foco antes de esconder: foco preso em [hidden] é foco perdido.
      var active = document.activeElement;
      if (active && block.contains(active)) {
        var host = block.parentElement || document.body;
        if (!host.hasAttribute('tabindex')) {
          host.setAttribute('tabindex', '-1');
          host.addEventListener('blur', function once() {
            host.removeAttribute('tabindex');
            host.removeEventListener('blur', once);
          });
        }
        host.focus({ preventScroll: true });
      }

      if (block.getAttribute('data-state') === 'closing') return false;
      block.setAttribute('data-state', 'closing');
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        block.removeEventListener('transitionend', onEnd);
        block.hidden = true;
        block.removeAttribute('data-state');
      };
      var onEnd = function (event) {
        if (event.target === block && event.propertyName === 'opacity') finish();
      };
      block.addEventListener('transitionend', onEnd);
      window.setTimeout(finish, motionMs(block, 480) + 80);
      return true;
    },

    onClick: function (event) {
      var trigger = closest(event.target, dismiss.TRIGGER);
      if (!trigger) return;
      event.preventDefault();
      dismiss.close(dismiss.target(trigger), trigger);
    }
  };

  /* --------------------------------------------------------------- toggle */

  var toggle = {
    TRIGGER: '[data-sh-toggle]',

    onClick: function (event) {
      var trigger = closest(event.target, toggle.TRIGGER);
      if (!trigger) return;
      if (trigger.disabled || trigger.getAttribute('aria-disabled') === 'true') return;

      var pressed = trigger.getAttribute('aria-pressed') === 'true';
      trigger.setAttribute('aria-pressed', String(!pressed));
      emit(trigger, 'sh:toggle', { pressed: !pressed });
    }
  };

  /* -------------------------------------------------------------- counter */

  var counter = {
    FIELD: '[data-sh-counter]',
    CONTROL: 'input, textarea',
    OUTPUT: '.sh-field__counter',

    update: function (field) {
      var control = field.querySelector(counter.CONTROL);
      var output = field.querySelector(counter.OUTPUT);
      if (!control || !output) return;

      var declared = field.getAttribute('data-sh-counter');
      var max = parseInt(declared, 10);
      if (isNaN(max)) max = parseInt(control.getAttribute('maxlength'), 10);

      var length = control.value.length;
      output.textContent = isNaN(max) ? String(length) : length + '/' + max;

      var over = !isNaN(max) && length > max;
      if (over) {
        field.setAttribute('data-state', 'error');
        control.setAttribute('aria-invalid', 'true');
      } else if (field.getAttribute('data-state') === 'error' &&
                 control.getAttribute('aria-invalid') === 'true') {
        field.removeAttribute('data-state');
        control.removeAttribute('aria-invalid');
      }
    },

    onInput: function (event) {
      var field = closest(event.target, counter.FIELD);
      if (field) counter.update(field);
    },

    refresh: function (root) {
      var fields = (root || document).querySelectorAll(counter.FIELD);
      for (var i = 0; i < fields.length; i++) counter.update(fields[i]);
    }
  };

  /* ----------------------------------------------------------------- init */

  document.addEventListener('click', dismiss.onClick);
  document.addEventListener('click', toggle.onClick);
  document.addEventListener('input', counter.onInput);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { counter.refresh(); });
  } else {
    counter.refresh();
  }

  window.ShalomDS = {
    version: VERSION,
    dismiss: function (el) { return dismiss.close(el, null); },
    refresh: function (root) { counter.refresh(root); }
  };

}(window, document));
