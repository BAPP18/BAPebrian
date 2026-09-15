export function initPMTools() {
  initPMTabs('pm-tabs');
  initExcelCleaner();
  initGanttChart();
  initRiskMatrix();
  initSprintBoard();
  initBudgetTracker();
  initRaciMatrix();
  initStakeholderGrid();
  initWbsBuilder();
  initCompDecompMatrix();
}

// ===== Shared helpers =====
function pmEscapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

function initPMTabs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const tabs = container.querySelectorAll('.lab-tab');
  const contents = document.querySelectorAll('.lab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById(tab.dataset.tab);
      if (content) content.classList.add('active');
    });
  });
}

function pmSave(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}
function pmLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}

// ===== 1. Excel Cleaner =========================================================
const PM_XLSX_LIB = () => typeof XLSX !== 'undefined';

const PM_SAMPLE_TASKS = [
  ['Project', 'Task', 'Description', 'Assigned To', 'Deliverable', '% Done', 'Fixed Cost', 'Est Hours', 'Actual Hours', 'At Risk', 'Status', 'Priority', 'Deadline'],
  ['Cloud Migration', 'Setup environments', 'Prepare dev/staging/prod infra', 'Rani S.', 'Environments live', 100, '$2,400.00', 40, 38, 'No', 'Complete', 'High', '2026-03-01'],
  ['Cloud Migration', 'Migrate databases', 'Move legacy DBs to managed service', 'Deni K.', 'DB migrated & verified', 75, '$4,100.00', 60, 52, 'No', 'In Progress', 'High', '2026-03-20'],
  ['Cloud Migration', 'Configure VPN', 'Site-to-site tunnel to cloud VPC', 'Andi P.', 'VPN established', 40, '$980.00', 24, 30, 'Yes', 'In Progress', 'Medium', '2026-03-10'],
  ['Cloud Migration', 'Write runbook docs', 'Document ops procedures', 'Rani S.', 'Runbook v1 published', 10, '$650.00', 20, 4, 'No', 'Not Started', 'Low', '2026-04-01'],
  ['Cloud Migration', 'UAT validation', 'User acceptance test with business', 'Lina W.', 'UAT sign-off', 0, '$1,150.00', 16, 0, 'No', 'On Hold', 'Medium', '2026-04-15'],
  ['Cloud Migration', 'Hypercare support', 'Post-go-live monitoring', 'Deni K.', 'Stable operations', 0, '$3,200.00', 80, 0, 'No', 'Planned', 'High', '2026-05-10']
];

