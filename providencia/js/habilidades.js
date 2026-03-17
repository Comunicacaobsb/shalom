// ============================================
// PROVIDÊNCIA - Página de Habilidades
// ============================================
//
// Este arquivo gerencia a página de Habilidades:
// 1. Carrega o CSV de Habilidades do Google Sheets
// 2. Renderiza os cards no grid com nome, tags e WhatsApp
// 3. Implementa busca em tempo real por nome ou habilidade
//
// Depende de: config.js (constantes e funções compartilhadas)
// ============================================

(function () {
  'use strict';

  // Guarda todos os dados para filtragem na busca
  var allSkillsData = [];

  // ============================================
  // CARREGAR HABILIDADES
  // ============================================

  function loadSkills() {
    fetchCSV(
      PROVIDENCIA_CONFIG.csvHabilidades,
      function (data) {
        allSkillsData = data;
        renderSkillCards(data);
        document.getElementById('skills-loading').style.display = 'none';
        hidePreloader();
      },
      function () {
        document.getElementById('skills-loading').style.display = 'none';
        document.getElementById('skills-error').style.display = '';
        hidePreloader();
      }
    );
  }

  // ============================================
  // RENDERIZAR CARDS
  // ============================================

  /**
   * Renderiza os cards de habilidades no grid.
   * Cada card mostra: nome, habilidades (como tags) e botão WhatsApp.
   */
  function renderSkillCards(data) {
    var html = '';

    data.forEach(function (person) {
      var name = (person.Nome_do_Irmao || '').trim();
      var skills = (person.Habilidades || '').trim();
      var phone = (person.Telefone_WhatsApp || '').trim();

      if (!name) return;

      // Criar tags visuais para cada habilidade
      var skillTags = '';
      if (skills) {
        skills.split(',').forEach(function (skill) {
          var s = skill.trim();
          if (s) skillTags += '<span>' + escapeHTML(s) + '</span>';
        });
      }

      // Limpar número de telefone (remove tudo que não é dígito)
      var cleanPhone = phone.replace(/\D/g, '');

      // Botão WhatsApp (só se houver telefone)
      var whatsappBtn = '';
      if (cleanPhone) {
        var message = 'Olá, ' + name + '! Vi suas habilidades no Providência e gostaria de conversar.';
        var waUrl = buildWhatsAppUrl(cleanPhone, message);

        whatsappBtn = '<div class="skill-card-footer">' +
          '<a href="' + waUrl + '" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">' +
          whatsappIcon() +
          'Conversar</a></div>';
      }

      html += '<div class="skill-card">' +
        '<h3 class="skill-card-name">' + escapeHTML(name) + '</h3>' +
        '<div class="skill-card-skills">' + skillTags + '</div>' +
        whatsappBtn +
        '</div>';
    });

    var grid = document.getElementById('skills-grid');
    var empty = document.getElementById('skills-empty');

    if (!html) {
      grid.innerHTML = '';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    grid.innerHTML = html;
  }

  // ============================================
  // BUSCA / FILTRO
  // ============================================

  /**
   * Filtra os cards em tempo real conforme o usuário digita.
   * Verifica se o texto existe no nome OU nas habilidades (substring).
   */
  /**
   * Remove acentos para busca tolerante (ex: "joao" encontra "João").
   */
  function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function setupSearch() {
    var searchInput = document.getElementById('skills-search');
    var debounceTimer;

    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);

      debounceTimer = setTimeout(function () {
        var query = removeAccents(searchInput.value.toLowerCase().trim());

        if (!query) {
          renderSkillCards(allSkillsData);
          return;
        }

        var filtered = allSkillsData.filter(function (person) {
          var name = removeAccents((person.Nome_do_Irmao || '').toLowerCase());
          var skills = removeAccents((person.Habilidades || '').toLowerCase());
          return name.includes(query) || skills.includes(query);
        });

        renderSkillCards(filtered);
      }, PROVIDENCIA_CONFIG.debounceDelay);
    });
  }

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  document.addEventListener('DOMContentLoaded', function () {
    setupSearch();
    loadSkills();
  });

})();
