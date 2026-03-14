// ============================================
// PROVIDÊNCIA - Aplicação Principal
// Comunidade Católica Shalom Brasília
// ============================================
//
// Este arquivo gerencia toda a lógica do site:
//
// 1. CONFIGURAÇÃO - URLs dos CSVs e constantes
// 2. NAVEGAÇÃO - Alternar entre as seções Necessidades e Habilidades
// 3. CARREGAMENTO DE DADOS - Buscar e interpretar os CSVs do Google Sheets
// 4. NECESSIDADES - Criar abas por local e listar itens com botão WhatsApp
// 5. HABILIDADES - Exibir cards e filtrar por busca em tempo real
//
// Os dados vêm de planilhas do Google Sheets publicadas como CSV.
// Usamos a biblioteca PapaParse (carregada via CDN) para converter
// o texto CSV em objetos JavaScript de forma confiável, lidando
// com acentuação (UTF-8) e campos com vírgulas.
// ============================================

(function () {
  'use strict';

  // ============================================
  // 1. CONFIGURAÇÃO
  // ============================================
  // Aqui ficam todas as constantes do app: URLs dos CSVs,
  // número de WhatsApp geral, e referências aos elementos HTML.

  var CONFIG = {
    // URL do CSV de Necessidades (colunas: Local, Item_Necessidade)
    csvNecessidades: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-pbvSfuIvxl3WarKBKMsOBHOO3zmpup7EBInURPaDNRjIhkLSGduNTJxdDyISbRFq3xawLaa5uJC0/pub?gid=0&single=true&output=csv',

    // URL do CSV de Habilidades (colunas: Nome_do_Irmao, Habilidades, Telefone_WhatsApp)
    csvHabilidades: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-pbvSfuIvxl3WarKBKMsOBHOO3zmpup7EBInURPaDNRjIhkLSGduNTJxdDyISbRFq3xawLaa5uJC0/pub?gid=862267857&single=true&output=csv',

    // Número de WhatsApp único para todas as necessidades
    whatsappGeral: '5561982644432',

    // Tempo de espera (ms) antes de aplicar o filtro de busca
    // Isso evita que o site fique lento enquanto o usuário digita rápido
    debounceDelay: 300
  };

  // ============================================
  // 2. REFERÊNCIAS AOS ELEMENTOS HTML
  // ============================================
  // Guardamos referências aos elementos que vamos manipular
  // para não precisar buscá-los no HTML toda vez.

  var elements = {
    preloader: document.getElementById('preloader'),
    sectionNav: document.getElementById('section-nav'),
    sectionNecessidades: document.getElementById('section-necessidades'),
    sectionHabilidades: document.getElementById('section-habilidades'),
    needsTabs: document.getElementById('needs-tabs'),
    needsTabContent: document.getElementById('needs-tab-content'),
    needsLoading: document.getElementById('needs-loading'),
    needsError: document.getElementById('needs-error'),
    skillsGrid: document.getElementById('skills-grid'),
    skillsLoading: document.getElementById('skills-loading'),
    skillsError: document.getElementById('skills-error'),
    skillsEmpty: document.getElementById('skills-empty'),
    skillsSearch: document.getElementById('skills-search')
  };

  // Variável para guardar todos os dados de habilidades (usada na busca)
  var allSkillsData = [];

  // Controle para saber se os dados de habilidades já foram carregados
  var skillsLoaded = false;

  // ============================================
  // 3. NAVEGAÇÃO ENTRE SEÇÕES
  // ============================================
  // Quando o usuário clica em "Necessidades" ou "Habilidades",
  // alternamos qual seção está visível na tela.

  function setupNavigation() {
    // Busca todos os botões de navegação
    var buttons = elements.sectionNav.querySelectorAll('.section-btn');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        // Remove a classe "active" de todos os botões
        buttons.forEach(function (b) { b.classList.remove('active'); });

        // Adiciona "active" no botão clicado
        btn.classList.add('active');

        // Descobre qual seção mostrar pelo atributo data-section
        var sectionId = btn.getAttribute('data-section');

        // Esconde ambas as seções
        elements.sectionNecessidades.style.display = 'none';
        elements.sectionHabilidades.style.display = 'none';

        // Mostra a seção correspondente
        if (sectionId === 'necessidades') {
          elements.sectionNecessidades.style.display = '';
        } else if (sectionId === 'habilidades') {
          elements.sectionHabilidades.style.display = '';

          // Carrega os dados de habilidades apenas na primeira vez
          // (lazy loading - evita carregar dados que o usuário talvez nem veja)
          if (!skillsLoaded) {
            loadSkills();
          }
        }
      });
    });
  }

  // ============================================
  // 4. CARREGAMENTO DE DADOS CSV
  // ============================================
  // Usamos o PapaParse para fazer o download e converter o CSV.
  // O PapaParse cuida de:
  // - Fazer a requisição HTTP (download: true)
  // - Interpretar as colunas usando a primeira linha como cabeçalho (header: true)
  // - Ignorar linhas vazias (skipEmptyLines: true)
  // - Tratar caracteres especiais e acentos (UTF-8)

  /**
   * Faz o download de um CSV e retorna os dados como array de objetos.
   * Cada objeto tem chaves correspondentes aos nomes das colunas do CSV.
   *
   * Exemplo de retorno para o CSV de Necessidades:
   * [
   *   { Local: "Casa Comunitária Asa Sul", Item_Necessidade: "Arroz 5kg" },
   *   { Local: "Casa Comunitária Asa Sul", Item_Necessidade: "Feijão 1kg" },
   *   ...
   * ]
   *
   * @param {string} url - URL do arquivo CSV publicado no Google Sheets
   * @param {function} onSuccess - Função chamada com os dados quando o download termina
   * @param {function} onError - Função chamada se houver erro no download
   */
  function fetchCSV(url, onSuccess, onError) {
    Papa.parse(url, {
      download: true,        // Faz o download automático da URL
      header: true,          // Usa a primeira linha como nome das colunas
      skipEmptyLines: true,  // Ignora linhas em branco
      complete: function (results) {
        // results.data contém o array de objetos com os dados
        if (results.data && results.data.length > 0) {
          onSuccess(results.data);
        } else {
          onError('CSV vazio ou sem dados válidos');
        }
      },
      error: function (error) {
        console.error('Erro ao carregar CSV:', error);
        onError(error);
      }
    });
  }

  // ============================================
  // 5. NECESSIDADES
  // ============================================
  // Ao carregar o CSV de Necessidades, agrupamos os itens por Local
  // e criamos uma aba (tab) para cada local. Dentro de cada aba,
  // listamos os itens com um botão de WhatsApp para contato.

  function loadNeeds() {
    fetchCSV(
      CONFIG.csvNecessidades,
      function (data) {
        // Sucesso! Renderiza as abas e listas
        renderNeeds(data);
        // Esconde o estado de carregamento
        elements.needsLoading.style.display = 'none';
        // Esconde o preloader geral (primeiro conteúdo carregou)
        hidePreloader();
      },
      function () {
        // Erro! Mostra mensagem para o usuário
        elements.needsLoading.style.display = 'none';
        elements.needsError.style.display = '';
        hidePreloader();
      }
    );
  }

  /**
   * Agrupa os dados por Local e gera as abas + listas de itens.
   *
   * O fluxo é:
   * 1. Percorrer todos os registros e agrupar por Local
   * 2. Para cada Local, criar um botão de aba (nav-pill)
   * 3. Para cada Local, criar um painel com a lista de itens
   * 4. Cada item tem um botão de WhatsApp com mensagem pré-pronta
   */
  function renderNeeds(data) {
    // Passo 1: Agrupar itens por Local
    // Resultado: { "Casa Comunitária Asa Sul": ["Arroz", "Feijão"], ... }
    var grouped = {};

    data.forEach(function (row) {
      var local = (row.Local || '').trim();
      var item = (row.Item_Necessidade || '').trim();

      // Ignora registros com campos vazios
      if (!local || !item) return;

      if (!grouped[local]) {
        grouped[local] = [];
      }
      grouped[local].push(item);
    });

    var locals = Object.keys(grouped);

    // Se não houver dados, mostra erro
    if (locals.length === 0) {
      elements.needsError.style.display = '';
      return;
    }

    // Passo 2: Criar as abas (tabs) - uma para cada Local
    var tabsHTML = '';
    locals.forEach(function (local, index) {
      var tabId = 'needs-tab-' + index;
      var isActive = index === 0 ? ' active' : '';
      var ariaSelected = index === 0 ? 'true' : 'false';

      // Cria um nome curto para a aba (remove prefixos comuns)
      var shortName = getShortName(local);

      tabsHTML += '<li class="nav-item" role="presentation">' +
        '<button class="nav-link' + isActive + '" ' +
        'id="' + tabId + '-tab" ' +
        'data-bs-toggle="pill" ' +
        'data-bs-target="#' + tabId + '" ' +
        'type="button" role="tab" ' +
        'aria-controls="' + tabId + '" ' +
        'aria-selected="' + ariaSelected + '">' +
        shortName +
        '</button></li>';
    });
    elements.needsTabs.innerHTML = tabsHTML;

    // Passo 3: Criar o conteúdo de cada aba (lista de itens)
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
        // Passo 4: Gerar o link do WhatsApp com mensagem pré-pronta
        var message = 'Olá! Gostaria de ajudar com a doação do item ' + item + ' para ' + local + '.';
        var waUrl = buildWhatsAppUrl(CONFIG.whatsappGeral, message);

        contentHTML += '<li>' +
          '<span class="need-item-name">' + escapeHTML(item) + '</span>' +
          '<a href="' + waUrl + '" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">' +
          whatsappIcon() +
          'Doar</a>' +
          '</li>';
      });

      contentHTML += '</ul></div>';
    });

    elements.needsTabContent.innerHTML = contentHTML;
  }

  /**
   * Cria um nome curto para a aba, removendo prefixos repetitivos.
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
  // 6. HABILIDADES
  // ============================================
  // Ao carregar o CSV de Habilidades, guardamos todos os dados
  // e renderizamos os cards. O campo de busca filtra em tempo real.

  function loadSkills() {
    skillsLoaded = true;

    fetchCSV(
      CONFIG.csvHabilidades,
      function (data) {
        // Guarda os dados para uso na busca
        allSkillsData = data;
        // Renderiza todos os cards
        renderSkillCards(data);
        // Remove o estado de carregamento
        elements.skillsLoading.style.display = 'none';
      },
      function () {
        // Erro! Mostra mensagem
        elements.skillsLoading.style.display = 'none';
        elements.skillsError.style.display = '';
      }
    );
  }

  /**
   * Renderiza os cards de habilidades no grid.
   * Cada card mostra: nome do irmão, suas habilidades (como tags),
   * e um botão de WhatsApp com o número específico dele.
   */
  function renderSkillCards(data) {
    var html = '';

    data.forEach(function (person) {
      var name = (person.Nome_do_Irmao || '').trim();
      var skills = (person.Habilidades || '').trim();
      var phone = (person.Telefone_WhatsApp || '').trim();

      // Ignora registros sem nome
      if (!name) return;

      // Separa as habilidades por vírgula e cria tags visuais
      var skillTags = '';
      if (skills) {
        skills.split(',').forEach(function (skill) {
          var s = skill.trim();
          if (s) {
            skillTags += '<span>' + escapeHTML(s) + '</span>';
          }
        });
      }

      // Limpa o número de telefone (remove tudo que não é dígito)
      var cleanPhone = phone.replace(/\D/g, '');

      // Monta o botão de WhatsApp (só se houver telefone)
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

    // Se não houver cards, mostra estado vazio
    if (!html) {
      elements.skillsGrid.innerHTML = '';
      elements.skillsEmpty.style.display = '';
      return;
    }

    elements.skillsEmpty.style.display = 'none';
    elements.skillsGrid.innerHTML = html;
  }

  // ============================================
  // 7. BUSCA / FILTRO DE HABILIDADES
  // ============================================
  // O campo de busca filtra os cards em tempo real.
  // Verificamos se o texto digitado existe dentro do nome
  // OU das habilidades de cada pessoa (busca por substring).

  function setupSearch() {
    var debounceTimer;

    elements.skillsSearch.addEventListener('input', function () {
      // Limpa o timer anterior (debounce)
      clearTimeout(debounceTimer);

      // Aguarda o usuário parar de digitar antes de filtrar
      debounceTimer = setTimeout(function () {
        var query = elements.skillsSearch.value.toLowerCase().trim();

        // Se o campo estiver vazio, mostra todos
        if (!query) {
          renderSkillCards(allSkillsData);
          return;
        }

        // Filtra os dados: verifica se o texto aparece no nome OU nas habilidades
        var filtered = allSkillsData.filter(function (person) {
          var name = (person.Nome_do_Irmao || '').toLowerCase();
          var skills = (person.Habilidades || '').toLowerCase();

          // includes() verifica se a string contém o texto buscado
          // Ex: "pintor, encanador".includes("encan") → true
          return name.includes(query) || skills.includes(query);
        });

        // Renderiza apenas os resultados filtrados
        renderSkillCards(filtered);
      }, CONFIG.debounceDelay);
    });
  }

  // ============================================
  // 8. FUNÇÕES AUXILIARES
  // ============================================

  /**
   * Monta a URL de contato do WhatsApp com mensagem pré-pronta.
   * Formato: https://wa.me/NUMERO?text=MENSAGEM_CODIFICADA
   *
   * @param {string} phone - Número do WhatsApp (apenas dígitos, com DDI)
   * @param {string} message - Mensagem que aparecerá pré-preenchida no WhatsApp
   * @returns {string} URL completa do WhatsApp
   */
  function buildWhatsAppUrl(phone, message) {
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
  }

  /**
   * Retorna o ícone SVG do WhatsApp como string HTML.
   * Usado nos botões de contato.
   */
  function whatsappIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">' +
      '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>' +
      '<path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.555 4.126 1.528 5.864L.06 23.884l6.171-1.617A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82c-1.978 0-3.81-.577-5.37-1.572l-.385-.23-3.992 1.047 1.066-3.893-.252-.401A9.78 9.78 0 0 1 2.18 12c0-5.414 4.406-9.82 9.82-9.82 5.414 0 9.82 4.406 9.82 9.82 0 5.414-4.406 9.82-9.82 9.82z"/>' +
      '</svg>';
  }

  /**
   * Escapa caracteres HTML especiais para evitar injeção de código.
   * Isso é importante porque os dados vêm de uma fonte externa (CSV).
   *
   * @param {string} str - Texto a ser escapado
   * @returns {string} Texto seguro para inserir no HTML
   */
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /**
   * Esconde o preloader (tela de carregamento inicial).
   * Usa uma transição suave de opacidade antes de remover.
   */
  function hidePreloader() {
    if (elements.preloader) {
      elements.preloader.classList.add('hidden');
      setTimeout(function () {
        elements.preloader.style.display = 'none';
      }, 500);
    }
  }

  // ============================================
  // 9. INICIALIZAÇÃO
  // ============================================
  // Quando o HTML termina de carregar, configuramos a navegação,
  // a busca, e carregamos os dados da primeira seção (Necessidades).

  document.addEventListener('DOMContentLoaded', function () {
    // Configura os botões de alternância entre seções
    setupNavigation();

    // Configura o campo de busca de habilidades
    setupSearch();

    // Carrega os dados de Necessidades (seção padrão / visível)
    loadNeeds();
  });

})();