function initExcelCleaner() {
  const state = {
    headers: [],
    rows: [],
    raw: null,
    fullHeaders: [],
    fullRaw: null,
    fileName: '',
    sheetName: '',
    options: { trim: true, emptyRows: true, dupRows: true, dupCols: true, formulaWarn: true },
    visibleCols: [],
    renamed: {},
  };

  const fileInput = document.getElementById('pm-xlsx-file');
  const dropZone = document.getElementById('pm-xlsx-drop');
  const sampleBtn = document.getElementById('pm-xlsx-sample');
  const downloadXlsx = document.getElementById('pm-xlsx-dl-xlsx');
  const downloadCsv = document.getElementById('pm-xlsx-dl-csv');
  const infoEl = document.getElementById('pm-xlsx-info');
  const previewEl = document.getElementById('pm-xlsx-preview');
  const opts = document.querySelectorAll('.pm-xlsx-opt');
  const applyBtn = document.getElementById('pm-xlsx-apply');
  const resetBtn = document.getElementById('pm-xlsx-reset');

  function render() {
    if (!state.headers.length) {
      previewEl.innerHTML = '<p class="text-muted">📄 Belum ada file. Upload file Excel (.xlsx / .xls / .csv) atau klik tombol "Unduh Template Contoh" untuk mencoba.</p>';
      return;
    }
    const headerSelects = state.headers.map((h, i) => `
      <label class="pm-xlsx-cols">
        <input type="checkbox" data-col="${i}" ${state.visibleCols.includes(i) ? 'checked' : ''}>
        <input type="text" class="pm-xlsx-rename" data-col="${i}" value="${pmEscapeHtml(state.renamed[i] || h)}" placeholder="Kolom ${i + 1}">
      </label>`).join('');

    const table = state.rows.length
      ? `<div class="pm-tbl-wrap">
          <table class="pm-tbl">
            <thead><tr>${state.headers.map((h, i) => state.visibleCols.includes(i) ? `<th>${pmEscapeHtml(state.renamed[i] || h)}</th>` : '').join('')}</tr></thead>
            <tbody>${state.rows.map((r, ri) => {
              const danger = r.__formula ? ' class="pm-cell-warn"' : '';
              return `<tr${danger}><td class="pm-row-idx">${ri + 1}</td>${state.headers.map((h, i) => state.visibleCols.includes(i) ? `<td>${pmEscapeHtml(r[i] ?? '')}</td>` : '').join('')}</tr>`;
            }).join('')}</tbody>
          </table>
        </div>
        <p class="text-muted pm-tbl-hint">⚠️ Sel dengan tanda ⚠️ mengandung karakter formula (=, +, -, @) dan akan di-escape saat download.</p>`
      : '<p class="text-muted">Tidak ada baris data setelah pembersihan.</p>';

    previewEl.innerHTML = `
      <div class="pm-xlsx-cols">
        <span class="pm-xlsx-cols-title">Pilih kolom yang ingin dilihat / rename:</span>
        ${headerSelects}
      </div>
      ${table}`;

    previewEl.querySelectorAll('input[data-col]').forEach(el => {
      el.addEventListener('change', () => {
        const i = parseInt(el.dataset.col, 10);
        if (el.type === 'checkbox') {
          const idx = state.visibleCols.indexOf(i);
          if (el.checked && idx === -1) state.visibleCols.push(i);
          if (!el.checked && idx !== -1) state.visibleCols.splice(idx, 1);
        } else {
          state.renamed[i] = el.value;
        }
        render();
      });
    });
  }

  function derive() {
    if (!state.fullRaw) return;
    let idx = state.fullHeaders.map((_, i) => i);
    if (state.options.dupCols) {
      const seen = {};
      idx = state.fullHeaders.map((h, i) => {
        const key = String(h).toLowerCase();
        if (seen[key]) return -1;
        seen[key] = true;
        return i;
      }).filter(i => i !== -1);
    }
    state.headers = idx.map(i => state.fullHeaders[i]);
    state.visibleCols = state.headers.map((_, i) => i);
    state.renamed = {};
    state.raw = state.fullRaw.map(r => idx.map(i => r[i] === undefined ? '' : r[i]));
  }

function applyClean() {
    if (!state.raw) return;
    let out = state.raw.map(r => [...r]);
    if (state.options.trim) out = out.map(r => r.map(c => (typeof c === 'string' ? c.trim() : c)));
    if (state.options.emptyRows) out = out.filter(r => r.some(c => String(c ?? '').trim() !== ''));
    if (state.options.dupRows) {
      const seen = new Set();
      out = out.filter(r => {
        const key = r.map(c => String(c ?? '')).join('\u0001');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    state.rows = out.map(r => {
      const hasFormula = r.some(c => typeof c === 'string' && /^[=+\-@\t]/.test(c));
      return Object.assign([...r], { __formula: hasFormula });
    });
    render();
  }

  function setInfo(msg, cls = '') {
    infoEl.innerHTML = msg ? `<p class="${cls}">${msg}</p>` : '';
  }

  function process(data, fileName, sheetName) {
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    const headers = (rows.shift() || []).map(c => String(c === null || c === undefined ? '' : c).trim());
    const normalized = rows.filter(r => r.some(c => String(c ?? '').trim() !== ''));

    state.fileName = fileName || 'workbook.xlsx';
    state.sheetName = sheetName || (wb.SheetNames[0] || 'Sheet1');
    state.fullHeaders = headers;
    state.fullRaw = normalized.map(r => {
      while (r.length < headers.length) r.push('');
      return r;
    });
    derive();
    applyClean();
  }

  function readFile(file) {
    if (!PM_XLSX_LIB()) { setInfo('⚠️ Library Excel belum termuat. Refresh halaman atau cek koneksi.', 'pm-err'); return; }
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!/\.(xlsx|xls|csv)$/.test(name)) { setInfo('⚠️ Hanya file .xlsx, .xls, atau .csv yang didukung.', 'pm-err'); return; }
    if (file.size > 5 * 1024 * 1024) { setInfo('⚠️ File terlalu besar (maks 5MB).', 'pm-err'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      try { process(new Uint8Array(e.target.result), file.name); }
      catch { setInfo('⚠️ Gagal membaca file. Pastikan format Excel valid.', 'pm-err'); }
    };
    reader.readAsArrayBuffer(file);
  }

  if (fileInput) fileInput.addEventListener('change', e => readFile(e.target.files[0]));
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('pm-drag'); }));
    ['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('pm-drag'); }));
    dropZone.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));
    dropZone.addEventListener('click', () => fileInput && fileInput.click());
  }

  if (sampleBtn) sampleBtn.addEventListener('click', () => {
    if (!PM_XLSX_LIB()) { setInfo('⚠️ Library Excel belum termuat.', 'pm-err'); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(PM_SAMPLE_TASKS.map(r => [...r])), 'Task Tracker');
    XLSX.writeFile(wb, 'project-task-tracker-sample.xlsx');
    setInfo('✅ Sample template "project-task-tracker-sample.xlsx" diunduh. Upload ulang file tersebut untuk mencoba Excel Cleaner.', 'pm-ok');
  });

  if (applyBtn) applyBtn.addEventListener('click', () => {
    if (!state.raw || !state.headers.length) { setInfo('⚠️ Upload file / klik "Unduh Template Contoh" dulu.', 'pm-err'); return; }
    applyClean();
    setInfo(`✅ Pembersihan dijalankan ulang. ${state.headers.length} kolom, ${state.rows.length} baris tersisa. Pilih kolom yang ingin dilihat / rename, lalu download.`, 'pm-ok');
  });

  if (resetBtn) resetBtn.addEventListener('click', () => {
    state.headers = []; state.rows = []; state.raw = null; state.fullHeaders = []; state.fullRaw = null;
    state.fileName = ''; state.visibleCols = []; state.renamed = {};
    fileInput.value = '';
    setInfo('');
    render();
  });

  // Options changes re-apply cleaning on the loaded data
  opts.forEach(opt => {
    opt.addEventListener('change', () => {
      state.options[opt.dataset.opt] = opt.checked;
      if (opt.dataset.opt === 'dupCols') derive();
      if (state.raw) applyClean();
    });
  });

  // Live CSV download with formula-injection escaping
  if (downloadCsv) downloadCsv.addEventListener('click', () => {
    if (!state.headers.length) { setInfo('⚠️ Tidak ada data untuk diunduh.', 'pm-err'); return; }
    const cols = state.headers.map((_, i) => i).filter(i => state.visibleCols.includes(i));
    const escapeCell = v => {
      v = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
      if (/[",\n\r]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
      return v;
    };
    const lines = [cols.map(i => escapeCell(state.renamed[i] || state.headers[i])).join(',')];
    state.rows.forEach(r => lines.push(cols.map(i => escapeCell(r[i] ?? '')).join(',')));
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.fileName.replace(/\.(xlsx|xls|csv)$/i, '') || 'cleaned') + '-cleaned.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  if (downloadXlsx) downloadXlsx.addEventListener('click', () => {
    if (!state.headers.length) { setInfo('⚠️ Tidak ada data untuk diunduh.', 'pm-err'); return; }
    const cols = state.headers.map((_, i) => i).filter(i => state.visibleCols.includes(i));
    const safe = v => {
      v = String(v ?? '');
      return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
    };
    const aoa = [cols.map(i => state.renamed[i] || state.headers[i])];
    state.rows.forEach(r => aoa.push(cols.map(i => safe(r[i] ?? ''))));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Cleaned');
    XLSX.writeFile(wb, (state.fileName.replace(/\.(xlsx|xls|csv)$/i, '') || 'cleaned') + '-cleaned.xlsx');
  });

  render();
}

