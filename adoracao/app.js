/* ========================================
   CONFIGURAÇÕES — edite aqui
   ======================================== */

// Meta de adoradores por horário (1 = mínimo, 2 = ideal com backup)
const META_ADORADORES = 2;

// WhatsApp da responsável (com código do país, sem +)
const WHATSAPP_NUMERO = '5561982644432';

// Mensagem pré-preenchida (use {dia} e {horario} como variáveis)
const WHATSAPP_MSG = 'Olá! Gostaria de me comprometer com a Adoração Perpétua no horário de {horario} na {dia}. Como faço para me inscrever?';

// URL do Google Sheets publicado como CSV (aba "adoracao")
// Para publicar: Google Sheets > Arquivo > Compartilhar > Publicar na web > aba "adoracao" > CSV
const SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-pbvSfuIvxl3WarKBKMsOBHOO3zmpup7EBInURPaDNRjIhkLSGduNTJxdDyISbRFq3xawLaa5uJC0/pub?gid=465250531&single=true&output=csv';

/* ========================================
   CÓDIGO — não edite abaixo (a menos que saiba o que faz)
   ======================================== */

const DAYS_ORDER = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
const DAYS_SHORT = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

// WhatsApp icon SVG
const WHATSAPP_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += line[i];
      }
    }
    values.push(current.trim());

    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

function calcSlotPct(slot) {
  const weeks = [
    parseInt(slot.sem1) || 0,
    parseInt(slot.sem2) || 0,
    parseInt(slot.sem3) || 0,
    parseInt(slot.sem4) || 0,
    parseInt(slot.sem5) || 0
  ];
  const total = weeks.reduce((sum, w) => sum + Math.min(w, META_ADORADORES), 0);
  return Math.round((total / (META_ADORADORES * 5)) * 100);
}

function calcSlotAvgPeople(slot) {
  const weeks = [
    parseInt(slot.sem1) || 0,
    parseInt(slot.sem2) || 0,
    parseInt(slot.sem3) || 0,
    parseInt(slot.sem4) || 0,
    parseInt(slot.sem5) || 0
  ];
  const filled = weeks.filter(w => w > 0);
  if (filled.length === 0) return 0;
  return Math.round((filled.reduce((a, b) => a + b, 0) / 5) * 10) / 10;
}

function calcSlotTotalPeople(slot) {
  return [
    parseInt(slot.sem1) || 0,
    parseInt(slot.sem2) || 0,
    parseInt(slot.sem3) || 0,
    parseInt(slot.sem4) || 0,
    parseInt(slot.sem5) || 0
  ].reduce((a, b) => a + b, 0);
}

function weeksWithPeople(slot) {
  return [
    parseInt(slot.sem1) || 0,
    parseInt(slot.sem2) || 0,
    parseInt(slot.sem3) || 0,
    parseInt(slot.sem4) || 0,
    parseInt(slot.sem5) || 0
  ].filter(w => w > 0).length;
}

function fillClass(pct) {
  if (pct === 0) return 'fill-0';
  if (pct <= 25) return 'fill-25';
  if (pct <= 50) return 'fill-50';
  if (pct <= 75) return 'fill-75';
  return 'fill-100';
}

function textClass(pct) {
  if (pct === 0) return 'text-0';
  if (pct <= 25) return 'text-25';
  if (pct <= 50) return 'text-50';
  if (pct <= 75) return 'text-75';
  return 'text-100';
}

function lvClass(pct) {
  if (pct === 0) return 'lv-0';
  if (pct <= 25) return 'lv-25';
  if (pct <= 50) return 'lv-50';
  if (pct <= 75) return 'lv-75';
  return 'lv-100';
}

