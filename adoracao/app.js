/* Adoração perpétua · Capela Kyrios
   Mostra as horas da semana, vindas do banco sem login e sem nomes.
   Cada hora é um link que abre o WhatsApp com a mensagem pronta. */

// WhatsApp da responsável (com código do país, sem +)
const WHATSAPP_NUMERO = '5561982644432';

// Mensagem pré-preenchida (use {dia} e {horario} como variáveis)
const WHATSAPP_MSG = 'Olá! Gostaria de me comprometer com a Adoração Perpétua no horário de {horario} {dia}. Como faço para me inscrever?';

// Mensagem do link geral, quando os horários não carregam
const WHATSAPP_GERAL = 'Olá! Gostaria de me comprometer com a Adoração Perpétua. Como faço para me inscrever?';

// Segunda a domingo; ds é o dia_semana do banco (0 domingo a 6 sábado)
const DIAS = [
  { ds: 1, nome: 'Segunda', em: 'na' },
  { ds: 2, nome: 'Terça', em: 'na' },
  { ds: 3, nome: 'Quarta', em: 'na' },
  { ds: 4, nome: 'Quinta', em: 'na' },
  { ds: 5, nome: 'Sexta', em: 'na' },
  { ds: 6, nome: 'Sábado', em: 'no' },
  { ds: 0, nome: 'Domingo', em: 'no' },
];
const ESPECIAL = { missa: 'Missa', recolhido: 'Santíssimo recolhido' };
const INTRO_TODOS = 'Escolha o dia e a hora. Se a hora já tem adorador, você pode somar: mais de uma pessoa na mesma hora é bom.';
const SETA = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';

const $ = (s) => document.querySelector(s);
const faixa = (h) => `${h}h às ${h + 1}h`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const marcado = (nome) => $(`input[name="${nome}"]:checked`).value;
let introVagos = '';