// ===== 2. Gantt Chart ===========================================================
function initGanttChart() {
  const addBtn = document.getElementById('pm-gantt-add');
  const nameInput = document.getElementById('pm-gantt-name');
  const startInput = document.getElementById('pm-gantt-start');
  const durInput = document.getElementById('pm-gantt-dur');
  const listEl = document.getElementById('pm-gantt-list');
  const renderEl = document.getElementById('pm-gantt-chart');

  const key = 'pm_gantt_tasks';
  let tasks = pmLoad(key, []);

  function save() { pmSave(key, tasks); render(); }

  function render() {
    if (!renderEl) return;
    if (!tasks.length) {
      listEl.innerHTML = '<p class="text-muted">Belum ada tugas. Tambahkan tugas untuk membangun Gantt chart.</p>';
      renderEl.innerHTML = '<p class="text-muted">Timeline akan tampil di sini setelah ada tugas.</p>';
      return;
    }
    const startOfTask = t => {
      const d = new Date(t.start || Date.now());
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    const minDate = new Date(Math.min(...tasks.map(t => startOfTask(t).getTime())));
    const maxDate = new Date(Math.max(...tasks.map(t => {
      const s = startOfTask(t); s.setDate(s.getDate() + (parseInt(t.dur) || 1));
      return s.getTime();
    })));

    listEl.innerHTML = tasks.map((t, i) => `
      <div class="pm-gantt-row">
        <span class="pm-gantt-name">${pmEscapeHtml(t.name)}</span>
        <span class="pm-gantt-start">${pmEscapeHtml(startOfTask(t).toISOString().slice(0, 10))}</span>
        <span class="pm-gantt-dur">${pmEscapeHtml(String(t.dur))} hari</span>
        <button class="btn btn-sm btn-outline" data-del="${i}">✖</button>
      </div>`).join('');
    listEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      tasks.splice(parseInt(b.dataset.del, 10), 1); save();
    }));

    const totalDays = Math.max(1, Math.round((maxDate - minDate) / 86400000) + 1);
    renderEl.innerHTML = `<div class="pm-gantt-head"><span class="pm-gantt-hname">Task</span><span class="pm-gantt-scale"></span></div>` +
      tasks.map(t => {
        const s = startOfTask(t);
        const off = Math.max(0, Math.round((s - minDate) / 86400000));
        const w = Math.max(1, Math.round(((parseInt(t.dur) || 1) / totalDays) * 100));
        const left = (off / totalDays) * 100;
        return `<div class="pm-gantt-row pm-gantt-bar-row">
          <span class="pm-gantt-name">${pmEscapeHtml(t.name)}</span>
          <div class="pm-gantt-track">
            <div class="pm-gantt-bar" style="left:${left}%;width:${Math.min(100 - left, w)}%"></div>
          </div>
        </div>`;
      }).join('') +
      `<div class="pm-gantt-scale-row">${Array.from({ length: Math.min(totalDays, 30) }, (_, i) => {
        const d = new Date(minDate); d.setDate(d.getDate() + i);
        return `<span>${d.getDate()}</span>`;
      }).join('')}</div>`;
  }

  if (addBtn) addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    const start = startInput.value || new Date().toISOString().slice(0, 10);
    const dur = Math.max(1, parseInt(durInput.value) || 1);
    tasks.push({ name, start, dur });
    nameInput.value = ''; durInput.value = '';
    save();
  });
  render();
}

