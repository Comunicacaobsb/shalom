/* ==========================================================================
   Shalom DS — comportamento dos formulários (Lote B)
   Vanilla, sem dependência, sem build. Carregue com `defer`, DEPOIS de
   shalom-ds.js (não depende dele, mas a ordem mantém a leitura óbvia):

     <script src="/ds/v2/js/shalom-ds.js" defer></script>
     <script src="/ds/v2/js/shalom-ds-form.js" defer></script>

   PROGRESSIVO. Sem este arquivo:
     · sh-select 2.0 usa trigger/listbox ARIA e input type="hidden";
     · sh-file mostra o <input type="file"> nativo e o arquivo é escolhido;
     · sh-quantity continua editável pelo <input type="number">;
     · sh-search perde só o botão de limpar (o campo continua buscando);
     · sh-checkbox, sh-radio, sh-switch, sh-segmented e sh-option-card não
       precisam de JS em momento algum — são controles nativos com desenho
       próprio, e setas, Espaço, foco e envio são do navegador.

   DELEGAÇÃO. Tudo escuta no `document`. O que exige construção de DOM
   (select, file) é montado na carga e por um MutationObserver enxuto, então
   um bloco inserido por fetch ou por template também funciona sozinho.

   --------------------------------------------------------------------------
   CONTRATO — a API é o atributo no HTML
   --------------------------------------------------------------------------

   1. sh-select — listbox própria, input oculto como valor do formulário

      <div class="sh-select" data-sh-select>
        <input type="hidden" id="uf" name="uf" value="df" required>
        <div data-sh-option data-sh-value="df" aria-selected="true">Distrito Federal</div>
        <div data-sh-option data-sh-value="go">Goiás</div>
      </div>

      data-sh-select                 monta o combobox
      data-sh-searchable             acrescenta campo de filtro
        (ou a classe .sh-select--searchable)
      data-sh-placeholder="…"        texto quando nada está escolhido
      data-sh-count-label="{n} selecionados"   rótulo do múltiplo
      data-sh-multiple                 serializa valores separados por vírgula
      data-sh-option                   opção declarativa com data-sh-value

      Protocolo de teclado (fechado): ↓ ↑ Enter Espaço Alt+↓ abrem;
      Home/End abrem no primeiro/último; digitar salta para a opção.
      (aberto): ↓ ↑ Home End PageUp PageDown movem; Enter confirma;
      Espaço confirma (fora do modo com filtro); Esc fecha sem mudar;
      Tab confirma e sai; Alt+↑ confirma e fecha; digitar salta.
      Clique fora fecha. Rolagem acompanha a opção ativa.

      ARIA: role="combobox" + aria-expanded + aria-controls +
      aria-activedescendant no elemento que tem o foco; role="listbox" com
      role="option" e aria-selected; aria-multiselectable no múltiplo.

      Eventos: sh:select:open, sh:select:close, sh:select:change
      (cancelável — preventDefault() mantém o valor anterior).
      O input oculto recebe `input` e `change` reais. O adaptador de <select>
      legado permanece deprecated e só é usado por markup 1.x.

   2. sh-quantity — stepper

      <div class="sh-quantity" data-sh-quantity>
        <button type="button" class="sh-quantity__minus" aria-label="Diminuir…">
        <input class="sh-quantity__value" type="number" min="0" max="10" value="1">
        <button type="button" class="sh-quantity__plus" aria-label="Aumentar…">
        <span class="sh-quantity__status sh-visually-hidden" role="status" aria-live="polite"></span>
      </div>

      Respeita min, max e step do input. Desabilita o botão que passaria do
      limite. Marca data-state="idle"|"active" no bloco (active = acima do
      mínimo). Atualiza __status, que é o que o leitor de tela ouve quando o
      foco está no botão. Evento: sh:quantity:change (cancelável).

   3. sh-file — soltar, escolher, listar

      <div class="sh-file" data-sh-file data-sh-max-size="5242880">
        <input class="sh-file__input" type="file" id="comp" accept=".pdf,image/*" multiple>
        <label class="sh-file__drop" for="comp">…</label>
        <ul class="sh-file__list"></ul>
      </div>

      data-sh-max-size="bytes"   limite por arquivo. Quem passa do limite
                                 entra na lista marcado com data-state="error",
                                 o .sh-field recebe data-state="error" e o
                                 <input> recebe aria-invalid="true".

      O arquivo grande NÃO é removido do envio. Isto é deliberado: mexer no
      FileList por baixo de quem escolheu o arquivo esconde o problema em vez
      de mostrá-lo — a pessoa some com um anexo sem entender por quê. Quem
      barra o envio é a aplicação, lendo event.detail.rejected no
      sh:file:change (ou o próprio aria-invalid, na validação do formulário).
      Só o botão "remover" de cada item reescreve o FileList de verdade, via
      DataTransfer — porque aí a remoção foi pedida.

      Arrastar marca data-state="dragover".
      Evento: sh:file:change com detail { files, rejected }.

   4. sh-search — limpar

      <button type="button" class="sh-search__clear" data-sh-search-clear
              aria-label="Limpar busca">

      Limpa o .sh-search__input do mesmo bloco, dispara `input` e devolve o
      foco ao campo. Evento: sh:search:clear (cancelável).

   --------------------------------------------------------------------------
   API de programa (opcional)
   --------------------------------------------------------------------------
     ShalomDSForm.version
     ShalomDSForm.refresh(root = document)   monta/atualiza uma subárvore
     ShalomDSForm.select(el)                 { open, close, value, setValue }
   ========================================================================== */

