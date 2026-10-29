/* ==========================================================================
   Shalom DS — Lote D: comportamento de dados
   sh-calendar (tres visoes, navegacao por teclado, data ancora preservada)

   Vanilla, sem dependencia, sem build, mesmo padrao dos demais modulos.
   Carregue com `defer`, em qualquer ordem em relacao aos outros:

     <script src="/ds/v2/js/shalom-ds.js"      defer></script>
     <script src="/ds/v2/js/shalom-ds-data.js" defer></script>

   PROGRESSIVO, com a ressalva honesta de sempre. Sem este arquivo:
     · a grade continua desenhada, legivel e com todos os estados corretos;
     · a celula com tabindex="0" escrita no HTML continua focavel, e o anel
       de foco continua aparecendo (e CSS);
     · a tira de sete dias continua sendo sete botoes de verdade, tabulaveis
       e clicaveis;
     · as setas do teclado nao andam pela grade, os botoes de periodo nao
       trocam de periodo sozinhos e o alternador de visao nao troca o
       atributo data-sh-view: quem faz isso passa a ser a aplicacao.
   Nenhuma informacao fica inacessivel por falta deste arquivo. O que se
   perde e a comodidade de navegacao, nunca o conteudo.

   NAO RENDERIZA NADA — MAS CONFERE. Este modulo nao cria dia, nao sabe que
   mes e hoje, nao conhece fuso e nao busca dado. Ele move o foco dentro do
   que ja existe no DOM, mantem a data ancora e avisa a aplicacao, por evento,
   quando o periodo ou a visao precisam mudar. Quem redesenha e a aplicacao.
   O que mudou na 1.3.0 (DEC-039): depois de trocar a visao, e a cada
   refresh(), ele CONFERE o DOM contra a visao pedida e escreve no console
   quando a aplicacao esqueceu de redesenhar — 42 celulas sob o rotulo
   "Semana", grade de pe na visao de "Dia". Continua sem inventar dia; o que
   deixou de existir e o modo de falhar em silencio, que foi o defeito
   relatado pelo dono em 20/08/2026.
   Unica excecao, e ela e deliberada: se o calendario nao trouxer a regiao
   `.sh-calendar__status`, este arquivo cria uma, vazia e invisivel. Uma
   regiao aria-live sem conteudo nao desenha nada e nao ocupa espaco, e sem
   ela a troca de dia e silenciosa para quem usa leitor de tela — que e a
   armadilha A1 da pesquisa de UX de 20/08/2026.

   DELEGACAO. Tudo escuta no `document`. Calendario inserido depois (fetch,
   render de SPA, template clonado) funciona sem re-inicializar nada.

   --------------------------------------------------------------------------
   A DATA E ESTADO, NAO PARAMETRO DE TELA
   --------------------------------------------------------------------------

   `data-sh-anchor` no proprio `.sh-calendar` carrega o dia ancora, em ISO
   (`2026-09-26`). Ele e atualizado a cada selecao de dia e viaja no `detail`
   de TODO evento emitido aqui. Trocar de visao, de periodo ou voltar no
   navegador nunca pode devolver a pessoa para "hoje": quem renderiza le
   `data-sh-anchor`, jamais o relogio. As duas piores falhas de calendario
   documentadas em 2025 e 2026 (a troca de visao do Google Agenda e o botao
   "+" do Outlook Android, que cria evento em hoje mesmo depois de navegar
   para outro mes) sao exatamente este erro.

   --------------------------------------------------------------------------
   CONTRATO — a API e o atributo no HTML
   --------------------------------------------------------------------------

   <section class="sh-calendar" data-sh-view="month" data-sh-anchor="2026-08-19">
     <div class="sh-calendar__filters">…</div>        filtro de origem
     <button class="sh-calendar__prev">…</button>     periodo anterior
     <button class="sh-calendar__today">…</button>    volta para hoje
     <button class="sh-calendar__next">…</button>     proximo periodo
     <div class="sh-segmented sh-calendar__views">    Mes · Semana · Dia
       <input class="sh-segmented__input" type="radio" value="month|week|day">
     <nav class="sh-calendar__daystrip" aria-labelledby="…">   SO na visao de dia
       <p class="sh-calendar__daystriplabel" id="…">Escolher o dia</p>
       <ul class="sh-calendar__daystriplist"><li>
       <button class="sh-calendar__daystripday" data-sh-date="2026-08-17"
               aria-pressed="false">…</button>
     <table class="sh-calendar__grid" role="grid"> …
       <td class="sh-calendar__day" role="gridcell" tabindex="-1"
           data-sh-date="2026-08-19"> …
     <p class="sh-calendar__status" aria-live="polite"></p>

   O `value` de cada radio do alternador E o valor de `data-sh-view`. Sem
   isso o alternador nao tem como dizer para qual visao ir.

   Roving tabindex: exatamente UMA celula do calendario tem tabindex="0" a
   cada momento; as outras ficam em -1. Se o HTML chegar sem nenhuma em 0,
   este arquivo promove a celula da data ancora, ou a selecionada, ou a de
   hoje, ou a primeira navegavel, nessa ordem.

   Celula fora do mes (aria-disabled="true") nao recebe foco pelas setas:
   ela existe so para fechar a semana.

   A tira de sete dias e <nav> com botoes, e NAO role="grid": o dia mostrado
   e `aria-pressed="true"` e hoje e `aria-current="date"`. Sao atributos
   diferentes de proposito — usar aria-current para os dois faz o leitor de
   tela anunciar "data atual" num dia que a pessoa apenas escolheu.

   A tira pertence a VISAO DE DIA, e so a ela (DEC-039). Ela e o seletor de
   dia, com rotulo visivel proprio; o <nav> aponta para esse rotulo com
   aria-labelledby em vez de repetir um aria-label diferente dele. Na visao de
   semana ela nao aparece: acima de 34rem as sete colunas ja sao a semana, e
   abaixo disso a lista vertical escreve o nome do dia em cada linha.

   --------------------------------------------------------------------------
   TECLADO (padrao ARIA APG para grade de datas, as quatro setas testadas)
   --------------------------------------------------------------------------
   Na grade:
     Tab                      entra na grade pela celula focada; sai dela
     Seta esquerda / direita  dia anterior / dia seguinte, atravessando
                              semanas e, no limite, o periodo
     Seta cima / baixo        mesma coluna, semana anterior / seguinte
     Home / End               primeiro / ultimo dia navegavel da semana
     Ctrl + Home / Ctrl + End primeiro / ultimo dia navegavel da grade
     PageUp / PageDown        periodo anterior / seguinte
     Shift + PageUp/PageDown  ano anterior / seguinte
     Enter / Espaco           seleciona o dia e leva o foco ao primeiro
                              horario do painel
     Esc                      devolve o foco ao dia, sem perder a selecao

   Na tira de sete dias:
     Seta esquerda / direita  dia anterior / seguinte da tira
     Seta baixo               entra na lista de horarios
     Home / End               primeiro / ultimo dia da tira
     Enter / Espaco           aciona (comportamento nativo de <button>)

   No painel de horarios:
     Seta cima / baixo        percorre os horarios, inclusive os
                              aria-disabled, que continuam alcancaveis e
                              anunciam o motivo
     Home / End               primeiro / ultimo horario
     Enter                    aciona
     Esc                      volta para o dia na grade

   Em qualquer lugar do calendario, sem modificador e fora de campo de texto:
     M · S · D                troca para Mes, Semana e Dia
     H                        volta para hoje
   Sao as iniciais em portugues. Documente-as num sh-tooltip no botao de
   ajuda: atalho que ninguem sabe que existe nao e atalho.

   O GESTO DE DESLIZAR NAO ESTA AQUI, e a ausencia e decisao. As setas sao a
   alternativa de ponteiro unico exigida pela WCAG 2.5.7, e uma alternativa
   nao pode ser outro gesto de caminho, senao cai na 2.5.1. Seta e
   funcionalidade; gesto e conforto. Se algo tiver que ser cortado, corta o
   gesto.

   --------------------------------------------------------------------------
   EVENTOS (todos borbulham; os tres primeiros sao CANCELAVEIS)
   --------------------------------------------------------------------------
     sh:calendar:day    detail { day, date, anchor }
       Em `day`, `date` e o dia PEDIDO e `anchor` ainda e o anterior: o
       evento e cancelavel, e a ancora so anda depois que ninguem barrou.
     sh:calendar:slot   detail { slot, state, datetime, who, anchor }
     sh:calendar:view   detail { view, previous, anchor }
     sh:calendar:move   detail { direction, unit, anchor }

   `direction` e -1, 0 ou 1; `unit` e 'day', 'week', 'month', 'year' ou
   'today', e sai de data-sh-view — em visao de dia as setas mudam de DIA,
   nao de mes. Trocar o rotulo acessivel do botao junto ("Dia anterior" em
   vez de "Mes anterior") e trabalho de quem monta a pagina, e e falha de
   acessibilidade direta esquecer.

   `anchor` viaja em todos: e o dia que a tela precisa continuar mostrando.

   Cancelar sh:calendar:day impede a marcacao de aria-selected, e cancelar
   sh:calendar:view impede a troca de data-sh-view, para o caso de a
   aplicacao precisar confirmar antes.

   Depois de trocar de periodo OU DE VISAO, a aplicacao redesenha e chama
   `ShalomDSData.refresh()`. Se a troca veio do teclado, este arquivo deixou
   `data-sh-refocus="1"` no calendario e o refresh devolve o foco ao portador
   da data ancora nesta visao — a celula da grade no mes e na semana, o botao
   da tira no dia — sem isso o foco cai no <body>, a pessoa volta ao topo da
   pagina e o atalho seguinte nao chega a lugar nenhum. E o defeito que a
   propria Google documenta no Google Agenda, e ate a 1.2.0 ele acontecia aqui
   em duas situacoes: na troca de visao por M/S/D e na visao de dia, que esta
   funcao nao sabia focar por nao ter grade.

   `refresh(raiz)` aceita o PROPRIO calendario como raiz, e nao so um
   ancestral dele. Parece detalhe e nao e: `querySelectorAll` procura
   descendentes, entao ate a 1.2.0 `refresh(cal)` — que e a chamada mais
   natural depois de redesenhar um calendario — nao encontrava nada e voltava
   em silencio.

   --------------------------------------------------------------------------
   API de programa (opcional)
   --------------------------------------------------------------------------
     ShalomDSData.version                string
     ShalomDSData.focusDay(cal, day)     move o roving tabindex e o foco
     ShalomDSData.selectDay(cal, day)    seleciona (dispara o evento)
     ShalomDSData.focusAnchor(cal)       foca a celula da data ancora
     ShalomDSData.setView(cal, view)     troca a visao (dispara o evento)
     ShalomDSData.anchor(cal[, iso])     le ou grava a data ancora
     ShalomDSData.announce(cal, texto)   escreve na regiao aria-live
     ShalomDSData.refresh([raiz])        re-ancora depois de redesenhar; a
                                         raiz pode ser o proprio calendario
     ShalomDSData.checkView(cal)         confere o DOM contra a visao pedida
   ========================================================================== */