// ===== 3. Risk Matrix ===========================================================
function initRiskMatrix() {
  const addBtn = document.getElementById('pm-risk-add');
  const nameInput = document.getElementById('pm-risk-name');
  const likeInput = document.getElementById('pm-risk-like');
  const impactInput = document.getElementById('pm-risk-impact');
  const listEl = document.getElementById('pm-risk-list');
  const gridEl = document.getElementById('pm-risk-grid');

  const key = 'pm_risks';
  let risks = pmLoad(key, []);
  const LEVELS = [
    { min: 1, max: 3, label: 'Low' },
    { min: 4, max: 6, label: 'Medium' },
    { min: 8, max: 12, label: 'High' },
    { min: 15, max: 25, label: 'Extreme' },
  ];
  const color = score => {
    if (score >= 15) return 'pm-r-extreme';
    if (score >= 8) return 'pm-r-high';
    if (score >= 4) return 'pm-r-medium';
    return 'pm-r-low';
  };

  function save() { pmSave(key, risks); render(); }

  function render() {
    listEl.innerHTML = risks.length ? risks.map((r, i) => `
      <div class="pm-risk-item ${color(r.l * r.i)}"><span class="pm-risk-score">${r.l * r.i}</span><span class="pm-risk-name">${pmEscapeHtml(r.name)}</span><span>L=${r.l} I=${r.i}</span><button class="btn btn-sm btn-outline" data-del="${i}">✖</button></div>`).join('') : '<p class="text-muted">Belum ada risiko. Tambahkan risiko untuk melihatnya di matriks.</p>';
    listEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { risks.splice(parseInt(b.dataset.del, 10), 1); save(); }));

    let html = '<div class="pm-risk-grid">';
    for (let l = 5; l >= 1; l--) {
      html += `<div class="pm-risk-y">${l}</div>`;
      for (let i = 1; i <= 5; i++) {
        const score = l * i;
        const has = risks.filter(r => r.l === l && r.i === i);
        html += `<div class="pm-risk-cell ${color(score)}">${has.length ? has.length : ''}</div>`;
      }
    }
    html += '<div class="pm-risk-blank"></div><div class="pm-risk-x pm-risk-x1">1</div><div class="pm-risk-x pm-risk-x2">2</div><div class="pm-risk-x pm-risk-x3">3</div><div class="pm-risk-x pm-risk-x4">4</div><div class="pm-risk-x pm-risk-x5">5</div></div>';
    gridEl.innerHTML = html;
  }

  function addRisk() {
    const name = nameInput.value.trim();
    if (!name) return;
    const l = parseInt(likeInput.value, 10);
    const i = parseInt(impactInput.value, 10);
    risks.push({ name, l, i });
    nameInput.value = '';
    save();
  }
  if (addBtn) addBtn.addEventListener('click', addRisk);
  if (nameInput) nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addRisk(); });
  render();
}

