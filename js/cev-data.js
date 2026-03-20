// ============================================
// CEV Data Loader — Carrega dados do Google Sheets CSV
// ============================================
// Uso: definir window.cevCsvUrl antes de carregar este script
// Ex: <script>window.cevCsvUrl = 'https://docs.google.com/...';</script>
//     <script src="../js/cev-data.js"></script>
// ============================================

(function () {
  'use strict';

  var CSV_URL = window.cevCsvUrl;
  if (!CSV_URL) return;

  // Mapeamento coluna CSV → id do elemento HTML
  var FIELD_MAP = {
    'funcionamento': 'field-funcionamento',
    'missa': 'field-missa',
    'adoracao': 'field-adoracao',
    'aconselhamento': 'field-aconselhamento',
    'grupos': 'field-grupos',
    'serviços': 'field-servicos',
    'comunhao10': 'field-comunhao10',
    'comprovante10': 'field-comprovante10',
    'comunhao5': 'field-comunhao5',
    'comprovante5': 'field-comprovante5'
  };

  // Parse CSV simples (sem dependências)
  function parseCSV(text) {
    var lines = text.split('\n').filter(function (l) { return l.trim(); });
    if (lines.length < 2) return { headers: [], rows: [] };

    var headers = lines[0].split(',').map(function (h) { return h.trim().replace(/\r/g, ''); });
    var rows = [];

    for (var i = 1; i < lines.length; i++) {
      var values = lines[i].split(',').map(function (v) { return v.trim().replace(/\r/g, ''); });
      var row = {};
      headers.forEach(function (h, idx) {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }

    return { headers: headers, rows: rows };
  }

  // Agrupa valores de todas as linhas por coluna (ignora vazios)
  function groupByColumn(headers, rows) {
    var grouped = {};
    headers.forEach(function (h) {
      grouped[h] = [];
      rows.forEach(function (row) {
        var val = (row[h] || '').trim();
        if (val) grouped[h].push(val);
      });
    });
    return grouped;
  }

  // Escape HTML
  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Renderiza os dados nos elementos da página
  function renderFields(grouped) {
    Object.keys(FIELD_MAP).forEach(function (csvCol) {
      var elId = FIELD_MAP[csvCol];
      var el = document.getElementById(elId);
      if (!el) return;

      var values = grouped[csvCol] || [];

      // Campos de PIX/email: renderiza com codeblock + botão copiar
      if (csvCol === 'comunhao10' || csvCol === 'comunhao5') {
        renderPixField(el, values, csvCol);
        return;
      }

      // Campos de comprovante: renderiza como link mailto
      if (csvCol === 'comprovante10' || csvCol === 'comprovante5') {
        if (values.length > 0) {
          var email = values[0].trim();
          el.innerHTML = '<p class="small mb-0">Comprovante: <a href="mailto:' + esc(email) + '" class="comprovante-link">' + esc(email) + '</a></p>';
        } else {
          el.innerHTML = '<p class="small mb-0 text-muted">A confirmar</p>';
        }
        return;
      }

      // Campos normais: lista
      if (values.length === 0) {
        el.innerHTML = '<li class="text-muted">A confirmar</li>';
        return;
      }

      var html = '';
      values.forEach(function (v) {
        html += '<li>' + esc(v) + '</li>';
      });
      el.innerHTML = html;
    });
  }

  // Renderiza campo PIX com codeblock e botão copiar
  function renderPixField(el, values, colName) {
    if (values.length === 0) {
      el.innerHTML = '<p class="small mb-0 text-muted">A confirmar</p>';
      return;
    }

    var pixId = 'pix-' + colName;
    el.innerHTML =
      '<div class="codeblock mb-2">' +
        '<code id="' + pixId + '">' + esc(values[0]) + '</code>' +
        '<button class="copy-btn" data-target="' + pixId + '" title="Copiar">' +
          '<svg viewBox="0 0 24 24"><path fill="#e5e7eb" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1Zm3 4H8c-1.1 0-2 .9-2 2v16h13c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2Zm0 18H8V7h11v16Z"/></svg>' +
        '</button>' +
      '</div>';

    // Registrar evento de copiar no novo botão
    var btn = el.querySelector('.copy-btn');
    if (btn && typeof copyText === 'function') {
      btn.addEventListener('click', function () {
        var code = document.getElementById(pixId);
        if (code) copyText(code.textContent.trim());
      });
    }
  }

  // Mostrar skeletons
  function showSkeletons() {
    Object.keys(FIELD_MAP).forEach(function (csvCol) {
      var el = document.getElementById(FIELD_MAP[csvCol]);
      if (!el) return;
      el.innerHTML = '<li class="skeleton skeleton-text"></li>';
    });
  }

  // Mostrar erro
  function showError() {
    Object.keys(FIELD_MAP).forEach(function (csvCol) {
      var el = document.getElementById(FIELD_MAP[csvCol]);
      if (!el) return;
      el.innerHTML = '<li class="small text-muted">Não foi possível carregar os dados.</li>';
    });
  }

  // Carregar e renderizar
  function loadCevData() {
    showSkeletons();

    fetch(CSV_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var parsed = parseCSV(text);
        var grouped = groupByColumn(parsed.headers, parsed.rows);
        renderFields(grouped);
      })
      .catch(function (err) {
        console.error('Erro ao carregar dados do CEV:', err);
        showError();
      });
  }

  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCevData);
  } else {
    loadCevData();
  }

})();
