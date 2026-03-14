// ============================================
// PROVIDÊNCIA - Página de Necessidades
// ============================================
//
// Este arquivo gerencia a página de Necessidades:
// 1. Carrega o CSV de Necessidades do Google Sheets
// 2. Agrupa os itens por Local (casa comunitária / centro de evangelização)
// 3. Cria abas (tabs) dinâmicas para cada local
// 4. Mostra o nome completo do local selecionado
// 5. Lista os itens com botão de WhatsApp para doação
//
// Depende de: config.js (constantes e funções compartilhadas)
// ============================================

(function () {
  'use strict';

  // Mapeamento: tabId → nome completo do local
  // Usado para exibir o nome completo quando a tab é clicada
  var localNames = {};

  // ============================================
  // CARREGAR NECESSIDADES
  // ============================================

  function loadNeeds() {
    fetchCSV(
      PROVIDENCIA_CONFIG.csvNecessidades,
      function (data) {
        renderNeeds(data);
        document.getElementById('needs-loading').style.display = 'none';
        hidePreloader();
      },
      function () {
        document.getElementById('needs-loading').style.display = 'none';
        document.getElementById('needs-error').style.display = '';
        hidePreloader();
      }
    );
  }

  // ============================================
  // RENDERIZAR NECESSIDADES
  // ============================================

  /**
   * Agrupa os dados por Local e gera as abas + listas de itens.
   *
   * Fluxo:
   * 1. Agrupar registros por Local
   * 2. Criar botões de aba (nav-pills) com nomes curtos
   * 3. Criar painéis com listas de itens + botões WhatsApp
   * 4. Exibir o nome completo do primeiro local
   */
  function renderNeeds(data) {
    // Passo 1: Agrupar itens por Local
    var grouped = {};

    data.forEach(function (row) {
      var local = (row.Local || '').trim();
      var item = (row.Item_Necessidade || '').trim();
      if (!local || !item) return;

      if (!grouped[local]) grouped[local] = [];
      grouped[local].push(item);
    });

    var locals = Object.keys(grouped);

    if (locals.length === 0) {
      document.getElementById('needs-error').style.display = '';
      return;
    }

    // Passo 2: Criar as abas
    var tabsUl = document.getElementById('needs-tabs');
    var tabsHTML = '';

    locals.forEach(function (local, index) {
      var tabId = 'needs-tab-' + index;
      var isActive = index === 0 ? ' active' : '';
      var ariaSelected = index === 0 ? 'true' : 'false';
      var shortName = getShortName(local);

      // Guardar o mapeamento para exibir nome completo
      localNames[tabId] = local;

      tabsHTML += '<li class="nav-item" role="presentation">' +
        '<button class="nav-link' + isActive + '" ' +
        'id="' + tabId + '-tab" ' +
        'data-bs-toggle="pill" ' +
        'data-bs-target="#' + tabId + '" ' +
        'data-local-full="' + escapeHTML(local) + '" ' +
        'type="button" role="tab" ' +
        'aria-controls="' + tabId + '" ' +
        'aria-selected="' + ariaSelected + '">' +
        shortName +
        '</button></li>';
    });
    tabsUl.innerHTML = tabsHTML;

    // Passo 3: Criar o conteúdo de cada aba
    var tabContent = document.getElementById('needs-tab-content');
    var contentHTML = '';

    locals.forEach(function (local, index) {
      var tabId = 'needs-tab-' + index;
      var isActive = index === 0 ? ' show active' : '';
      var items = grouped[local];

      contentHTML += '<div class="tab-pane fade' + isActive + '" ' +
        'id="' + tabId + '" role="tabpanel" ' +
        'aria-labelledby="' + tabId + '-tab">';

      contentHTML += '<ul class="needs-list">';

      items.forEach(function (item) {
        var message = 'Olá! Gostaria de ajudar com a doação do item ' + item + ' para ' + local + '.';
        var waUrl = buildWhatsAppUrl(PROVIDENCIA_CONFIG.whatsappProvidencia, message);

        contentHTML += '<li>' +
          '<span class="need-item-name">' + escapeHTML(item) + '</span>' +
          '<a href="' + waUrl + '" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">' +
          whatsappIcon() +
          'Doar</a>' +
          '</li>';
      });

      contentHTML += '</ul></div>';
    });

    tabContent.innerHTML = contentHTML;

    // Passo 4: Mostrar nome completo do primeiro local
    var localNameEl = document.getElementById('needs-local-name');
    if (locals.length > 0) {
      localNameEl.textContent = locals[0];
    }

    // Passo 5: Listener para atualizar nome completo ao trocar de tab
    setupTabNameListener();
  }

  /**
   * Quando o usuário clica em uma aba, atualiza o texto com o nome
   * completo do local (ex: "Casa Comunitária Asa Sul").
   */
  function setupTabNameListener() {
    var tabButtons = document.querySelectorAll('#needs-tabs .nav-link');
    var localNameEl = document.getElementById('needs-local-name');

    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fullName = btn.getAttribute('data-local-full');
        if (fullName && localNameEl) {
          localNameEl.textContent = fullName;
        }
      });
    });
  }

  /**
   * Cria um nome curto para a aba.
   * Ex: "Casa Comunitária Asa Sul" → "CC Asa Sul"
   *     "Centro de Evangelização Taguatinga" → "CE Taguatinga"
   */
  function getShortName(local) {
    if (local.indexOf('Casa Comunitária') === 0) {
      return 'CC ' + local.replace('Casa Comunitária', '').trim();
    }
    if (local.indexOf('Centro de Evangelização') === 0) {
      return 'CE ' + local.replace('Centro de Evangelização', '').trim();
    }
    return local;
  }

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  document.addEventListener('DOMContentLoaded', function () {
    loadNeeds();
  });

})();