(function (window, document) {
  'use strict';

  var VERSION = '2.0.0';
  var seq = 0;

  /* ---------------------------------------------------------------- util */

  function closest(el, selector) {
    return el && el.closest ? el.closest(selector) : null;
  }

  function emit(el, name, detail) {
    return el.dispatchEvent(new CustomEvent(name, {
      bubbles: true, cancelable: true, detail: detail || {}
    }));
  }

  function uid(prefix) {
    seq += 1;
    return prefix + '-' + seq;
  }

  function ensureId(el, prefix) {
    if (!el.id) el.id = uid(prefix);
    return el.id;
  }

  /* Comparação de texto para o typeahead: sem acento, sem caixa. "sao" acha
     "São Paulo", que é como as pessoas realmente digitam com pressa. */
  function fold(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function svgIcon(className, path) {
    return '<svg class="sh-icon ' + className + '" viewBox="0 0 24 24" ' +
           'fill="none" stroke="currentColor" stroke-width="2" ' +
           'stroke-linecap="round" stroke-linejoin="round" ' +
           'aria-hidden="true" focusable="false"><path d="' + path + '"/></svg>';
  }

  var PATH_CARET = 'm6 9 6 6 6-6';
  var PATH_CHECK = 'M20 6 9 17l-5-5';
  var PATH_X     = 'M18 6 6 18M6 6l12 12';

  function fireNative(control) {
    control.dispatchEvent(new Event('input',  { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ======================================================================
     sh-select
     ====================================================================== */

  var openSelect = null;   /* só um combobox aberto por vez, por definição */

  var select = {
    HOST: '.sh-select[data-sh-select]',

    /* ------------------------------------------------------- construção */

    build: function (host) {
      if (host.hasAttribute('data-sh-enhanced')) return;
      /* Migração 1.x apenas: o contrato normativo 2.0 começa no hidden. */
      var native = host.querySelector('select');
      if (!native) return select.buildCustom(host);

      native.classList.add('sh-select__native');
      var id = ensureId(native, 'sh-select');
      var multiple = native.multiple;
      var searchable = multiple === false && (
        host.classList.contains('sh-select--searchable') ||
        host.hasAttribute('data-sh-searchable')
      );

      /* Rótulo: o <label for> apontava para o nativo, que agora é invisível.
         Focar um elemento invisível é pior que não focar nada — o `for` sai
         e o clique passa a ser tratado aqui. O nome acessível continua
         garantido por aria-labelledby. */
      var label = document.querySelector('label[for="' + id + '"]');
      var labelId = '';
      if (label) {
        labelId = ensureId(label, id + '-label');
        label.removeAttribute('for');
        label.setAttribute('data-sh-select-label', id);
      }

      var triggerId = id + '-trigger';
      var listboxId = id + '-listbox';

      var trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'sh-select__trigger';
      trigger.id = triggerId;
      trigger.setAttribute('role', 'combobox');
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-controls', listboxId);
      trigger.setAttribute('aria-labelledby',
        (labelId ? labelId + ' ' : '') + triggerId);
      if (native.disabled) trigger.disabled = true;
      if (native.required) trigger.setAttribute('aria-required', 'true');
      trigger.innerHTML =
        '<span class="sh-select__value"></span>' +
        svgIcon('sh-select__caret', PATH_CARET);

      var popover = document.createElement('div');
      popover.className = 'sh-select__popover';
      popover.hidden = true;

      var search = null;
      if (searchable) {
        search = document.createElement('input');
        search.type = 'text';
        search.className = 'sh-select__search';
        search.setAttribute('role', 'searchbox');
        search.setAttribute('autocomplete', 'off');
        search.setAttribute('aria-controls', listboxId);
        search.setAttribute('aria-autocomplete', 'list');
        search.setAttribute('aria-label',
          host.getAttribute('data-sh-search-label') || 'Filtrar opções');
        search.placeholder = host.getAttribute('data-sh-search-label') || 'Filtrar…';
        popover.appendChild(search);
      }

      var listbox = document.createElement('div');
      listbox.className = 'sh-select__listbox';
      listbox.id = listboxId;
      listbox.setAttribute('role', 'listbox');
      listbox.setAttribute('tabindex', '-1');
      if (labelId) listbox.setAttribute('aria-labelledby', labelId);
      if (multiple) listbox.setAttribute('aria-multiselectable', 'true');
      popover.appendChild(listbox);

      var empty = document.createElement('p');
      empty.className = 'sh-select__empty';
      empty.hidden = true;
      empty.textContent = host.getAttribute('data-sh-empty') ||
                          'Nenhuma opção encontrada';
      popover.appendChild(empty);

      host.appendChild(trigger);
      host.appendChild(popover);

      var state = {
        host: host, native: native, trigger: trigger, popover: popover,
        listbox: listbox, search: search, empty: empty,
        multiple: multiple, searchable: searchable,
        options: [], active: -1, buffer: '', bufferAt: 0
      };
      host._shSelect = state;

      select.renderOptions(state);
      select.paint(state);
      host.setAttribute('data-sh-enhanced', '');
    },

    /* Contrato normativo 2.0: input hidden como valor do formulário e opções
       próprias em [data-sh-option]. O caminho com select acima é compatibilidade
       de migração 1.x e não deve ser usado em documentação/provas. */
    buildCustom: function (host) {
      if (host.hasAttribute('data-sh-enhanced')) return;
      var field = host.querySelector('input[type="hidden"][name]');
      if (!field) return;
      var id = ensureId(field, 'sh-select');
      var label = document.querySelector('label[for="' + id + '"]');
      var labelId = label ? ensureId(label, id + '-label') : '';
      if (label) { label.removeAttribute('for'); label.setAttribute('data-sh-select-label', id); }
      var multiple = host.hasAttribute('data-sh-multiple');
      var trigger = document.createElement('button');
      var listboxId = id + '-listbox';
      trigger.type = 'button'; trigger.className = 'sh-select__trigger'; trigger.id = id + '-trigger';
      trigger.setAttribute('role', 'combobox'); trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false'); trigger.setAttribute('aria-controls', listboxId);
      trigger.setAttribute('aria-labelledby', (labelId ? labelId + ' ' : '') + trigger.id);
      if (field.disabled) trigger.disabled = true;
      if (field.required) trigger.setAttribute('aria-required', 'true');
      trigger.innerHTML = '<span class="sh-select__value"></span>' + svgIcon('sh-select__caret', PATH_CARET);
      var popover = document.createElement('div'); popover.className = 'sh-select__popover'; popover.hidden = true;
      var listbox = document.createElement('div'); listbox.className = 'sh-select__listbox'; listbox.id = listboxId;
      listbox.setAttribute('role', 'listbox'); listbox.setAttribute('tabindex', '-1');
      if (labelId) listbox.setAttribute('aria-labelledby', labelId);
      if (multiple) listbox.setAttribute('aria-multiselectable', 'true');
      popover.appendChild(listbox); host.appendChild(trigger); host.appendChild(popover);
      var state = { host: host, native: field, trigger: trigger, popover: popover, listbox: listbox,
        search: null, empty: null, multiple: multiple, searchable: false, options: [], active: -1,
        buffer: '', bufferAt: 0, custom: true };
      var source = host.querySelectorAll('[data-sh-option]');
      for (var i = 0; i < source.length; i++) {
        var sourceOption = source[i];
        var el = document.createElement('div'); el.className = 'sh-select__option'; el.id = id + '-opt-' + i;
        el.setAttribute('role', 'option'); el.dataset.value = sourceOption.getAttribute('data-sh-value') || '';
        el.setAttribute('aria-selected', sourceOption.getAttribute('aria-selected') === 'true' ? 'true' : 'false');
        if (sourceOption.getAttribute('aria-disabled') === 'true' || sourceOption.hasAttribute('data-sh-disabled')) el.setAttribute('aria-disabled', 'true');
        el.innerHTML = '<span class="sh-select__option-label"></span>' + svgIcon('sh-select__check', PATH_CHECK);
        el.firstChild.textContent = sourceOption.textContent.trim(); listbox.appendChild(el); sourceOption.hidden = true;
        state.options.push({ el: el, value: el.dataset.value, text: fold(el.textContent), label: el.textContent.trim(), selected: el.getAttribute('aria-selected') === 'true' });
      }
      var initial = String(field.value || '').split(',').filter(Boolean);
      for (var s = 0; s < state.options.length; s++) {
        state.options[s].selected = initial.indexOf(state.options[s].value) !== -1 ||
          (initial.length === 0 && state.options[s].selected);
      }
      if (!multiple) {
        var firstSelected = state.options.find(function (item) { return item.selected; });
        state.options.forEach(function (item) { item.selected = firstSelected ? item === firstSelected : false; });
        field.value = firstSelected ? firstSelected.value : '';
      } else {
        field.value = state.options.filter(function (item) { return item.selected; }).map(function (item) { return item.value; }).join(',');
      }
      host._shSelect = state; select.paint(state); host.setAttribute('data-sh-enhanced', '');
    },

    /* Compatibilidade 1.x: espelha opções legadas em role=option/role=group.
       O contrato 2.0 não define optgroup; refresh() só atende migração. */
    renderOptions: function (state) {
      var listbox = state.listbox;
      listbox.textContent = '';
      state.options = [];

      var i = 0;
      function addOption(nativeOption, container) {
        var el = document.createElement('div');
        el.className = 'sh-select__option';
        el.id = state.native.id + '-opt-' + (i++);
        el.setAttribute('role', 'option');
        el.setAttribute('aria-selected', nativeOption.selected ? 'true' : 'false');
        if (nativeOption.disabled) el.setAttribute('aria-disabled', 'true');
        el.dataset.value = nativeOption.value;
        el.innerHTML =
          '<span class="sh-select__option-label"></span>' +
          svgIcon('sh-select__check', PATH_CHECK);
        el.firstChild.textContent = nativeOption.textContent;
        container.appendChild(el);
        state.options.push({ el: el, native: nativeOption, text: fold(nativeOption.textContent) });
      }

      var children = state.native.children;
      for (var c = 0; c < children.length; c++) {
        var node = children[c];
        if (node.tagName === 'OPTGROUP') {
          var group = document.createElement('div');
          group.className = 'sh-select__group';
          group.setAttribute('role', 'group');
          group.setAttribute('aria-label', node.label);
          var gl = document.createElement('span');
          gl.className = 'sh-select__group-label';
          gl.setAttribute('aria-hidden', 'true');
          gl.textContent = node.label;
          group.appendChild(gl);
          for (var g = 0; g < node.children.length; g++) addOption(node.children[g], group);
          listbox.appendChild(group);
        } else if (node.tagName === 'OPTION') {
          addOption(node, listbox);
        }
      }
    },

    /* O hidden é a fonte do valor no contrato 2.0; o branch native atende só
       a compatibilidade de migração 1.x. */
    paint: function (state) {
      if (state.custom) {
        var values = String(state.native.value || '').split(',').filter(Boolean);
        for (var sync = 0; sync < state.options.length; sync++) {
          state.options[sync].selected = values.indexOf(state.options[sync].value) !== -1;
        }
      }
      var chosen = [];
      for (var i = 0; i < state.options.length; i++) {
        var o = state.options[i];
        var selected = state.custom ? o.selected : o.native.selected;
        var value = state.custom ? o.value : o.native.value;
        var on = selected && value !== '';
        o.el.setAttribute('aria-selected', selected ? 'true' : 'false');
        if (on) chosen.push(state.custom ? o.label : o.native.textContent);
      }

      var placeholder = state.host.getAttribute('data-sh-placeholder') || '';
      var text;
      if (chosen.length === 0) {
        var first = state.custom ? null : state.native.options[state.native.selectedIndex];
        text = placeholder || (first ? first.textContent : '') || 'Selecione';
        state.trigger.setAttribute('data-placeholder', 'true');
      } else if (chosen.length === 1) {
        text = chosen[0];
        state.trigger.removeAttribute('data-placeholder');
      } else {
        var tpl = state.host.getAttribute('data-sh-count-label') || '{n} selecionados';
        text = tpl.replace('{n}', String(chosen.length));
        state.trigger.removeAttribute('data-placeholder');
      }
      state.trigger.querySelector('.sh-select__value').textContent = text;

      if (state.native.getAttribute('aria-invalid') === 'true' || state.host.getAttribute('data-state') === 'error') {
        state.trigger.setAttribute('aria-invalid', 'true');
      } else {
        state.trigger.removeAttribute('aria-invalid');
      }
      state.trigger.disabled = state.native.disabled;
    },

    /* ------------------------------------------------------ abrir/fechar */

    open: function (state, startAt) {
      if (state.trigger.disabled) return;
      if (openSelect && openSelect !== state) select.close(openSelect, false);
      if (!emit(state.host, 'sh:select:open', {})) return;

      state.popover.hidden = false;
      state.trigger.setAttribute('aria-expanded', 'true');
      openSelect = state;
      select.place(state);

      if (state.searchable) {
        state.search.value = '';
        select.filter(state, '');
        state.search.focus();
      }
      var index = typeof startAt === 'number' ? startAt : select.selectedIndex(state);
      select.setActive(state, select.nearestEnabled(state, index, 1));
    },

    close: function (state, focusTrigger) {
      if (state.popover.hidden) return;
      emit(state.host, 'sh:select:close', {});
      state.popover.hidden = true;
      state.trigger.setAttribute('aria-expanded', 'false');
      state.trigger.removeAttribute('aria-activedescendant');
      if (state.search) state.search.removeAttribute('aria-activedescendant');
      select.setActive(state, -1);
      if (state.searchable) select.filter(state, '');
      if (openSelect === state) openSelect = null;
      if (focusTrigger !== false) state.trigger.focus();
    },

    /* Vira para cima quando não cabe embaixo — sem biblioteca de
       posicionamento e sem depender de anchor-position, que ainda não está
       em todos os motores. */
    place: function (state) {
      var rect = state.trigger.getBoundingClientRect();
      var height = state.popover.offsetHeight || 272;
      var below = window.innerHeight - rect.bottom;
      if (below < height + 8 && rect.top > below) {
        state.popover.setAttribute('data-placement', 'top');
      } else {
        state.popover.removeAttribute('data-placement');
      }
    },

    /* ------------------------------------------------------- navegação */

    visible: function (state) {
      var list = [];
      for (var i = 0; i < state.options.length; i++) {
        if (!state.options[i].el.hidden) list.push(i);
      }
      return list;
    },

    selectedIndex: function (state) {
      for (var i = 0; i < state.options.length; i++) {
        if (state.custom ? state.options[i].selected : state.options[i].native.selected) return i;
      }
      return 0;
    },

    /* A partir de `from`, o primeiro índice visível e habilitado no sentido
       `step`. Dá a volta na lista: é o que faz o typeahead reencontrar a
       primeira opção depois da última. */
    nearestEnabled: function (state, from, step) {
      var list = select.visible(state);
      if (!list.length) return -1;
      var dir = step > 0 ? 1 : -1;
      var pos = list.indexOf(from);
      if (pos === -1) pos = dir > 0 ? 0 : list.length - 1;
      for (var n = 0; n < list.length; n++) {
        var p = (pos + dir * n) % list.length;
        if (p < 0) p += list.length;
        var i = list[p];
        if (state.options[i].el.getAttribute('aria-disabled') !== 'true') return i;
      }
      return -1;
    },

    setActive: function (state, index) {
      var owner = state.searchable && !state.popover.hidden ? state.search : state.trigger;
      for (var i = 0; i < state.options.length; i++) {
        state.options[i].el.removeAttribute('data-active');
      }
      state.active = index;
      if (index < 0 || !state.options[index]) {
        owner.removeAttribute('aria-activedescendant');
        return;
      }
      var el = state.options[index].el;
      el.setAttribute('data-active', 'true');
      owner.setAttribute('aria-activedescendant', el.id);
      if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    },

    /* Varredura SEM dar a volta, dentro dos limites da lista. É o que separa
       "seguir para a próxima" de "voltar ao topo": em ↓ na última opção, a
       lista fica parada (APG), e é isso que o teste de teclado verifica. */
    scan: function (state, list, from, dir) {
      for (var p = from; p >= 0 && p < list.length; p += dir) {
        if (state.options[list[p]].el.getAttribute('aria-disabled') !== 'true') return p;
      }
      return -1;
    },

    move: function (state, step) {
      var list = select.visible(state);
      if (!list.length) return;
      var dir = step > 0 ? 1 : -1;
      var span = Math.abs(step);
      var pos = list.indexOf(state.active);

      if (pos === -1) {
        var entry = select.scan(state, list, dir > 0 ? 0 : list.length - 1, dir);
        if (entry !== -1) select.setActive(state, list[entry]);
        return;
      }

      var cur = pos, moved = 0;
      for (var p = pos + dir; p >= 0 && p < list.length; p += dir) {
        if (state.options[list[p]].el.getAttribute('aria-disabled') === 'true') continue;
        cur = p;
        if (++moved === span) break;
      }
      if (cur !== pos) select.setActive(state, list[cur]);
    },

    edge: function (state, which) {
      var list = select.visible(state);
      if (!list.length) return;
      var p = which === 'end'
        ? select.scan(state, list, list.length - 1, -1)
        : select.scan(state, list, 0, 1);
      if (p !== -1) select.setActive(state, list[p]);
    },

    /* --------------------------------------------------------- escolha */

    commit: function (state, index, keepOpen) {
      var option = state.options[index];
      if (!option || option.el.getAttribute('aria-disabled') === 'true') return;

      var previous = state.native.value;
      var nextValue = state.custom ? option.value : option.native.value;
      if (!emit(state.host, 'sh:select:change', {
        value: nextValue, label: state.custom ? option.label : option.native.textContent,
        previous: previous, multiple: state.multiple
      })) return;

      if (state.multiple) {
        if (state.custom) option.selected = !option.selected;
        else option.native.selected = !option.native.selected;
      } else {
        if (state.custom) {
          state.options.forEach(function (item) { item.selected = false; });
          option.selected = true; state.native.value = option.value;
        }
        else state.native.value = option.native.value;
      }
      select.paint(state);
      if (state.custom && state.multiple) {
        state.native.value = state.options.filter(function (item) { return item.selected; }).map(function (item) { return item.value; }).join(',');
      }
      fireNative(state.native);

      if (!state.multiple && keepOpen !== true) select.close(state, true);
    },

    /* ---------------------------------------------------------- filtro */

    filter: function (state, term) {
      var folded = fold(term);
      var shown = 0;
      for (var i = 0; i < state.options.length; i++) {
        var hit = !folded || state.options[i].text.indexOf(folded) !== -1;
        state.options[i].el.hidden = !hit;
        if (hit) shown++;
      }
      /* Os grupos somem junto com o último filho visível. */
      var groups = state.listbox.querySelectorAll('.sh-select__group');
      for (var g = 0; g < groups.length; g++) {
        groups[g].hidden = !groups[g].querySelector('.sh-select__option:not([hidden])');
      }
      state.empty.hidden = shown > 0;
      if (shown && state.options[state.active] && state.options[state.active].el.hidden) {
        select.setActive(state, select.nearestEnabled(state, -1, 1));
      }
    },

    /* ------------------------------------------------------- typeahead */

    typeahead: function (state, char) {
      var now = Date.now();
      if (now - state.bufferAt > 600) state.buffer = '';
      state.bufferAt = now;
      state.buffer += fold(char);

      var list = select.visible(state);
      var start = list.indexOf(state.active);
      for (var n = 1; n <= list.length; n++) {
        var i = list[(start + n + list.length) % list.length];
        var o = state.options[i];
        if (o.el.getAttribute('aria-disabled') === 'true') continue;
        if (o.text.indexOf(state.buffer) === 0) {
          if (state.popover.hidden) select.open(state, i);
          else select.setActive(state, i);
          return;
        }
      }
    },

    /* --------------------------------------------------------- eventos */

    stateOf: function (node) {
      var host = closest(node, '.sh-select');
      return host && host._shSelect ? host._shSelect : null;
    },

    onClick: function (event) {
      var label = closest(event.target, '[data-sh-select-label]');
      if (label) {
        var owner = document.getElementById(label.getAttribute('data-sh-select-label'));
        var st = owner && select.stateOf(owner);
        if (st) { event.preventDefault(); st.trigger.focus(); return; }
      }

      var trigger = closest(event.target, '.sh-select__trigger');
      if (trigger) {
        var s1 = select.stateOf(trigger);
        if (!s1) return;
        if (s1.popover.hidden) select.open(s1);
        else select.close(s1, true);
        return;
      }

      var option = closest(event.target, '.sh-select__option');
      if (option) {
        var s2 = select.stateOf(option);
        if (!s2) return;
        var index = s2.options.findIndex(function (o) { return o.el === option; });
        select.setActive(s2, index);
        select.commit(s2, index);
      }
    },

    onKeydown: function (event) {
      var node = event.target;
      var state = select.stateOf(node);
      if (!state) return;
      var onTrigger = node === state.trigger;
      var onSearch = state.search && node === state.search;
      if (!onTrigger && !onSearch) return;

      var key = event.key;
      var open = !state.popover.hidden;

      if (key === 'Escape') {
        if (open) { event.preventDefault(); select.close(state, true); }
        return;
      }
      if (key === 'Tab') {
        if (open) {
          if (state.active >= 0 && !state.multiple) select.commit(state, state.active, true);
          select.close(state, false);
        }
        return;
      }

      if (!open) {
        if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ' ||
            key === 'Spacebar') {
          event.preventDefault();
          select.open(state);
          return;
        }
        if (key === 'Home' || key === 'End') {
          event.preventDefault();
          select.open(state);
          select.edge(state, key === 'End' ? 'end' : 'start');
          return;
        }
        if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          select.typeahead(state, key);
        }
        return;
      }

      switch (key) {
        case 'ArrowDown':
          event.preventDefault();
          if (event.altKey) { select.close(state, true); break; }
          select.move(state, 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (event.altKey) {
            if (state.active >= 0 && !state.multiple) select.commit(state, state.active, true);
            select.close(state, true);
            break;
          }
          select.move(state, -1);
          break;
        case 'PageDown': event.preventDefault(); select.move(state, 10); break;
        case 'PageUp':   event.preventDefault(); select.move(state, -10); break;
        case 'Home':     event.preventDefault(); select.edge(state, 'start'); break;
        case 'End':      event.preventDefault(); select.edge(state, 'end'); break;
        case 'Enter':
          event.preventDefault();
          if (state.active >= 0) select.commit(state, state.active);
          break;
        case ' ':
        case 'Spacebar':
          /* Com filtro aberto, Espaço é texto. Sem filtro, é confirmação. */
          if (onSearch) return;
          event.preventDefault();
          if (state.active >= 0) select.commit(state, state.active);
          break;
        default:
          if (!onSearch && key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            select.typeahead(state, key);
          }
      }
    },

    onInput: function (event) {
      var node = event.target;
      if (!node.classList || !node.classList.contains('sh-select__search')) return;
      var state = select.stateOf(node);
      if (state) select.filter(state, node.value);
    },

    /* O hidden pode ser mudado por fora (reset de formulário ou script).
       Quando isso acontece o desenho segue o valor canônico do hidden. */
    onNativeChange: function (event) {
      var node = event.target;
      if (node.tagName !== 'SELECT' && !(node.matches && node.matches('input[type="hidden"]'))) return;
      var state = select.stateOf(node);
      if (state && node === state.native) select.paint(state);
    },

    onDocPointer: function (event) {
      if (!openSelect) return;
      if (openSelect.host.contains(event.target)) return;
      select.close(openSelect, false);
    }
  };

  /* ======================================================================
     sh-quantity
     ====================================================================== */

  var quantity = {
    HOST: '[data-sh-quantity], .sh-quantity',

    field: function (host) { return host.querySelector('.sh-quantity__value'); },

    read: function (input) {
      var n = parseFloat(input.value);
      return isNaN(n) ? (parseFloat(input.min) || 0) : n;
    },

    sync: function (host) {
      var input = quantity.field(host);
      if (!input) return;
      var min = input.min === '' ? -Infinity : parseFloat(input.min);
      var max = input.max === '' ? Infinity : parseFloat(input.max);
      var value = quantity.read(input);

      var minus = host.querySelector('.sh-quantity__minus');
      var plus  = host.querySelector('.sh-quantity__plus');
      if (minus) minus.disabled = input.disabled || value <= min;
      if (plus)  plus.disabled  = input.disabled || value >= max;

      host.setAttribute('data-state',
        value > (isFinite(min) ? min : 0) ? 'active' : 'idle');

      var status = host.querySelector('.sh-quantity__status');
      if (status) {
        var name = input.getAttribute('aria-label') || 'Quantidade';
        status.textContent = name + ': ' + value;
      }
    },

    step: function (host, direction) {
      var input = quantity.field(host);
      if (!input || input.disabled) return;
      var step = parseFloat(input.step) || 1;
      var min = input.min === '' ? -Infinity : parseFloat(input.min);
      var max = input.max === '' ? Infinity : parseFloat(input.max);
      var previous = quantity.read(input);
      var value = Math.min(Math.max(previous + step * direction, min), max);
      if (value === previous) return;

      if (!emit(host, 'sh:quantity:change', { value: value, previous: previous })) return;

      input.value = String(value);
      quantity.sync(host);
      fireNative(input);
    },

    onClick: function (event) {
      var button = closest(event.target, '.sh-quantity__minus, .sh-quantity__plus');
      if (!button) return;
      var host = closest(button, '.sh-quantity');
      if (!host) return;
      event.preventDefault();
      quantity.step(host, button.classList.contains('sh-quantity__plus') ? 1 : -1);
    },

    onInput: function (event) {
      var input = event.target;
      if (!input.classList || !input.classList.contains('sh-quantity__value')) return;
      var host = closest(input, '.sh-quantity');
      if (host) quantity.sync(host);
    },

    refresh: function (root) {
      var list = (root || document).querySelectorAll('.sh-quantity');
      for (var i = 0; i < list.length; i++) quantity.sync(list[i]);
    }
  };

  /* ======================================================================
     sh-file
     ====================================================================== */

  var file = {
    HOST: '.sh-file[data-sh-file]',

    build: function (host) {
      if (host.hasAttribute('data-sh-enhanced')) return;
      var input = host.querySelector('input[type="file"]');
      if (!input) return;
      var drop = host.querySelector('.sh-file__drop');
      if (!drop) return;                       /* sem área, fica o nativo */
      if (!host.querySelector('.sh-file__list')) {
        var list = document.createElement('ul');
        list.className = 'sh-file__list';
        host.appendChild(list);
      }
      host.setAttribute('data-sh-enhanced', '');
      /* Só reconstrói a lista se já houver arquivo escolhido. Uma lista que
         veio pronta do servidor (formulário reexibido depois de um erro de
         validação, rascunho recuperado) é conteúdo do autor e sobrevive à
         montagem — quem a reescreve é a escolha seguinte do usuário. */
      var input0 = host.querySelector('input[type="file"]');
      if (input0 && input0.files && input0.files.length) file.render(host);
    },

    bytes: function (n) {
      if (n < 1024) return n + ' B';
      if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
      return (n / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
    },

    render: function (host) {
      var input = host.querySelector('input[type="file"]');
      var list = host.querySelector('.sh-file__list');
      if (!input || !list) return;
      var max = parseInt(host.getAttribute('data-sh-max-size'), 10);
      var rejected = [];

      list.textContent = '';
      for (var i = 0; i < input.files.length; i++) {
        var f = input.files[i];
        var tooBig = !isNaN(max) && f.size > max;
        if (tooBig) rejected.push(f);

        var item = document.createElement('li');
        item.className = 'sh-file__item';
        if (tooBig) item.setAttribute('data-state', 'error');
        item.innerHTML =
          '<span class="sh-file__name"></span>' +
          '<span class="sh-file__size"></span>' +
          '<button type="button" class="sh-file__remove" data-sh-file-remove="' + i + '">' +
          svgIcon('', PATH_X) + '</button>' +
          (tooBig ? '<span class="sh-file__error"></span>' : '');
        item.querySelector('.sh-file__name').textContent = f.name;
        item.querySelector('.sh-file__size').textContent = file.bytes(f.size);
        item.querySelector('.sh-file__remove').setAttribute(
          'aria-label', 'Remover ' + f.name);
        if (tooBig) {
          item.querySelector('.sh-file__error').textContent =
            'Passa do limite de ' + file.bytes(max) + '. Escolha outro arquivo.';
        }
        list.appendChild(item);
      }

      /* O erro do campo é do Lote 0: escrevemos nele, não criamos outro. */
      var field = closest(host, '.sh-field');
      if (field) {
        var slot = field.querySelector('.sh-field__error');
        if (slot && !slot.hasAttribute('data-sh-keep')) {
          slot.textContent = rejected.length
            ? (rejected.length === 1 ? 'Um arquivo passa do limite de tamanho.'
                                     : rejected.length + ' arquivos passam do limite de tamanho.')
            : '';
          if (rejected.length) {
            field.setAttribute('data-state', 'error');
            input.setAttribute('aria-invalid', 'true');
          } else if (field.getAttribute('data-state') === 'error') {
            field.removeAttribute('data-state');
            input.removeAttribute('aria-invalid');
          }
        }
      }

      emit(host, 'sh:file:change', { files: input.files, rejected: rejected });
    },

    remove: function (host, index) {
      var input = host.querySelector('input[type="file"]');
      if (!input || typeof DataTransfer === 'undefined') return;

      /* Item sem File por trás (lista vinda do servidor): sai do DOM e
         pronto — não há FileList para reescrever. */
      if (index >= input.files.length) {
        var items = host.querySelectorAll('.sh-file__item');
        if (items[index]) items[index].remove();
        return;
      }

      var dt = new DataTransfer();
      for (var i = 0; i < input.files.length; i++) {
        if (i !== index) dt.items.add(input.files[i]);
      }
      input.files = dt.files;
      file.render(host);
      var drop = host.querySelector('.sh-file__drop');
      if (drop) input.focus();
    },

    accept: function (host, files) {
      var input = host.querySelector('input[type="file"]');
      if (!input || typeof DataTransfer === 'undefined') return;
      var dt = new DataTransfer();
      if (input.multiple) {
        for (var k = 0; k < input.files.length; k++) dt.items.add(input.files[k]);
      }
      for (var i = 0; i < files.length; i++) {
        dt.items.add(files[i]);
        if (!input.multiple) break;
      }
      input.files = dt.files;
      file.render(host);
    },

    onChange: function (event) {
      var input = event.target;
      if (input.type !== 'file') return;
      var host = closest(input, '.sh-file');
      if (host) file.render(host);
    },

    onClick: function (event) {
      var button = closest(event.target, '.sh-file__remove, [data-sh-file-remove]');
      if (!button) return;
      event.preventDefault();
      var host = closest(button, '.sh-file');
      if (!host) return;
      /* Item construído aqui traz o índice no atributo; item que veio pronto
         do servidor não traz, e o índice é a posição na lista. */
      var declared = button.getAttribute('data-sh-file-remove');
      var index = declared !== null
        ? parseInt(declared, 10)
        : Array.prototype.indexOf.call(
            host.querySelectorAll('.sh-file__item'), closest(button, '.sh-file__item'));
      if (index >= 0) file.remove(host, index);
    },

    onDrag: function (event) {
      var host = closest(event.target, '.sh-file[data-sh-enhanced]');
      if (!host) return;
      var input = host.querySelector('input[type="file"]');
      if (input && input.disabled) return;

      if (event.type === 'dragover') {
        event.preventDefault();
        host.setAttribute('data-state', 'dragover');
      } else if (event.type === 'dragleave') {
        if (!host.contains(event.relatedTarget)) host.removeAttribute('data-state');
      } else if (event.type === 'drop') {
        event.preventDefault();
        host.removeAttribute('data-state');
        if (event.dataTransfer && event.dataTransfer.files.length) {
          file.accept(host, event.dataTransfer.files);
        }
      }
    }
  };

  /* ======================================================================
     sh-search
     ====================================================================== */

  var search = {
    onClick: function (event) {
      var button = closest(event.target, '[data-sh-search-clear], .sh-search__clear');
      if (!button) return;
      var host = closest(button, '.sh-search');
      if (!host) return;
      var input = host.querySelector('.sh-search__input');
      if (!input) return;
      event.preventDefault();
      if (!emit(host, 'sh:search:clear', { value: input.value })) return;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }
  };

  /* ----------------------------------------------------------------- init */

  function refresh(root) {
    var scope = root || document;
    var selects = scope.querySelectorAll(select.HOST);
    for (var i = 0; i < selects.length; i++) {
      if (selects[i]._shSelect) select.paint(selects[i]._shSelect);
      else select.build(selects[i]);
    }
    var files = scope.querySelectorAll(file.HOST);
    for (var f = 0; f < files.length; f++) file.build(files[f]);
    quantity.refresh(scope);
  }

  document.addEventListener('click', select.onClick);
  document.addEventListener('click', quantity.onClick);
  document.addEventListener('click', file.onClick);
  document.addEventListener('click', search.onClick);
  document.addEventListener('keydown', select.onKeydown);
  document.addEventListener('input', select.onInput);
  document.addEventListener('input', quantity.onInput);
  document.addEventListener('change', select.onNativeChange);
  document.addEventListener('change', file.onChange);
  document.addEventListener('pointerdown', select.onDocPointer, true);
  document.addEventListener('dragover', file.onDrag);
  document.addEventListener('dragleave', file.onDrag);
  document.addEventListener('drop', file.onDrag);
  window.addEventListener('resize', function () { if (openSelect) select.place(openSelect); });
  window.addEventListener('scroll', function () { if (openSelect) select.place(openSelect); }, true);

  /* Bloco inserido depois da carga é montado sozinho — a mesma promessa que
     a delegação dá aos componentes do Lote 0. */
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(function (records) {
      for (var r = 0; r < records.length; r++) {
        var added = records[r].addedNodes;
        for (var n = 0; n < added.length; n++) {
          if (added[n].nodeType !== 1) continue;
          if (added[n].matches && added[n].matches(select.HOST + ',' + file.HOST)) refresh(added[n].parentNode);
          else if (added[n].querySelector && added[n].querySelector(select.HOST + ',' + file.HOST)) refresh(added[n]);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { refresh(); });
  } else {
    refresh();
  }

  window.ShalomDSForm = {
    version: VERSION,
    refresh: refresh,
    select: function (el) {
      var host = closest(el, '.sh-select') || el;
      var state = host && host._shSelect;
      if (!state) return null;
      return {
        open:  function () { select.open(state); },
        close: function () { select.close(state, false); },
        get value() { return state.native.value; },
        setValue: function (value) {
          state.native.value = value;
          select.paint(state);
          fireNative(state.native);
        }
      };
    }
  };

}(window, document));
