// ============================================
// PROVIDÊNCIA - Configuração Centralizada
// Comunidade Católica Shalom Brasília
// ============================================
//
// Este arquivo contém:
// - Constantes globais (URLs dos CSVs, número do WhatsApp)
// - Funções utilitárias compartilhadas entre as páginas
//
// IMPORTANTE: Se o número de WhatsApp da Providência mudar,
// basta alterar aqui em PROVIDENCIA_CONFIG.whatsappProvidencia.
// Lembre-se de também atualizar o número no rodapé de cada HTML.
// ============================================

var PROVIDENCIA_CONFIG = {

  // ============================================
  // NÚMERO DE WHATSAPP DO SETOR DA PROVIDÊNCIA
  // Se precisar trocar, altere APENAS aqui (e no footer dos HTMLs).
  // ============================================
  whatsappProvidencia: '5561982644432',

  // URL do CSV de Necessidades (colunas: Local, Item_Necessidade)
  csvNecessidades: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-pbvSfuIvxl3WarKBKMsOBHOO3zmpup7EBInURPaDNRjIhkLSGduNTJxdDyISbRFq3xawLaa5uJC0/pub?gid=0&single=true&output=csv',

  // URL do CSV de Habilidades (colunas: Nome_do_Irmao, Habilidades, Telefone_WhatsApp)
  csvHabilidades: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-pbvSfuIvxl3WarKBKMsOBHOO3zmpup7EBInURPaDNRjIhkLSGduNTJxdDyISbRFq3xawLaa5uJC0/pub?gid=862267857&single=true&output=csv',

  // URL do CSV de Comunhão de Bens (colunas: mes, percentual)
  csvComunhao: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-pbvSfuIvxl3WarKBKMsOBHOO3zmpup7EBInURPaDNRjIhkLSGduNTJxdDyISbRFq3xawLaa5uJC0/pub?gid=812880566&single=true&output=csv',

  // Tempo de espera (ms) antes de aplicar o filtro de busca
  debounceDelay: 300
};

// ============================================
// FUNÇÕES UTILITÁRIAS COMPARTILHADAS
// ============================================

/**
 * Faz o download de um CSV do Google Sheets e retorna os dados como objetos.
 * Usa o PapaParse (carregado via CDN) para interpretar o arquivo.
 *
 * @param {string} url - URL do CSV publicado
 * @param {function} onSuccess - Callback com array de objetos
 * @param {function} onError - Callback em caso de erro
 */
function fetchCSV(url, onSuccess, onError) {
  Papa.parse(url, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
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

/**
 * Monta a URL de contato do WhatsApp com mensagem pré-pronta.
 * @param {string} phone - Número (apenas dígitos, com DDI)
 * @param {string} message - Mensagem pré-preenchida
 * @returns {string} URL completa
 */
function buildWhatsAppUrl(phone, message) {
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
}

/**
 * Retorna o ícone SVG do WhatsApp como string HTML.
 */
function whatsappIcon() {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">' +
    '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>' +
    '<path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.555 4.126 1.528 5.864L.06 23.884l6.171-1.617A11.94 11.94 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82c-1.978 0-3.81-.577-5.37-1.572l-.385-.23-3.992 1.047 1.066-3.893-.252-.401A9.78 9.78 0 0 1 2.18 12c0-5.414 4.406-9.82 9.82-9.82 5.414 0 9.82 4.406 9.82 9.82 0 5.414-4.406 9.82-9.82 9.82z"/>' +
    '</svg>';
}

/**
 * Escapa caracteres HTML para evitar injeção de código.
 * @param {string} str - Texto a escapar
 * @returns {string} Texto seguro para HTML
 */
function escapeHTML(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * Esconde o preloader (tela de carregamento inicial).
 */
function hidePreloader() {
  var preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.classList.add('hidden');
    setTimeout(function () {
      preloader.style.display = 'none';
    }, 500);
  }
}