// ===== 4. Sprint Board ==========================================================
function initSprintBoard() {
  const key = 'pm_sprint';
  const cols = [
    { id: 'backlog', label: '📥 Backlog' },
    { id: 'progress', label: '🚧 In Progress' },
    { id: 'done', label: '✅ Done' },
  ];
  let items = pmLoad(key, []);
  const inputEl = document.getElementById('pm-sprint-input');
  const colEl = document.getElementById('pm-sprint-col');
  const addBtn = document.getElementById('pm-sprint-add');
  const boardEl = document.getElementById('pm-sprint-board');

  function save() { pmSave(key, items); render(); }

  function render() {
    boardEl.innerHTML = cols.map((c, ci) => {
      const list = items.filter(i => i.col === c.id).map((i, idx) => `
        <div class="pm-sprint-card">
          <span>${pmEscapeHtml(i.text)}</span>
          <div class="pm-sprint-actions">
            ${ci > 0 ? `<button class="btn btn-sm btn-outline" data-move="${items.indexOf(i)},-1">←</button>` : ''}
            ${ci < cols.length - 1 ? `<button class="btn btn-sm btn-outline" data-move="${items.indexOf(i)},1">→</button>` : ''}
            <button class="btn btn-sm btn-outline" data-del="${items.indexOf(i)}">✖</button>
          </div>
        </div>`).join('') || '<p class="text-muted">Kosong</p>';
      return `<div class="pm-sprint-col"><div class="pm-sprint-col-head">${c.label} <span class="pm-sprint-count">${items.filter(i => i.col === c.id).length}</span></div>${list}</div>`;
    }).join('');
    boardEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { items.splice(parseInt(b.dataset.del, 10), 1); save(); }));
    boardEl.querySelectorAll('[data-move]').forEach(b => {
      b.addEventListener('click', () => {
        const [idx, dir] = b.dataset.move.split(',').map(Number);
        const cur = cols.findIndex(c => c.id === items[idx].col);
        const next = cols[cur + dir];
        if (next) { items[idx].col = next.id; save(); }
      });
    });
  }

  function addItem() {
    const text = inputEl.value.trim();
    if (!text) return;
    items.push({ text, col: colEl.value, created: Date.now() });
    inputEl.value = '';
    save();
  }
  if (addBtn) addBtn.addEventListener('click', addItem);
  if (inputEl) inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
  render();
}