(function (window, document) {
  'use strict';

  var VERSION = '2.0.0';

  var CAL = '.sh-calendar';
  var DAY = '.sh-calendar__day';
  var SLOT = '.sh-calendar__slot';
  var TIRA = '.sh-calendar__daystripday';
  var PAINEL_SLOT = '.sh-calendar__daypanel ' + SLOT;

  /* Visao -> unidade que as setas de periodo movem. Em visao de dia a seta
     muda de DIA: usar 'month' ali e o erro que faz o botao "proximo" pular
     trinta dias sem ninguem pedir. */
  var UNIDADE = { day: 'day', week: 'week', month: 'month' };

  /* Atalho -> visao. Iniciais em portugues; 'S' de semana nao colide com
     nada, entao nao ha razao para copiar D/W/M do ingles. */
  var ATALHO_VISAO = { m: 'month', s: 'week', d: 'day' };

  function closest(el, selector) {
    return el && el.closest ? el.closest(selector) : null;
  }

  function todas(raiz, seletor) {
    return Array.prototype.slice.call(raiz.querySelectorAll(seletor));
  }

  function texto(el) {
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }

  /* Celulas que o teclado percorre: as do calendario, na ordem do DOM, sem
     as de outro mes. aria-disabled e o atributo, nunca uma classe. */
  function diasNavegaveis(cal) {
    return todas(cal, DAY).filter(function (d) {
      return d.getAttribute('aria-disabled') !== 'true';
    });
  }

  function disparar(alvo, nome, detalhe, cancelavel) {
    return alvo.dispatchEvent(new CustomEvent(nome, {
      bubbles: true,
      cancelable: !!cancelavel,
      detail: detalhe || {}
    }));
  }

  /* --------------------------------------------------- data ancora */

  function ancoraDe(cal) {
    return (cal && cal.getAttribute('data-sh-anchor')) || null;
  }

  function fixarAncora(cal, iso) {
    if (cal && iso) cal.setAttribute('data-sh-anchor', iso);
    return ancoraDe(cal);
  }

  function ancora(cal, iso) {
    return iso === undefined ? ancoraDe(cal) : fixarAncora(cal, iso);
  }

  function comAncora(cal, detalhe) {
    detalhe = detalhe || {};
    detalhe.anchor = ancoraDe(cal);
    return detalhe;
  }

  /* ------------------------------------------------------- anuncio */

  /* A regiao existe para que a troca de dia, de periodo e de visao chegue a
     quem usa leitor de tela sem depender de rolagem. Se o HTML nao a
     trouxer, criamos uma vazia: e o unico no que este modulo insere, e ele
     nao desenha nada nem ocupa espaco. */
  function regiaoStatus(cal) {
    var el = cal.querySelector('.sh-calendar__status');
    if (el) return el;
    el = document.createElement('p');
    el.className = 'sh-calendar__status';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    cal.appendChild(el);
    return el;
  }

  /* O atraso e deliberado, e o proprio exemplo do ARIA APG o usa: escrever a
     regiao no mesmo quadro do movimento de foco faz o leitor de tela
     atropelar um anuncio com o outro. */
  function anunciar(cal, msg) {
    if (!cal || !msg) return;
    var el = regiaoStatus(cal);
    el.textContent = '';
    window.setTimeout(function () { el.textContent = msg; }, 120);
  }

  /* ----------------------------------------------------------- foco */

  /* Roving tabindex: uma celula em 0, todas as outras em -1. Preventscroll
     nao e usado de proposito: quando a celula esta fora da area visivel do
     __gridwrap, rolar ate ela E o comportamento certo. O scroll-margin do
     CSS cuida de ela nao parar debaixo de um cabecalho fixo. */
  function focarDia(cal, dia) {
    if (!cal || !dia) return;
    todas(cal, DAY).forEach(function (d) {
      d.setAttribute('tabindex', d === dia ? '0' : '-1');
    });
    dia.focus();
  }

  function celulaDaData(cal, iso) {
    if (!cal || !iso) return null;
    return cal.querySelector(DAY + '[data-sh-date="' + iso + '"]:not([aria-disabled="true"])');
  }

  /* Garante que exista uma celula em tabindex="0", mesmo que o HTML tenha
     chegado sem nenhuma. Ordem: a da data ancora, a selecionada, hoje, a
     primeira navegavel. A ancora vem primeiro justamente porque e ela que
     sobrevive a troca de periodo. */
  function ancorar(cal) {
    var atual = cal.querySelector(DAY + '[tabindex="0"]');
    if (atual) return atual;
    var escolhida =
      celulaDaData(cal, ancoraDe(cal)) ||
      cal.querySelector(DAY + '[aria-selected="true"]') ||
      cal.querySelector(DAY + '[aria-current="date"]') ||
      diasNavegaveis(cal)[0];
    if (escolhida) escolhida.setAttribute('tabindex', '0');
    return escolhida || null;
  }

  /* O foco volta para onde a data ancora MORA nesta visao, e ela nao mora
     sempre no mesmo lugar: no mes e na semana e a celula da grade; no dia nao
     existe grade, e o portador da data e o botao da tira, com o primeiro
     horario do painel como ultima parada. Ate a 1.2.0 esta funcao so conhecia
     a celula, entao trocar para a visao de dia pelo teclado deixava o foco no
     <body> — a pessoa voltava ao topo da pagina e o atalho seguinte nao
     chegava a lugar nenhum. */
  function focarAncora(cal) {
    if (!cal) return null;
    if (visaoDe(cal) === 'day') {
      var iso = ancoraDe(cal);
      var naTira = iso && cal.querySelector(TIRA + '[data-sh-date="' + iso + '"]');
      var alvoDia = (naTira && visivel(naTira) ? naTira : null) || primeiroHorario(cal);
      if (alvoDia && visivel(alvoDia)) { alvoDia.focus(); return alvoDia; }
      return null;
    }
    var alvo = celulaDaData(cal, ancoraDe(cal)) || ancorar(cal);
    if (alvo) focarDia(cal, alvo);
    return alvo;
  }

  /* ------------------------------------------------------- selecao */

  /* A tira e a grade mostram o mesmo dia; quem seleciona num lugar acerta o
     outro. Sem isto a tira fica dizendo um dia e a grade outro, que e a
     forma mais rapida de a pessoa desconfiar do sistema inteiro. */
  function sincronizarTira(cal, iso) {
    todas(cal, TIRA).forEach(function (b) {
      if (!b.hasAttribute('aria-pressed')) return;
      b.setAttribute('aria-pressed', b.getAttribute('data-sh-date') === iso ? 'true' : 'false');
    });
  }

  function sincronizarGrade(cal, iso) {
    todas(cal, DAY).forEach(function (d) {
      if (!d.hasAttribute('aria-selected')) return;
      d.setAttribute('aria-selected', d.getAttribute('data-sh-date') === iso ? 'true' : 'false');
    });
  }

  function selecionarDia(cal, dia) {
    if (!cal || !dia) return false;
    var iso = dia.getAttribute('data-sh-date') || null;
    var ok = disparar(dia, 'sh:calendar:day', comAncora(cal, { day: dia, date: iso }), true);
    if (!ok) return false;
    todas(cal, DAY).forEach(function (d) {
      if (d.hasAttribute('aria-selected')) d.setAttribute('aria-selected', 'false');
    });
    dia.setAttribute('aria-selected', 'true');
    if (iso) { fixarAncora(cal, iso); sincronizarTira(cal, iso); }
    /* O rotulo da celula ja diz tudo o que precisa ser anunciado: "Terca, 19
       de agosto. 3 horarios livres." E o que faz a lista abaixo da dobra ser
       percebida sem rolagem (armadilha A1). */
    anunciar(cal, dia.getAttribute('aria-label') || '');
    return true;
  }

  function selecionarNaTira(cal, botao) {
    if (!cal || !botao) return false;
    var iso = botao.getAttribute('data-sh-date') || null;
    var ok = disparar(botao, 'sh:calendar:day', comAncora(cal, { day: botao, date: iso }), true);
    if (!ok) return false;
    if (iso) { fixarAncora(cal, iso); sincronizarTira(cal, iso); sincronizarGrade(cal, iso); }
    anunciar(cal, botao.getAttribute('aria-label') || texto(botao));
    return true;
  }

  /* O horario indisponivel e <span aria-disabled="true">, e nao
     <button disabled>, justamente para continuar alcancavel e continuar
     dizendo POR QUE esta indisponivel. So que <span> nao e focavel por
     natureza: sem tabindex, .focus() falha em silencio e a seta parece
     travada no horario anterior — foi exatamente o que a medicao mostrou.
     Este e o mesmo roving tabindex da grade, aplicado a lista. */
  function focarHorario(slot) {
    if (!slot) return false;
    if (!slot.hasAttribute('tabindex') && !/^(a|button|input|select|textarea)$/i.test(slot.tagName)) {
      slot.setAttribute('tabindex', '-1');
    }
    slot.focus();
    return document.activeElement === slot;
  }

  /* O primeiro horario alcancavel a partir da celula, e nao "o primeiro do
     painel": na visao de SEMANA o painel nao aparece e os horarios moram
     dentro da propria celula. Ate a 1.2.0 o Enter na semana tentava focar um
     elemento escondido, o foco nao ia a lugar nenhum e a tecla parecia morta
     — falha de 2.1.1 sem nenhuma mensagem. */
  function primeiroHorario(cal) {
    var doPainel = cal.querySelector(PAINEL_SLOT);
    if (doPainel && visivel(doPainel)) return doPainel;
    var celula = cal.querySelector(DAY + '[aria-selected="true"]') ||
                 cal.querySelector(DAY + '[tabindex="0"]');
    var naCelula = celula && celula.querySelector(SLOT);
    if (naCelula && visivel(naCelula)) return naCelula;
    return doPainel;
  }

  /* --------------------------------------------------------- visao */

  function visaoDe(cal) {
    return cal.getAttribute('data-sh-view') || 'month';
  }

  function unidadeDe(cal) {
    return UNIDADE[visaoDe(cal)] || 'month';
  }

  /* A ancora NAO e tocada aqui, e essa e a regra inteira: trocar de visao
     abre o dia que a pessoa estava olhando, nunca hoje. O foco tambem fica
     onde esta (no alternador, que a pessoa acabou de tocar): jogar o foco na
     grade rouba o controle de quem navega por teclado. Quem anuncia a
     mudanca e a regiao aria-live. */
  function trocarVisao(cal, visao) {
    if (!cal || !visao) return false;
    var anterior = visaoDe(cal);
    if (visao === anterior) return false;
    var ok = disparar(cal, 'sh:calendar:view',
      comAncora(cal, { view: visao, previous: anterior }), true);
    if (!ok) return false;
    cal.setAttribute('data-sh-view', visao);
    var radio = cal.querySelector('.sh-calendar__views .sh-segmented__input[value="' + visao + '"]');
    if (radio && !radio.checked) radio.checked = true;
    var rotulo = radio ? texto(radio.parentNode) : visao;
    anunciar(cal, rotulo + '. ' + texto(cal.querySelector('.sh-calendar__title')));
    /* Dois quadros de folga: a aplicacao redesenha depois de ouvir o evento,
       e conferir no mesmo quadro acusaria todo mundo por engano. */
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { conferirContrato(cal); });
    });
    return true;
  }

  /* ------------------------------------------- contrato das visoes */

  /* NAO RENDERIZA, MAS CONFERE. Este modulo continua sem inventar dia: o que
     ele passou a fazer, na 1.3.0, e olhar o DOM depois da troca de visao e
     dizer, em voz alta no console, quando a aplicacao esqueceu de redesenhar.

     A razao esta escrita na DEC-039. Ate a 1.2.0 o contrato "quem renderiza e
     a aplicacao" existia so em prosa, e o modo de falhar era o pior possivel:
     silencioso. Trocar para "Semana" com a grade do mes de pe nao dava erro
     nenhum — dava uma tela errada com um rotulo certo, e foi assim que o
     defeito atravessou a prova do proprio sistema ate a leitura do dono em
     20/08/2026.

     Conta celula VISIVEL, e nao celula no DOM: a rede de seguranca de CSS
     esconde a linha que sobra, e o que a pessoa ve e o que importa. Uma
     celula dentro de um ancestral display:none tem offsetParent nulo e
     nenhuma caixa de layout, que e o teste barato usado aqui.

     Avisa no maximo uma vez por calendario e por visao: um aviso repetido a
     cada clique vira ruido, e ruido no console e igual a silencio. */
  function visivel(el) {
    return !!(el && (el.offsetParent !== null || el.getClientRects().length));
  }

  function avisar(cal, chave, msg) {
    var marca = 'sh-view-avisado';
    var vistos = cal.dataset ? (cal.dataset[marca] || '') : '';
    if (vistos.indexOf('|' + chave + '|') !== -1) return;
    if (cal.dataset) cal.dataset[marca] = vistos + '|' + chave + '|';
    if (window.console && window.console.warn) {
      window.console.warn('sh-calendar: ' + msg +
        ' Quem redesenha o conteudo e a aplicacao; o atributo data-sh-view so' +
        ' diz qual visao foi pedida. Ver DEC-039 e 03-inventario-componentes.md.');
    }
  }

  function conferirContrato(cal) {
    if (!cal || !cal.isConnected || !visivel(cal)) return true;
    var visao = visaoDe(cal);
    var celulas = todas(cal, DAY).filter(visivel);
    var linhas = todas(cal, '.sh-calendar__grid tbody .sh-calendar__week').filter(visivel);
    var tira = cal.querySelector('.sh-calendar__daystrip');
    var ok = true;

    if (visao === 'month') {
      if (celulas.length && celulas.length < 28) {
        ok = false;
        avisar(cal, 'month', 'a visao de mes esta com ' + celulas.length +
          ' celulas visiveis, e um mes tem no minimo 28.');
      }
    } else if (visao === 'week') {
      if (linhas.length > 1) {
        ok = false;
        avisar(cal, 'week', 'a visao de semana esta com ' + linhas.length +
          ' linhas visiveis; semana tem uma.');
      } else if (celulas.length > 7) {
        ok = false;
        avisar(cal, 'week', 'a visao de semana esta com ' + celulas.length +
          ' celulas visiveis; semana tem sete.');
      }
    } else if (visao === 'day') {
      if (celulas.length) {
        ok = false;
        avisar(cal, 'day', 'a visao de dia esta com ' + celulas.length +
          ' celulas de grade visiveis; um dia nao tem grade.');
      }
      if (!tira && !cal.querySelector('.sh-calendar__daypanel')) {
        ok = false;
        avisar(cal, 'day-vazia', 'a visao de dia nao tem nem tira de dias nem' +
          ' painel de horarios: a tela ficou sem conteudo.');
      }
    }
    return ok;
  }

  /* --------------------------------------------------- movimentacao */

  /* Quando o movimento de periodo veio do TECLADO, o foco precisa reaparecer
     na grade nova. A aplicacao redesenha e chama refresh(); a marca abaixo e
     o recado que atravessa o redesenho. */
  function pedirPeriodo(cal, direcao, unidade, doTeclado) {
    if (doTeclado) cal.setAttribute('data-sh-refocus', '1');
    disparar(cal, 'sh:calendar:move', comAncora(cal, { direction: direcao, unit: unidade }));
  }

  /* Anda `passo` posicoes na lista de celulas navegaveis. Atravessar a borda
     da grade e o sinal de que a aplicacao precisa trocar o periodo: este
     arquivo nao inventa o mes seguinte, so avisa. */
  function andar(cal, atual, passo) {
    var lista = diasNavegaveis(cal);
    var i = lista.indexOf(atual);
    if (i < 0) return;
    var alvo = i + passo;
    if (alvo < 0) { pedirPeriodo(cal, -1, unidadeDe(cal), true); return; }
    if (alvo > lista.length - 1) { pedirPeriodo(cal, 1, unidadeDe(cal), true); return; }
    focarDia(cal, lista[alvo]);
  }

  function extremoDaSemana(cal, atual, fim) {
    var linha = closest(atual, '.sh-calendar__week');
    if (!linha) return;
    var lista = todas(linha, DAY).filter(function (d) {
      return d.getAttribute('aria-disabled') !== 'true';
    });
    if (!lista.length) return;
    focarDia(cal, fim ? lista[lista.length - 1] : lista[0]);
  }

  function extremoDaGrade(cal, fim) {
    var lista = diasNavegaveis(cal);
    if (!lista.length) return;
    focarDia(cal, fim ? lista[lista.length - 1] : lista[0]);
  }

  /* ------------------------------------------------------ teclado */

  function campoDeTexto(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'select') return true;
    if (tag !== 'input') return false;
    return !/^(radio|checkbox|button|submit|reset)$/i.test(el.type || 'text');
  }

  document.addEventListener('keydown', function (ev) {
    var cal = closest(ev.target, CAL);
    if (!cal) return;

    var dia = closest(ev.target, DAY);
    if (dia && teclaNaGrade(ev, cal, dia)) return;

    var botaoTira = closest(ev.target, TIRA);
    if (botaoTira && teclaNaTira(ev, cal, botaoTira)) return;

    var slot = closest(ev.target, SLOT);
    if (slot && closest(slot, '.sh-calendar__daypanel') && teclaNoPainel(ev, cal, slot)) return;

    teclaDeAtalho(ev, cal);
  });

  function teclaNaGrade(ev, cal, dia) {
    var k = ev.key;
    var tratou = true;

    if (k === 'ArrowLeft') andar(cal, dia, -1);
    else if (k === 'ArrowRight') andar(cal, dia, 1);
    else if (k === 'ArrowUp') andar(cal, dia, -7);
    else if (k === 'ArrowDown') andar(cal, dia, 7);
    /* Home/End sao da SEMANA focada, nao do mes. O APG diz semana, e muita
       implementacao erra mandando para o dia 1. Ctrl+Home e Ctrl+End sao os
       extremos da grade, que o padrao Grid define e o exemplo de calendario
       esqueceu de dar. */
    else if (k === 'Home') { if (ev.ctrlKey || ev.metaKey) extremoDaGrade(cal, false); else extremoDaSemana(cal, dia, false); }
    else if (k === 'End') { if (ev.ctrlKey || ev.metaKey) extremoDaGrade(cal, true); else extremoDaSemana(cal, dia, true); }
    else if (k === 'PageUp') pedirPeriodo(cal, -1, ev.shiftKey ? 'year' : unidadeDe(cal), true);
    else if (k === 'PageDown') pedirPeriodo(cal, 1, ev.shiftKey ? 'year' : unidadeDe(cal), true);
    else if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
      if (selecionarDia(cal, dia)) focarHorario(primeiroHorario(cal));
    } else tratou = false;

    if (tratou) ev.preventDefault();
    return tratou;
  }

  function teclaNaTira(ev, cal, botao) {
    var lista = todas(cal, TIRA);
    var i = lista.indexOf(botao);
    var k = ev.key;
    var tratou = true;

    if (k === 'ArrowLeft' && i > 0) lista[i - 1].focus();
    else if (k === 'ArrowRight' && i > -1 && i < lista.length - 1) lista[i + 1].focus();
    else if (k === 'ArrowLeft') pedirPeriodo(cal, -1, unidadeDe(cal), true);
    else if (k === 'ArrowRight') pedirPeriodo(cal, 1, unidadeDe(cal), true);
    else if (k === 'Home' && lista.length) lista[0].focus();
    else if (k === 'End' && lista.length) lista[lista.length - 1].focus();
    /* Seta para baixo entra na lista de horarios: na visao de dia a tira e a
       lista sao a tela inteira, e descer e o movimento natural. */
    else if (k === 'ArrowDown') { if (!focarHorario(primeiroHorario(cal))) tratou = false; }
    else tratou = false;

    if (tratou) ev.preventDefault();
    return tratou;
  }

  function teclaNoPainel(ev, cal, slot) {
    var lista = todas(cal, PAINEL_SLOT);
    var i = lista.indexOf(slot);
    var k = ev.key;
    var tratou = true;

    if (k === 'ArrowDown' && i > -1 && i < lista.length - 1) focarHorario(lista[i + 1]);
    else if (k === 'ArrowUp' && i > 0) focarHorario(lista[i - 1]);
    else if (k === 'Home' && lista.length) focarHorario(lista[0]);
    else if (k === 'End' && lista.length) focarHorario(lista[lista.length - 1]);
    /* Esc nao fecha nada aqui: este calendario e embutido, nao um dialogo.
       O papel dele e devolver o foco ao dia SEM perder a selecao — desvio
       consciente do exemplo do APG, que e modal. */
    else if (k === 'Escape') {
      /* Volta para o dia, sem perder a selecao. Na visao de DIA nao ha grade
         para voltar: ali o destino e o botao da tira, que e o equivalente
         funcional. Sem esta segunda saida, Esc na visao de dia nao faz nada e
         a pessoa fica presa na lista. */
      var volta = cal.querySelector(DAY + '[aria-selected="true"]') || ancorar(cal);
      if (volta) focarDia(cal, volta);
      else {
        var naTira = cal.querySelector(TIRA + '[aria-pressed="true"]') || cal.querySelector(TIRA);
        if (naTira) naTira.focus();
        else tratou = false;
      }
    } else tratou = false;

    if (tratou) ev.preventDefault();
    return tratou;
  }

  function teclaDeAtalho(ev, cal) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || campoDeTexto(ev.target)) return false;
    var k = (ev.key || '').toLowerCase();
    if (ATALHO_VISAO[k]) {
      /* Pelo TECLADO a troca de visao precisa de refocus, e pelo clique nao:
         quem clicou no alternador tem o foco no proprio radio, que sobrevive
         ao redesenho; quem apertou M, S ou D estava dentro do conteudo que
         acabou de ser trocado, e sem esta marca o foco cai no <body>. */
      cal.setAttribute('data-sh-refocus', '1');
      if (trocarVisao(cal, ATALHO_VISAO[k])) { ev.preventDefault(); return true; }
      cal.removeAttribute('data-sh-refocus');
      return true;
    }
    if (k === 'h') {
      pedirPeriodo(cal, 0, 'today', true);
      ev.preventDefault();
      return true;
    }
    return false;
  }

  /* -------------------------------------------------------- clique */

  document.addEventListener('click', function (ev) {
    var botao = closest(ev.target, '.sh-calendar__prev, .sh-calendar__next, .sh-calendar__today');
    if (botao) {
      var calBotao = closest(botao, CAL);
      if (!calBotao) return;
      if (botao.classList.contains('sh-calendar__today')) {
        pedirPeriodo(calBotao, 0, 'today', false);
      } else {
        pedirPeriodo(calBotao, botao.classList.contains('sh-calendar__prev') ? -1 : 1,
          unidadeDe(calBotao), false);
      }
      return;
    }

    var naTira = closest(ev.target, TIRA);
    if (naTira) {
      var calTira = closest(naTira, CAL);
      if (!calTira || naTira.getAttribute('aria-disabled') === 'true') return;
      selecionarNaTira(calTira, naTira);
      return;
    }

    var dia = closest(ev.target, DAY);
    if (dia) {
      var cal = closest(dia, CAL);
      if (!cal || dia.getAttribute('aria-disabled') === 'true') return;
      focarDia(cal, dia);
      selecionarDia(cal, dia);
      return;
    }

    var slot = closest(ev.target, SLOT);
    if (slot) {
      if (slot.getAttribute('aria-disabled') === 'true') return;
      var calSlot = closest(slot, CAL);
      var hora = slot.querySelector('.sh-calendar__slottime');
      disparar(slot, 'sh:calendar:slot', comAncora(calSlot, {
        slot: slot,
        state: slot.getAttribute('data-sh-slot-state') || null,
        datetime: hora ? hora.getAttribute('datetime') : null,
        who: slot.getAttribute('data-sh-who') || null
      }), true);
    }
  });

  /* ------------------------------------------------ troca de visao */

  /* O alternador e um radiogroup de radios nativos: setas, Home/End e o foco
     itinerante sao do navegador, e nao ha uma linha de JS para isso. O que
     falta e traduzir a escolha em data-sh-view, e e so isso que esta aqui. */
  document.addEventListener('change', function (ev) {
    var input = closest(ev.target, '.sh-calendar__views .sh-segmented__input');
    if (!input || !input.checked) return;
    var cal = closest(input, CAL);
    if (cal) trocarVisao(cal, input.value);
  });

  /* ------------------------------------------------------ ancoragem */

  /* Um unico ponto tabulavel dentro da grade. Se o HTML nao trouxe nenhuma
     celula em tabindex="0", ancora na primeira vez que o calendario aparece
     ou recebe foco. focusin (nao focus) porque borbulha. */
  document.addEventListener('focusin', function (ev) {
    var cal = closest(ev.target, CAL);
    if (cal) ancorar(cal);
  });

  /* ARMADILHA que custou uma rodada de teste na 1.3.0, e que a assinatura da
     funcao convida: querySelectorAll procura DESCENDENTES, entao
     `refresh(cal)` com o proprio calendario como raiz nao encontrava
     calendario nenhum e devolvia em silencio — o foco nao voltava depois do
     redesenho e o atalho de teclado seguinte caia no <body>. Chamar com o
     elemento redesenhado e o uso mais natural que existe; quem erra e a
     funcao, nao quem chama. */
  function calendariosEm(raiz) {
    var base = raiz || document;
    var lista = todas(base, CAL);
    if (base.nodeType === 1 && base.matches && base.matches(CAL) && lista.indexOf(base) === -1) {
      lista.unshift(base);
    }
    return lista;
  }

  function ancorarTodos(raiz) {
    calendariosEm(raiz).forEach(function (cal) {
      ancorar(cal);
      var iso = ancoraDe(cal);
      if (iso) sincronizarTira(cal, iso);
      /* O foco perdido na troca de periodo e a falha numero 5 da lista de
         erros comuns do APG, e e o defeito que a propria Google documenta:
         `n` e `p` rolam o periodo e o foco fica para tras. */
      if (cal.getAttribute('data-sh-refocus') === '1') {
        cal.removeAttribute('data-sh-refocus');
        focarAncora(cal);
      }
      conferirContrato(cal);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { ancorarTodos(document); });
  } else {
    ancorarTodos(document);
  }

  window.ShalomDSData = {
    version: VERSION,
    focusDay: focarDia,
    selectDay: selecionarDia,
    focusAnchor: focarAncora,
    setView: trocarVisao,
    anchor: ancora,
    announce: anunciar,
    refresh: ancorarTodos,
    checkView: conferirContrato
  };
})(window, document);
