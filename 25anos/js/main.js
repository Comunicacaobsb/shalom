/* ==========================================================================
   25 Anos Shalom Brasília - JavaScript
   ========================================================================== */

/**
 * Smooth scroll para links de âncora
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

/**
 * Esconder scroll indicator após scroll
 */
const scrollIndicator = document.querySelector('.scroll-indicator');
if (scrollIndicator) {
  window.addEventListener('scroll', function () {
    if (window.scrollY > 100) {
      scrollIndicator.style.opacity = '0';
      scrollIndicator.style.pointerEvents = 'none';
    } else {
      scrollIndicator.style.opacity = '0.7';
      scrollIndicator.style.pointerEvents = 'auto';
    }
  });
}

/**
 * Adicionar classe ao body quando menu está aberto
 */
const menuOffcanvas = document.getElementById('menuOffcanvas');
if (menuOffcanvas) {
  menuOffcanvas.addEventListener('show.bs.offcanvas', function () {
    document.body.classList.add('menu-open');
  });

  menuOffcanvas.addEventListener('hide.bs.offcanvas', function () {
    document.body.classList.remove('menu-open');
  });
}

/**
 * Carregar eventos dinamicamente via Google Sheets (CSV)
 */
(function () {
  var CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-pbvSfuIvxl3WarKBKMsOBHOO3zmpup7EBInURPaDNRjIhkLSGduNTJxdDyISbRFq3xawLaa5uJC0/pub?gid=919829268&single=true&output=csv';
  var grid = document.getElementById('eventos-grid');
  var loader = document.getElementById('eventos-loader');
  if (!grid) return;

  // Mapear tags para classes CSS e badges
  var TAG_MAP = {
    'evento principal': { cardClass: 'card-evento-destaque', col: 'col-12', heading: 'h4' },
    'encerramento': { cardClass: 'card-evento-final', col: 'col-12', heading: 'h4' },
    'especial': { badgeClass: 'evento-badge-especial' }
  };

  function parseCSV(text) {
    var lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    var headers = lines[0].split(',').map(function (h) { return h.trim(); });
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      var values = lines[i].split(',');
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = (values[j] || '').trim();
      }
      if (row['Evento']) rows.push(row);
    }
    return rows;
  }

  function renderEventos(eventos) {
    var html = '';
    eventos.forEach(function (ev) {
      var tag = (ev['Tag'] || '').toLowerCase();
      var config = TAG_MAP[tag] || {};
      var colClass = config.col || 'col-md-6 col-lg-4';
      var cardClass = 'card card-evento' + (config.cardClass ? ' ' + config.cardClass : '') + (config.col ? '' : ' h-100');
      var heading = config.heading || 'h5';
      var badgeClass = config.badgeClass || '';

      var isDestaque = config.col === 'col-12';
      var dataSize = isDestaque ? 'width:85px;height:85px' : '';
      var diaSize = isDestaque ? 'font-size:1.75rem' : '';
      var mesSize = isDestaque ? 'font-size:0.8rem' : '';

      var linkOpen = ev['Link'] ? '<a href="' + ev['Link'] + '" target="_blank" rel="noopener" class="text-decoration-none">' : '';
      var linkClose = ev['Link'] ? '</a>' : '';

      html += '<div class="' + colClass + '">';
      html += linkOpen;
      html += '<div class="' + cardClass + '">';
      html += '<div class="card-body">';

      // Data
      html += '<div class="evento-data"' + (dataSize ? ' style="' + dataSize + '"' : '') + '>';
      html += '<span class="evento-dia"' + (diaSize ? ' style="' + diaSize + '"' : '') + '>' + ev['Dias'] + '</span>';
      html += '<span class="evento-mes"' + (mesSize ? ' style="' + mesSize + '"' : '') + '>' + ev['Mes'] + '</span>';
      html += '</div>';

      // Info
      html += '<div class="evento-info">';
      if (ev['Tag']) {
        html += '<span class="evento-badge' + (badgeClass ? ' ' + badgeClass : '') + '">' + ev['Tag'] + '</span>';
      }
      html += '<' + heading + ' class="evento-titulo">' + ev['Evento'] + '</' + heading + '>';
      if (ev['Descricao']) {
        html += '<p class="evento-descricao">' + ev['Descricao'] + '</p>';
      }
      html += '</div>';

      // Botão flutuante com seta se tiver link
      if (ev['Link']) {
        html += '<span class="evento-link-arrow">';
        html += '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>';
        html += '</span>';
      }

      html += '</div></div>';
      html += linkClose;
      html += '</div>';
    });

    if (loader) loader.style.display = 'none';
    grid.style.display = '';
    grid.innerHTML = html;
  }

  function showError() {
    if (loader) loader.style.display = 'none';
    grid.style.display = '';
    grid.innerHTML = '<div class="col-12 text-center text-white-50"><p>Não foi possível carregar os eventos. Tente novamente mais tarde.</p></div>';
  }

  fetch(CSV_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (csv) {
      var eventos = parseCSV(csv);
      if (eventos.length > 0) {
        renderEventos(eventos);
      } else {
        showError();
      }
    })
    .catch(function (err) {
      console.error('Erro ao carregar eventos:', err);
      showError();
    });
})();
