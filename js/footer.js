// ================================
// Footer.js — Rodapé compartilhado
// ================================
// Injeta footer padronizado em todas as páginas.
// Flags de controle (definir ANTES de importar este script):
//   window.footerPhone = '(61) 99999-9999'  — sobrescreve telefone padrão
//   window.footerBg    = '#1a1a2e'           — sobrescreve cor de fundo

(function () {
  // ---- Detectar basePath a partir do src deste script ----
  function getBasePath() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('footer.js') !== -1) {
        return src.replace(/js\/footer\.js.*$/, '');
      }
    }
    return '';
  }

  var basePath = getBasePath();
  var phone = window.footerPhone || '(61) 98264-4432';
  var phoneDigits = phone.replace(/\D/g, '');
  var bg = window.footerBg || '';

  // ---- Criar footer ----
  var footer = document.createElement('footer');
  footer.className = 'site-footer';
  if (bg) footer.style.background = bg;

  // SVG ícone Instagram (minimalista)
  var igIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>';

  footer.innerHTML =
    '<div class="container">' +
      '<div class="footer-grid">' +
        // Coluna Esquerda: Contato e Redes
        '<div class="footer-col footer-contact">' +
          '<a href="https://www.instagram.com/shalombrasilia/" target="_blank" rel="noopener noreferrer" class="footer-ig">' +
            igIcon + ' @shalombrasilia' +
          '</a>' +
          '<p>Dúvidas, sugestões ou mais informações?<br>' +
            'Fale conosco: <a href="https://wa.me/55' + phoneDigits + '" target="_blank" rel="noopener noreferrer" class="footer-phone">' + phone + '</a>' +
          '</p>' +
        '</div>' +
        // Coluna Central: Tema do Ano
        '<div class="footer-col footer-motto">' +
          '<small>FECUNDOS PELO CORAÇÃO DO KYRIOS</small>' +
        '</div>' +
        // Coluna Direita: Institucional
        '<div class="footer-col footer-brand">' +
          '<img src="' + basePath + 'images/logo-shlaom.svg" alt="Logo Comunidade Católica Shalom">' +
          '<p>Missão Brasília &copy; 2026</p>' +
        '</div>' +
      '</div>' +
    '</div>';

  // ---- Injetar no DOM ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.appendChild(footer);
    });
  } else {
    document.body.appendChild(footer);
  }
})();
