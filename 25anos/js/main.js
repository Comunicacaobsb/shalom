/* 25 Anos Shalom Brasília
   Menu em <dialog> (o navegador cuida de foco, Esc e devolução do foco) e a agenda do
   jubileu, lida da planilha publicada no Google. */

/* ---------- Menu ---------- */
(function () {
  var menu = document.getElementById('menu');
  document.getElementById('abrir-menu').addEventListener('click', function () { menu.showModal(); });
  document.getElementById('fechar-menu').addEventListener('click', function () { menu.close(); });
  // clicar no véu (fora do painel) ou num link fecha; o link segue para a seção.
  // O painel ocupa a altura toda, então "fora" se mede pela caixa, não pelo alvo.
  menu.addEventListener('click', function (e) {
    var r = menu.getBoundingClientRect();
    var fora = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (fora || e.target.closest('a')) menu.close();
  });
})();

/* ---------- Agenda do jubileu ---------- */
(function () {
  // Eventos fixos no site (antes vinham de uma planilha publicada; desligada em 07/11/2026).
  // Para mudar a agenda, edite as linhas abaixo: Evento,Descricao,Dias,Mes,Tag,Link
  var EVENTOS_CSV = [
    'Evento,Descricao,Dias,Mes,Tag,Link',
    'Kyrios Festival,Celebração dos 25 anos,25,ABR,Evento principal,https://comshalom.org/kyriosfestival/',
    'Congresso Mariano,,25-26,MAI,,',
    "Acamp's 25 anos,,22-26,JUL,,",
    'Jornada Missionária,Samambaia,12-18,AGO,,',
    'Dia Mundial dos Pobres,,15-16,NOV,,',
    'Tríduo de Cristo Rei,Missa da Festa,18-20,NOV,,',
    'Concerto 25 anos,,12,DEZ,Encerramento,'
  ].join('\n');
  // A agenda traz dia e mês, sem o ano: todos os eventos são do ano do jubileu.
  var ANO = 2026;
  var MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  var agenda = document.getElementById('agenda');
  var lista = document.getElementById('eventos-lista');
  var carregando = document.getElementById('eventos-carregando');
  var erro = document.getElementById('eventos-erro');

  // CSV do Google: campos com vírgula vêm entre aspas, aspas internas dobradas
  function lerCSV(texto) {
    var linhas = [], campo = '', linha = [], aspas = false;
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (aspas) {
        if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
        else if (c === '"') aspas = false;
        else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === ',') { linha.push(campo); campo = ''; }
      else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
      else if (c !== '\r') campo += c;
    }
    linha.push(campo); linhas.push(linha);
    var cab = linhas.shift().map(function (h) { return h.trim(); });
    return linhas.map(function (l) {
      var o = {};
      cab.forEach(function (h, j) { o[h] = (l[j] || '').trim(); });
      return o;
    }).filter(function (o) { return o.Evento; });
  }

  // último dia do evento ("22-26" termina no 26); sem data legível, conta como futuro
  function fim(ev) {
    var m = MESES.indexOf(ev.Mes.toUpperCase());
    var d = parseInt(ev.Dias.split('-').pop(), 10);
    return m < 0 || !d ? Infinity : new Date(ANO, m, d, 23, 59).getTime();
  }

  function el(tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto) n.textContent = texto;
    return n;
  }

  function seta() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'evento__seta');
    svg.setAttribute('data-sh-nudge', 'up');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'M7 17 17 7M7 7h10v10');
    svg.appendChild(p);
    return svg;
  }

  function mostrar(eventos) {
    var agora = Date.now();
    var proximoMarcado = false;

    eventos.forEach(function (ev) {
      var passou = fim(ev) < agora;
      var proximo = !passou && !proximoMarcado;
      if (proximo) proximoMarcado = true;

      var li = el('li', 'evento' + (passou ? ' evento--passou' : '') + (proximo ? ' evento--proximo' : ''));
      var link = /^https?:\/\//.test(ev.Link) ? ev.Link : '';
      var corpo = link ? el('a', 'evento__corpo') : el('div', 'evento__corpo');
      if (link) { corpo.href = link; corpo.target = '_blank'; corpo.rel = 'noopener'; }

      var data = el('span', 'evento__data');
      data.append(el('span', 'evento__dia', ev.Dias), el('span', 'evento__mes', ev.Mes));

      var info = el('span', 'evento__info');
      var selos = el('span', 'evento__selos');
      if (ev.Tag) selos.append(el('span', 'selo selo--marca', ev.Tag));
      if (proximo) selos.append(el('span', 'selo selo--proximo', 'Próximo'));
      if (passou) selos.append(el('span', 'selo', 'Realizado'));
      if (selos.childNodes.length) info.append(selos);
      info.append(el('span', 'evento__nome', ev.Evento));
      if (ev.Descricao) info.append(el('span', 'evento__desc', ev.Descricao));
      if (link) info.append(el('span', 'oculto', ' (abre em nova aba)'));

      corpo.append(data, info);
      if (link) corpo.append(seta());
      li.append(corpo);
      lista.append(li);
    });

    carregando.hidden = true;
    lista.hidden = false;
    agenda.removeAttribute('aria-busy');
  }

  function falhou() {
    carregando.hidden = true;
    erro.hidden = false;
    agenda.removeAttribute('aria-busy');
  }

  var eventos = lerCSV(EVENTOS_CSV);
  if (eventos.length) mostrar(eventos); else falhou();
})();
