// ============================================
// PROVIDENCIA - Pagina Hub (index)
// ============================================
//
// Carrega dados da Comunhao de Bens (CSV) e
// renderiza o donut chart com a porcentagem do mes.
//
// Depende de: config.js (PROVIDENCIA_CONFIG, fetchCSV)
// ============================================

(function () {
  'use strict';

  // ============================================
  // COMUNHAO DE BENS - DONUT CHART
  // ============================================

  function loadComunhao() {
    fetchCSV(
      PROVIDENCIA_CONFIG.csvComunhao,
      function (data) {
        // Pega a ultima linha do CSV (dados mais recentes)
        var row = data[data.length - 1];
        var mes = (row.mes || '').trim();
        var percentual = parseFloat((row.percentual || '0').replace(',', '.'));

        if (isNaN(percentual)) percentual = 0;

        renderDonut(mes, percentual);
      },
      function () {
        // Em caso de erro, esconde o card
        var card = document.getElementById('comunhao-card');
        if (card) card.style.display = 'none';
      }
    );
  }

  /**
   * Renderiza o donut (SVG ring) com a porcentagem e o nome do mes.
   */
  function renderDonut(mes, percentual) {
    var svgEl = document.getElementById('comunhao-donut');
    var mesEl = document.getElementById('comunhao-mes');
    var pctEl = document.getElementById('comunhao-pct');

    if (!svgEl || !mesEl || !pctEl) return;

    // Circunferencia do circulo (r=54, C = 2 * PI * 54 ≈ 339.29)
    var circumference = 2 * Math.PI * 54;
    var offset = circumference - (percentual / 100) * circumference;

    // Preenche o arco
    var progressCircle = svgEl.querySelector('.donut-progress');
    if (progressCircle) {
      progressCircle.style.strokeDasharray = circumference;
      progressCircle.style.strokeDashoffset = circumference; // comeca vazio

      // Anima apos um breve delay
      setTimeout(function () {
        progressCircle.style.transition = 'stroke-dashoffset 1.2s ease-out';
        progressCircle.style.strokeDashoffset = offset;
      }, 300);
    }

    // Esconde o spinner de carregamento
    var spinner = document.getElementById('comunhao-spinner');
    if (spinner) spinner.style.display = 'none';

    // Texto central
    pctEl.textContent = percentual.toFixed(0) + '%';
    mesEl.textContent = mes;

    // Mostra o card (estava hidden ate carregar)
    var card = document.getElementById('comunhao-card');
    if (card) card.classList.add('loaded');
  }

  // ============================================
  // INICIALIZACAO
  // ============================================

  document.addEventListener('DOMContentLoaded', function () {
    loadComunhao();
  });

})();