// ===== 5. Budget Tracker =========================================================
function initBudgetTracker() {
  const addBtn = document.getElementById('pm-budget-add');
  const nameInput = document.getElementById('pm-budget-name');
  const estInput = document.getElementById('pm-budget-est');
  const actInput = document.getElementById('pm-budget-act');
  const bodyEl = document.getElementById('pm-budget-body');
  const totalEl = document.getElementById('pm-budget-total');

  const key = 'pm_budget';
  let items = pmLoad(key, []);
  const fmt = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  function save() { pmSave(key, items); render(); }

  function render() {
    let est = 0, act = 0;
    bodyEl.innerHTML = items.map((it, i) => {
      const varp = it.est > 0 ? ((it.act - it.est) / it.est) * 100 : 0;
      const bad = varp > 5;
      est += it.est; act += it.act;
      return `<div class="pm-budget-row ${bad ? 'pm-budget-over' : ''}">
        <span class="pm-budget-name">${pmEscapeHtml(it.name)}</span>
        <span>${fmt(it.est)}</span>
        <span>${fmt(it.act)}</span>
        <span>${varp.toFixed(0)}%</span>
        <span>${bad ? '⚠️ Over' : '✅ OK'}</span>
        <button class="btn btn-sm btn-outline" data-del="${i}">✖</button></div>`;
    }).join('') || '<p class="text-muted">Belum ada item anggaran.</p>';
    bodyEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { items.splice(parseInt(b.dataset.del, 10), 1); save(); }));
    const varp = est > 0 ? ((act - est) / est) * 100 : 0;
    totalEl.innerHTML = `<div class="pm-budget-total"><span>Total Est: ${fmt(est)}</span><span>Total Act: ${fmt(act)}</span><span>Variance: ${varp.toFixed(1)}% (${varp > 5 ? 'Over budget' : varp < -5 ? 'Under budget' : 'On budget'})</span></div>`;
  }

  if (addBtn) addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    items.push({ name, est: parseFloat(estInput.value) || 0, act: parseFloat(actInput.value) || 0 });
    nameInput.value = ''; estInput.value = ''; actInput.value = '';
    save();
  });
  render();
}

// ===== 6. RACI Matrix ============================================================
function initRaciMatrix() {
  const buildBtn = document.getElementById('pm-raci-build');
  const tasksInput = document.getElementById('pm-raci-tasks');
  const peopleInput = document.getElementById('pm-raci-people');
  const outEl = document.getElementById('pm-raci-out');

  const key = 'pm_raci';
  const saved = pmLoad(key, null);
  let tasks = saved ? saved.tasks : [];
  let people = saved ? saved.people : [];
  let matrix = saved ? saved.matrix : {};

  function save() { pmSave(key, { tasks, people, matrix }); }

  function render() {
    if (!tasks.length) { outEl.innerHTML = '<p class="text-muted">Masukkan tugas & anggota tim lalu klik "Bangun Matriks".</p>'; return; }
    const letters = ['R', 'A', 'C', 'I'];
    const desc = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' };
    outEl.innerHTML = `<div class="pm-tbl-wrap"><table class="pm-tbl pm-tbl-raci">
      <thead><tr><th>Task</th>${people.map(p => `<th>${pmEscapeHtml(p)}</th>`).join('')}<th></th></tr></thead>
      <tbody>${tasks.map((t, ti) => `<tr><td>${pmEscapeHtml(t)}</td>${people.map((p, pi) => {
        const v = matrix[ti + '-' + pi] || '';
        return `<td class="pm-raci-cell"><select data-c="${ti}-${pi}"><option value="">—</option>${letters.map(l => `<option ${v === l ? 'selected' : ''}>${l}</option>`).join('')}</select></td>`;
      }).join('')}<td><button class="btn btn-sm btn-outline" data-deltask="${ti}">✖</button></td></tr>`).join('')}</tbody>
    </table></div>
    <p class="text-muted">${letters.map(l => `<b>${l}</b> = ${desc[l]}`).join(' &nbsp;·&nbsp; ')}</p>`;
    outEl.querySelectorAll('select[data-c]').forEach(s => s.addEventListener('change', () => { matrix[s.dataset.c] = s.value; save(); }));
    outEl.querySelectorAll('[data-deltask]').forEach(b => b.addEventListener('click', () => { tasks.splice(parseInt(b.dataset.deltask, 10), 1); save(); render(); }));
  }

  if (buildBtn) buildBtn.addEventListener('click', () => {
    tasks = tasksInput.value.split('\n').map(s => s.trim()).filter(Boolean);
    people = peopleInput.value.split('\n').map(s => s.trim()).filter(Boolean);
    matrix = {};
    save();
    render();
  });
  render();
}