function whatsappURL(dia, horario) {
  const msg = WHATSAPP_MSG
    .replace('{dia}', dia)
    .replace('{horario}', horario);
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(msg)}`;
}

function formatHour(h) {
  return h.replace(':00', 'h');
}

function getWeeks(slot) {
  return [
    parseInt(slot.sem1) || 0,
    parseInt(slot.sem2) || 0,
    parseInt(slot.sem3) || 0,
    parseInt(slot.sem4) || 0,
    parseInt(slot.sem5) || 0
  ];
}

// Ícone pessoa (SVG inline)
const PERSON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>';

function weekDotsHTML(slot, size) {
  const weeks = getWeeks(slot);
  const labels = ['S1', 'S2', 'S3', 'S4', 'S5'];
  const labelsLong = ['1ª sem', '2ª sem', '3ª sem', '4ª sem', '5ª sem'];
  const isSmall = size === 'small';

  if (isSmall) {
    // Desktop: compact chips with label + person icon
    return weeks.map((count, i) => {
      let cls = 'empty';
      if (count >= META_ADORADORES) cls = 'full';
      else if (count > 0) cls = 'partial';
      return `<span class="wd ${cls}" title="${labelsLong[i]}: ${count} pessoa(s)"><span class="wd-label">${labels[i]}</span>${count}</span>`;
    }).join('');
  }

  // Mobile: labeled chips "S1 👤1" style
  return weeks.map((count, i) => {
    let cls = 'empty';
    if (count >= META_ADORADORES) cls = 'full';
    else if (count > 0) cls = 'partial';
    const personLabel = count === 0 ? 'vazio' : count;
    return `<span class="week-chip ${cls}" title="${labelsLong[i]}: ${count} pessoa(s)">
      <span class="wc-label">${labels[i]}</span>
      <span class="wc-icon">${PERSON_SVG}</span>${personLabel}
    </span>`;
  }).join('');
}

function render(data) {
  // Group by day
  const byDay = {};
  DAYS_ORDER.forEach(d => { byDay[d] = []; });
  data.forEach(row => {
    const dia = (row.dia || '').toUpperCase().trim();
    if (byDay[dia]) byDay[dia].push(row);
  });

  // Calc day stats
  const dayStats = {};
  let totalSlots = 0;
  let totalFilled = 0;
  DAYS_ORDER.forEach(d => {
    const normalSlots = byDay[d].filter(s => (s.tipo || 'normal') === 'normal');
    const pcts = normalSlots.map(s => calcSlotPct(s));
    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    dayStats[d] = { pct: avg, normalCount: normalSlots.length, totalSlots: byDay[d].length };
    totalSlots += normalSlots.length * 5;
    normalSlots.forEach(s => {
      totalFilled += [
        parseInt(s.sem1) || 0,
        parseInt(s.sem2) || 0,
        parseInt(s.sem3) || 0,
        parseInt(s.sem4) || 0,
        parseInt(s.sem5) || 0
      ].reduce((a, b) => a + Math.min(b, META_ADORADORES), 0);
    });
  });
  const overallPct = totalSlots > 0 ? Math.round((totalFilled / (totalSlots * META_ADORADORES)) * 100) : 0;

  // Count slots needing help
  let slotsNeedHelp = 0;
  DAYS_ORDER.forEach(d => {
    byDay[d].forEach(s => {
      if ((s.tipo || 'normal') === 'normal' && calcSlotPct(s) < 100) slotsNeedHelp++;
    });
  });

  // Unique time slots
  const times = [...new Set(data.map(r => r.hora_inicio))];

  // Build HTML
  const app = document.getElementById('app');
  let html = '';

  // Stats bar
  html += `
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-value ${textClass(overallPct)}">${overallPct}%</div>
        <div class="stat-label">Preenchido</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:${slotsNeedHelp > 0 ? '#ef4444' : '#22c55e'}">${slotsNeedHelp}</div>
        <div class="stat-label">Precisam de você</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${META_ADORADORES}</div>
        <div class="stat-label">Meta/horário</div>
      </div>
    </div>`;

  // Legend
  html += `
    <div class="legend">
      <div class="legend-item"><div class="legend-dot bg-0"></div> Vazio</div>
      <div class="legend-item"><div class="legend-dot bg-25"></div> Crítico</div>
      <div class="legend-item"><div class="legend-dot bg-50"></div> Parcial</div>
      <div class="legend-item"><div class="legend-dot bg-75"></div> Quase lá</div>
      <div class="legend-item"><div class="legend-dot bg-100"></div> Completo</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--cinza-200,#bdbdbd)"></div> Missa/Recolhe</div>
    </div>`;

  // Day selector tabs
  html += '<nav class="day-selector" id="daySelector">';
  DAYS_ORDER.forEach((d, i) => {
    const pct = dayStats[d].pct;
    html += `
      <a class="day-tab ${i === 0 ? 'active' : ''}" data-day="${d}" href="#day-${d}">
        <span class="day-name">${DAYS_SHORT[i]}</span>
        <span class="day-pct ${textClass(pct)}">${pct}%</span>
        <div class="day-bar">
          <div class="day-bar-fill ${fillClass(pct)}" style="width:${pct}%"></div>
        </div>
      </a>`;
  });
  html += '</nav>';

  // === DESKTOP GRID ===
  html += '<div class="schedule-desktop" id="desktopGrid">';
  // Header row
  html += '<div class="grid-header" style="background:transparent;color:var(--text,#111);font-size:var(--font-size-minor,.76rem);">Horário</div>';
  DAYS_ORDER.forEach((d, i) => {
    const pct = dayStats[d].pct;
    html += `<div class="grid-header">${DAYS_SHORT[i]}<span class="gh-pct">${pct}%</span></div>`;
  });

  // Data rows
  times.forEach(time => {
    const timeEnd = data.find(r => r.hora_inicio === time)?.hora_fim || '';
    html += `<div class="grid-time">${formatHour(time)}-${formatHour(timeEnd)}</div>`;

    DAYS_ORDER.forEach(d => {
      const slot = byDay[d].find(s => s.hora_inicio === time);
      if (!slot) {
        html += '<div class="grid-cell" style="background:var(--bg,#f0f0f0);"></div>';
        return;
      }

      const tipo = (slot.tipo || 'normal').toLowerCase();
      if (tipo === 'missa' || tipo === 'recolhe') {
        const label = tipo === 'missa' ? 'Missa' : 'Recolhe Jesus';
        html += `<div class="grid-cell cell-blocked" title="${label}">${label}</div>`;
        return;
      }

      const pct = calcSlotPct(slot);
      const avg = calcSlotAvgPeople(slot);
      const wk = weeksWithPeople(slot);
      const isClickable = pct < 100;
      const timeLabel = `${formatHour(slot.hora_inicio)} às ${formatHour(slot.hora_fim)}`;
      const url = isClickable ? whatsappURL(d, timeLabel) : '#';

      html += `<${isClickable ? 'a' : 'div'} class="grid-cell ${lvClass(pct)} ${isClickable ? 'clickable' : ''}" ${isClickable ? `href="${url}" target="_blank" rel="noopener"` : ''} title="${d} ${timeLabel}: ${pct}%">
        <span class="cell-pct">${pct}%</span>
        <div class="cell-weeks">${weekDotsHTML(slot, 'small')}</div>
      </${isClickable ? 'a' : 'div'}>`;
    });
  });
  html += '</div>';

  // === MOBILE LIST ===
  html += '<div class="schedule-mobile">';
  DAYS_ORDER.forEach((d, i) => {
    const pct = dayStats[d].pct;
    html += `
      <div class="schedule-container day-panel" id="day-${d}" data-day="${d}" style="${i > 0 ? 'display:none;' : ''}">
        <div class="day-title">
          ${d.charAt(0) + d.slice(1).toLowerCase()}
          <span class="pct-badge ${fillClass(pct)}">${pct}%</span>
        </div>
        <ul class="slot-list">`;

    byDay[d].forEach(slot => {
      const tipo = (slot.tipo || 'normal').toLowerCase();
      const timeLabel = `${formatHour(slot.hora_inicio)} às ${formatHour(slot.hora_fim)}`;

      if (tipo === 'missa' || tipo === 'recolhe') {
        const label = tipo === 'missa' ? 'Missa' : 'Recolhe Jesus';
        html += `
          <li class="slot-item blocked">
            <span class="slot-time">${timeLabel}</span>
            <span class="badge-blocked">${label}</span>
          </li>`;
        return;
      }

      const pctSlot = calcSlotPct(slot);
      const avg = calcSlotAvgPeople(slot);
      const wk = weeksWithPeople(slot);
      const isClickable = pctSlot < 100;
      const url = whatsappURL(d, timeLabel);

      html += `
        <li class="slot-item ${isClickable ? 'clickable' : ''}" ${isClickable ? `onclick="window.open('${url}','_blank')"` : ''}>
          <span class="slot-time">${timeLabel}</span>
          <div class="slot-bar-wrap">
            <div class="slot-bar">
              <div class="slot-bar-fill ${fillClass(pctSlot)}" style="width:${pctSlot}%"></div>
            </div>
            <div class="slot-weeks">
              ${weekDotsHTML(slot, 'normal')}
            </div>
          </div>
          <span class="slot-pct ${textClass(pctSlot)}">${pctSlot}%</span>
          ${isClickable ? `<span class="slot-whatsapp">${WHATSAPP_SVG}</span>` : ''}
        </li>`;
    });

    html += '</ul></div>';
  });
  html += '</div>';

  // === HOW TO READ ===
  html += `
    <section class="how-to-read">
      <h3>Como ler esta escala?</h3>
      <p>Cada horário mostra quantas pessoas estão comprometidas em cada semana do mês (S1 = 1ª semana, S2 = 2ª semana, e assim por diante).</p>
      <p class="htr-label">Exemplo:</p>
      <div class="htr-example">
        <span class="week-chip full"><span class="wc-label">S1</span><span class="wc-icon">${PERSON_SVG}</span>2</span>
        <span class="week-chip partial"><span class="wc-label">S2</span><span class="wc-icon">${PERSON_SVG}</span>1</span>
        <span class="week-chip partial"><span class="wc-label">S3</span><span class="wc-icon">${PERSON_SVG}</span>1</span>
        <span class="week-chip partial"><span class="wc-label">S4</span><span class="wc-icon">${PERSON_SVG}</span>1</span>
        <span class="week-chip empty"><span class="wc-label">S5</span><span class="wc-icon">${PERSON_SVG}</span>vazio</span>
      </div>
      <p><span class="htr-arrow">&rarr;</span> Na <strong>1ª semana</strong> há 2 pessoas (meta atingida: <strong style="color:#166534">verde</strong>). Na 2ª, 3ª e 4ª semana há 1 pessoa, mas a meta é ${META_ADORADORES} (<strong style="color:#92400e">amarelo</strong>). Na 5ª semana ninguém se comprometeu (<strong style="color:#8a8a8a">cinza tracejado</strong>).</p>
      <p><span class="htr-arrow">&rarr;</span> A meta é ter <strong>${META_ADORADORES} pessoa(s)</strong> por horário em cada semana. Se um horário está incompleto, toque nele para entrar em contato via WhatsApp e se inscrever!</p>
    </section>`;

  app.innerHTML = html;
  document.getElementById('cta').style.display = 'block';

  // Tab interaction (mobile)
  document.querySelectorAll('.day-tab').forEach(tab => {
    tab.addEventListener('click', function (e) {
      e.preventDefault();
      const day = this.dataset.day;
      document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.day-panel').forEach(p => {
        p.style.display = p.dataset.day === day ? 'block' : 'none';
      });
    });
  });
}

// Fetch and render
fetch(SHEETS_CSV_URL)
  .then(r => {
    if (!r.ok) throw new Error('Erro ao carregar dados');
    return r.text();
  })
  .then(text => {
    const data = parseCSV(text);
    if (!data.length) throw new Error('Planilha vazia');
    render(data);
  })
  .catch(err => {
    console.error(err);
    document.getElementById('app').innerHTML = `
      <div class="error-msg">
        <h2>Não foi possível carregar os dados</h2>
        <p>Verifique se a planilha está publicada na web.<br>
        Erro: ${err.message}</p>
      </div>`;
  });
