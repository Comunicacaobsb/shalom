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