// ===== 7. Stakeholder Grid ========================================================
function initStakeholderGrid() {
  const addBtn = document.getElementById('pm-stake-add');
  const nameInput = document.getElementById('pm-stake-name');
  const powerInput = document.getElementById('pm-stake-power');
  const interestInput = document.getElementById('pm-stake-interest');
  const outEl = document.getElementById('pm-stake-grid');
  const listEl = document.getElementById('pm-stake-list');

  const key = 'pm_stake';
  let items = pmLoad(key, []);

  function save() { pmSave(key, items); render(); }

  function render() {
    listEl.innerHTML = items.map((it, i) => `<div class="pm-stake-row"><span>${pmEscapeHtml(it.name)}</span><span>P=${it.p} I=${it.i}</span><button class="btn btn-sm btn-outline" data-del="${i}">✖</button></div>`).join('') || '<p class="text-muted">Belum ada stakeholder.</p>';
    listEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { items.splice(parseInt(b.dataset.del, 10), 1); save(); }));

    const top = px => { const x = (px / 5) * 94 + '%'; return x; };
    const left = py => { const y = ((5 - py) / 5) * 94 + '%'; return y; };
    outEl.innerHTML = `
      <div class="pm-stake-grid">
        ${items.map(it => `<div class="pm-stake-dot" style="left:${top(it.p)};top:${left(it.i)}" title="${pmEscapeHtml(it.name)}"></div>`).join('')}
        <div class="pm-stake-quad pm-stake-q1">Manage<br>Closely</div>
        <div class="pm-stake-quad pm-stake-q2">Keep<br>Satisfied</div>
        <div class="pm-stake-quad pm-stake-q3">Keep<br>Informed</div>
        <div class="pm-stake-quad pm-stake-q4">Monitor</div>
      </div>
      <p class="text-muted" style="text-align:center;font-size:0.7rem">Kuadran: ⬆ Power (kiri rendah → kanan tinggi) · ⬆ Interest (bawah rendah → atas tinggi)</p>`;
  }

  if (addBtn) addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    items.push({ name, p: parseInt(powerInput.value, 10), i: parseInt(interestInput.value, 10) });
    nameInput.value = '';
    save();
  });
  render();
}

// ===== 8. WBS Builder ============================================================
function initWbsBuilder() {
  const addBtn = document.getElementById('pm-wbs-add');
  const nameInput = document.getElementById('pm-wbs-name');
  const parentInput = document.getElementById('pm-wbs-parent');
  const outEl = document.getElementById('pm-wbs-out');

  const key = 'pm_wbs';
  const saved = pmLoad(key, []);
  let nodes = Array.isArray(saved) ? saved : [];

  function save() { pmSave(key, nodes); render(); }

  function render() {
    const options = nodes.map((n, i) => `<option value="${i}">${pmEscapeHtml(n.name)}</option>`).join('');
    parentInput.innerHTML = '<option value="-1">(Level 1 — root)</option>' + options;
    outEl.innerHTML = nodes.length ? `<div class="pm-tbl-wrap"><table class="pm-tbl pm-tbl-wbs"></table></div>` : '<p class="text-muted">Tambahkan deliverable / sub-tugas untuk membangun WBS.</p>';
    const tbl = outEl.querySelector('.pm-tbl-wbs');
    if (!tbl) return;
    const byParent = {};
    nodes.forEach((n, i) => { byParent[n.parent] = byParent[n.parent] || []; byParent[n.parent].push(i); });
    const rows = [];
    const walk = (pi, depth) => {
      (byParent[pi] || []).forEach(ci => {
        rows.push(`<tr><td style="padding-left:${depth * 1.5 + 0.5}rem"><span class="pm-wbs-dot"></span>${pmEscapeHtml(nodes[ci].name)}</td><td><button class="btn btn-sm btn-outline" data-del="${ci}">✖</button></td></tr>`);
        walk(ci, depth + 1);
      });
    };
    walk(-1, 0);
    tbl.innerHTML = `<thead><tr><th>Work Breakdown Structure</th><th></th></tr></thead><tbody>${rows.join('')}</tbody>`;
    tbl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const sub = [];
      const mark = i => { sub.push(i); (byParent[i] || []).forEach(mark); };
      mark(parseInt(b.dataset.del, 10));
      nodes = nodes.filter((_, i) => !sub.includes(i));
      save();
    }));
  }

  if (addBtn) addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    nodes.push({ name, parent: parseInt(parentInput.value, 10) });
    nameInput.value = '';
    save();
  });
  if (nameInput) nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });
  render();
}

