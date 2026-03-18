// ================================
// Taguatinga — Scripts
// ================================

// Copiar texto para area de transferencia
function copyText(text) {
  var textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);

  var toastElement = document.querySelector('.toast');
  var toast = new bootstrap.Toast(toastElement);
  toastElement.querySelector('.toast-body').textContent = 'PIX copiado!';
  toast.show();
}

// Botoes de copiar PIX
document.querySelectorAll('.copy-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var targetId = this.getAttribute('data-target');
    var code = document.getElementById(targetId);
    if (code) { copyText(code.textContent.trim()); }
  });
});

// Carregar avisos do Blogger
async function carregarAvisos() {
  try {
    var feedUrl = 'https://shalomtaguatinga.blogspot.com/feeds/posts/default?alt=json';
    var proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(feedUrl);
    var res = await fetch(proxy);
    var data = await res.json();
    var entries = (data.feed && data.feed.entry) ? data.feed.entry : [];
    var list = document.getElementById('avisos-list');
    list.innerHTML = '';
    (entries || []).slice(0, 2).forEach(function (item) {
      var linkObj = (item.link || []).find(function (l) { return l.rel === 'alternate'; });
      var href = linkObj ? linkObj.href : '#';
      var title = item.title && item.title.$t ? item.title.$t : 'Atualização';
      var li = document.createElement('li');
      li.innerHTML = '<a href="' + href + '" target="_blank" rel="noopener">' + title + '</a>';
      list.appendChild(li);
    });
    if (list.children.length === 0) {
      list.innerHTML = '<li class="small">Nenhum aviso encontrado.</li>';
    }
  } catch (e) {
    var list = document.getElementById('avisos-list');
    if (list) { list.innerHTML = '<li class="small">Não foi possível carregar os avisos agora.</li>'; }
  }
}

// Carregar noticias do Comshalom
async function carregarNoticiasComShalom() {
  try {
    var feedUrl = 'https://comshalom.org/feed';
    var proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(feedUrl);
    var res = await fetch(proxy);
    var text = await res.text();
    var parser = new DOMParser();
    var xml = parser.parseFromString(text, 'application/xml');
    var items = Array.from(xml.querySelectorAll('item')).slice(0, 2);
    var list = document.getElementById('comshalom-list');
    list.innerHTML = '';
    items.forEach(function (item) {
      var title = item.querySelector('title') ? item.querySelector('title').textContent : 'Notícia';
      var link = item.querySelector('link') ? item.querySelector('link').textContent : '#';
      var li = document.createElement('li');
      li.innerHTML = '<a href="' + link + '" target="_blank" rel="noopener">' + title + '</a>';
      list.appendChild(li);
    });
    if (list.children.length === 0) {
      list.innerHTML = '<li class="small">Nenhuma notícia encontrada.</li>';
    }
  } catch (e) {
    var list = document.getElementById('comshalom-list');
    if (list) { list.innerHTML = '<li class="small">Não foi possível carregar as notícias agora.</li>'; }
  }
}

// Hero image loaded state
var heroImg = document.querySelector('.hero-img');
if (heroImg) {
  heroImg.addEventListener('load', function () {
    this.classList.add('loaded');
  });
  if (heroImg.complete) {
    heroImg.classList.add('loaded');
  }
}

// Inicializar
carregarAvisos();
carregarNoticiasComShalom();