function whatsappURL(dia, horario) {
  const msg = WHATSAPP_MSG
    .replace('{dia}', dia)
    .replace('{horario}', horario);
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`;
}

/* ---------- conexão: a mesma da Livraria, com o banco local só em localhost ---------- */
let sb = null;
function cliente() {
  if (sb) return sb;
  let cfg = window.SHALOM_SUPABASE || {};
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    try {
      const dev = JSON.parse(localStorage.getItem('sh82_supabase_dev'));
      if (dev && dev.url && dev.anonKey) cfg = dev;
    } catch (e) { /* sem armazenamento: segue com a configuração pública */ }
  }
  if (!cfg.url || !cfg.anonKey || !window.supabase || !window.supabase.createClient) return null;
  sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return sb;
}
function rpc(nome) {
  const c = cliente();
  if (!c) return Promise.resolve({ data: null, error: { message: 'SEM_CONEXAO' } });
  return c.rpc(nome).then((r) => r, (e) => ({ data: null, error: { message: String((e && e.message) || e) } }));
}

/* ---------- desenho ---------- */
function hora(D, x, todos) {
  const texto = `<span class="hora__t"><span class="oculto">${D.nome}, das </span>${faixa(x.hora)}</span>`;
  if (x.tipo !== 'normal') return `<div class="hora hora--esp">${texto}<span class="hora__e">${ESPECIAL[x.tipo]}</span></div>`;
  const url = whatsappURL(`${D.em} ${D.nome.toLowerCase()}`, faixa(x.hora));
  const rotulo = todos ? `<span class="hora__e">${x.tem_adorador ? 'Com adorador' : 'Vago'}</span>` : '';
  return `<a class="hora" data-estado="${x.tem_adorador ? 'com' : 'vago'}" href="${url}" target="_blank" rel="noopener">${texto}${rotulo}</a>`;
}
const listaHoras = (D, linhas, todos) => `<ul class="horas${todos ? ' horas--todas' : ''}" aria-label="${D.nome}">${linhas.map((x) => `<li>${hora(D, x, todos)}</li>`).join('')}</ul>`;

function desenhar(horas) {
  const semana = DIAS.map((D) => {
    const linhas = horas.filter((x) => x.dia_semana === D.ds);
    return { D, linhas, vagas: linhas.filter((x) => x.tipo === 'normal' && !x.tem_adorador), especiais: linhas.filter((x) => x.tipo !== 'normal') };
  });
  const total = semana.reduce((s, d) => s + d.vagas.length, 0);
  introVagos = total
    ? `Ainda faltam adoradores em ${plural(total, 'hora', 'horas')} da semana. Escolha a que você pode assumir.`
    : 'Todos os horários da semana têm adorador. Você pode somar a qualquer um.';

  $('#vagos').innerHTML = semana.map(({ D, vagas, especiais }) => `<li class="dia">
    <h3 class="titulo dia__nome">${D.nome}</h3>
    <div class="dia__corpo">
      ${vagas.length ? listaHoras(D, vagas, false) : `<p class="cheio">Todos os horários com adorador. Você pode somar a qualquer um.</p>
      <button type="button" class="bt" data-ver-dia="${D.ds}">Ver os horários de ${D.nome.toLowerCase()}${SETA}</button>`}
      ${especiais.length ? `<ul class="esp">${especiais.map((x) => `<li>${ESPECIAL[x.tipo]} às ${x.hora}h</li>`).join('')}</ul>` : ''}
    </div>
  </li>`).join('');

  $('#dias').innerHTML = semana.map(({ D, vagas }, i) => `<label class="op"><input type="radio" name="dia" value="${D.ds}"${i ? '' : ' checked'}><span>${D.nome} <small>${vagas.length ? plural(vagas.length, 'vago', 'vagos') : 'sem vaga'}</small></span></label>`).join('');

  $('#paineis').innerHTML = semana.map(({ D, linhas, vagas }) => `<div class="painel" data-dia="${D.ds}">
    <h3 class="titulo dia__nome" id="dia-${D.ds}" tabindex="-1">${D.nome}</h3>
    <p class="painel__resumo">${vagas.length ? `${plural(vagas.length, 'horário vago', 'horários vagos')}. As horas com adorador também podem ser escolhidas.` : 'Todos os horários com adorador. Você pode somar a qualquer um.'}</p>
    ${listaHoras(D, linhas, true)}
  </div>`).join('');

  aplicar();
}

// Os rádios guardam a escolha; aqui só se mostra o que eles dizem.
function aplicar() {
  const todos = marcado('modo') === 'todos';
  const dia = marcado('dia');
  $('#vagos').hidden = todos;
  $('#todos').hidden = !todos;
  $('#h-horarios').textContent = todos ? 'Todos os horários da semana' : 'Horários vagos desta semana';
  $('#intro').textContent = todos ? INTRO_TODOS : introVagos;
  document.querySelectorAll('.painel').forEach((p) => { p.hidden = p.dataset.dia !== dia; });
}

function estado(e) {
  $('#carregando').hidden = e !== 'carregando';
  $('#erro').hidden = e !== 'erro';
  $('#conteudo').hidden = e !== 'ok';
}

// ponytail: sem tempo-limite próprio; a falha aparece quando o navegador desiste da conexão.
async function carregar(focar) {
  estado('carregando');
  const { data, error } = await rpc('capela_adoracao_vagas');
  const ok = !error && data && data.horas;
  if (ok) desenhar(data.horas);
  estado(ok ? 'ok' : 'erro');
  if (focar) $(ok ? '#h-horarios' : '#tentar').focus();
}

/* ---------- ações ---------- */
$('#conteudo').addEventListener('change', aplicar);

// Dia sem vaga: "Ver os horários de quinta" leva direto àquele dia.
$('#vagos').addEventListener('click', (ev) => {
  const bt = ev.target.closest('[data-ver-dia]');
  if (!bt) return;
  const dia = bt.dataset.verDia;
  $('input[name="modo"][value="todos"]').checked = true;
  $(`input[name="dia"][value="${dia}"]`).checked = true;
  aplicar();
  const titulo = $(`#dia-${dia}`);
  titulo.focus({ preventScroll: true });
  titulo.scrollIntoView({ block: 'start' });
});

$('#tentar').addEventListener('click', () => carregar(true));
$('#wa-geral').href = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(WHATSAPP_GERAL)}`;

carregar(false);