// ===== 9. Commissioning / Decommissioning Matrix ================================
function initCompDecompMatrix() {
  const key = 'pm_comdec';
  const saved = pmLoad(key, []);
  let items = Array.isArray(saved) ? saved : [];
  const typeEnum = { comm: 'Commissioning', decomm: 'Decommissioning' };
  const statuses = ['Planned', 'In Progress', 'Completed', 'Verified'];
  const addBtn = document.getElementById('pm-comdec-add');
  const typeInput = document.getElementById('pm-comdec-type');
  const nameInput = document.getElementById('pm-comdec-name');
  const startInput = document.getElementById('pm-comdec-start');
  const endInput = document.getElementById('pm-comdec-end');
  const statusInput = document.getElementById('pm-comdec-status');
  const ownerInput = document.getElementById('pm-comdec-owner');
  const checkInput = document.getElementById('pm-comdec-check');
  const filterInput = document.getElementById('pm-comdec-filter');
  const outEl = document.getElementById('pm-comdec-out');

  function save() { pmSave(key, items); render(); }

  function render() {
    const filter = filterInput.value;
    const shown = items.filter(i => !filter || i.type === filter);
    const counts = { comm: items.filter(i => i.type === 'comm').length, decomm: items.filter(i => i.type === 'decomm').length };
    outEl.innerHTML = `<p class="text-muted">Total: ${items.length} item | 🔧 Commissioning: ${counts.comm} | 🔩 Decommissioning: ${counts.decomm}</p>` +
      (shown.length ? `<div class="pm-tbl-wrap"><table class="pm-tbl">
        <thead><tr><th>Type</th><th>Asset / Sistem</th><th>Mulai</th><th>Selesai</th><th>Status</th><th>Owner</th><th>Checklist</th><th></th></tr></thead>
        <tbody>${shown.map((it, i) => {
          const globalIdx = items.indexOf(it);
          return `<tr>
            <td><span class="pm-comdec-badge pm-comdec-${it.type}">${pmEscapeHtml(typeEnum[it.type])}</span></td>
            <td>${pmEscapeHtml(it.name)}</td>
            <td>${pmEscapeHtml(it.start || '-')}</td>
            <td>${pmEscapeHtml(it.end || '-')}</td>
            <td><select data-status="${globalIdx}">${statuses.map(s => `<option ${it.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
            <td>${pmEscapeHtml(it.owner || '-')}</td>
            <td class="pm-comdec-check"><input type="checkbox" data-check="${globalIdx}" ${it.checked ? 'checked' : ''}></td>
            <td><button class="btn btn-sm btn-outline" data-del="${globalIdx}">✖</button></td>
          </tr>`;
        }).join('')}</tbody></table></div>`
      : '<p class="text-muted">Tidak ada item.</p>');
    outEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { items.splice(parseInt(b.dataset.del, 10), 1); save(); }));
    outEl.querySelectorAll('select[data-status]').forEach(s => s.addEventListener('change', () => { items[parseInt(s.dataset.status, 10)].status = s.value; save(); }));
    outEl.querySelectorAll('input[data-check]').forEach(c => c.addEventListener('change', () => { items[parseInt(c.dataset.check, 10)].checked = c.checked; save(); }));
  }

  if (addBtn) addBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    items.push({ type: typeInput.value, name, start: startInput.value, end: endInput.value, status: statusInput.value, owner: ownerInput.value.trim(), checked: checkInput.checked });
    nameInput.value = ''; ownerInput.value = ''; checkInput.checked = false;
    save();
  });
  if (filterInput) filterInput.addEventListener('change', render);
  render();
}