import { DEMO_PROJECT } from '../data/demo-project.js?v=1';
import { analyzeDocuments } from './parser/file-parser.js?v=1';
import { mergeExtractions, computeConfidence, createPlannedProject, getTemplates, uid } from './engine/project-engine.js?v=1';
import { computeHealth } from './engine/health-engine.js?v=1';
import { evaluateRisk, tierOf, suggestedResponse } from './engine/risk-engine.js?v=1';
import { getScenarioList, getScenario, evaluateScenario } from './engine/scenario-engine.js?v=1';
import { generateInsight } from './engine/insight.js?v=1';
import { PMStorage } from './storage.js?v=1';
import { buildReportHTML, download, exportProjectJSON, exportTasksCSV, exportTasksXLSX } from './export.js?v=1';
import { loadLib, isLibLoaded } from './lib-loader.js?v=1';

const PM = { project: null, view: 'home', files: [], charts: [], scenarioId: 's1', reportHtml: '' };

const VIEWS = ['home', 'dashboard', 'analyzer', 'planner', 'health', 'risk', 'scenario', 'reports'];

const PRIVACY = 'Files are processed locally in your browser and are not uploaded to a server.';

export function ensureDemo() {
  if (!PM.project) PM.project = JSON.parse(JSON.stringify(DEMO_PROJECT));
  return PM.project;
}

export function loadDemo() {
  const p = JSON.parse(JSON.stringify(DEMO_PROJECT));
  setProject(p);
  return p;
}

export function getProject() { return PM.project; }

export function setProject(project) {
  PM.project = project;
  if (project && project.id) PMStorage.setActive(project.id);
  renderView(PM.view);
}

export function boot() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.dataset.theme = savedTheme;
  const tb = document.getElementById('pmlab-theme');
  if (tb) {
    tb.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    tb.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
      tb.textContent = next === 'dark' ? '🌙' : '☀️';
    });
  }
  document.querySelectorAll('#pmlab-sidebar [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
  const active = PMStorage.getActive() || JSON.parse(JSON.stringify(DEMO_PROJECT));
  PM.project = active;
  renderView('home');
  window.addEventListener('resize', destroyCharts);
}

export function setView(view) {
  if (!VIEWS.includes(view)) view = 'home';
  PM.view = view;
  renderView(view);
}

function renderView(view) {
  destroyCharts();
  document.querySelectorAll('#pmlab-sidebar [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.pmlab-view').forEach((s) => s.classList.toggle('active', s.id === 'view-' + view));
  const host = document.getElementById('view-' + view);
  if (!host) return;
  if (view === 'home') renderHome(host);
  else if (view === 'dashboard') renderDashboard(host);
  else if (view === 'analyzer') renderAnalyzer(host);
  else if (view === 'planner') renderPlanner(host);
  else if (view === 'health') renderHealth(host);
  else if (view === 'risk') renderRisk(host);
  else if (view === 'scenario') renderScenario(host);
  else if (view === 'reports') renderReports(host);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ================= HOME ================= */

function renderHome(host) {
  const list = PMStorage.list();
  const templates = getTemplates();
  host.innerHTML = `
    <div class="pmlab-hero">
      <h1 class="pmlab-hero-title">IT Project Management Lab</h1>
      <p class="pmlab-hero-sub">Interactive tools for planning, monitoring, risk analysis, project control, and IT project decision-making.</p>
      <p class="pmlab-privacy">🔒 ${PRIVACY}</p>
      <div class="pmlab-hero-actions">
        <button class="btn btn-primary" id="pmlab-demo">Use Demo Project</button>
        <button class="btn btn-outline" id="pmlab-goto-analyzer">Upload Project Documents</button>
      </div>
      <div class="pmlab-template-row">
        <select class="tool-input pmlab-select" id="pmlab-template-list" aria-label="Project template">
          ${templates.map((t) => `<option value="${t.key}">${esc(t.label)}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-primary" id="pmlab-template-start">Quick Start from Template</button>
      </div>
    </div>

    <div class="pmlab-cards">
      ${homeCard('planner', '🧭', 'AI Project Planner', 'Generate WBS, tasks, and a full project plan from templates.')}
      ${homeCard('analyzer', '📄', 'Project Document Analyzer', 'Parse XLSX, PDF, DOCX and TXT to extract project data.')}
      ${homeCard('health', '💚', 'Project Health Analyzer', 'Score schedule, budget, scope, risk, resource and quality.')}
      ${homeCard('risk', '⚠️', 'Risk Simulator', 'Rate probability x impact and measure mitigation effect.')}
      ${homeCard('scenario', '🧪', 'PM Scenario Lab', 'Test realistic decisions: delay, vendor, resources, incidents.')}
      ${homeCard('dashboard', '📊', 'Executive Dashboard', 'KPI cards, charts and an executive project summary.')}
    </div>

    <div class="pmlab-home-row">
      <div class="glass-card pmlab-panel">
        <h3 class="pmlab-panel-title">Projects</h3>
        <div class="pmlab-projects" id="pmlab-projects">
          ${list.length ? list.map((p) => `
            <div class="pmlab-project-item">
              <div class="pmlab-project-info">
                <strong>${esc(p.name)}</strong>
                <span class="text-muted">${esc(p.status || 'n/a')} · ${p.progress != null ? p.progress + '%' : 'n/a'} · updated ${esc((p.updatedAt || '').slice(0, 10) || '—')}</span>
              </div>
              <div class="pmlab-project-actions">
                <button class="btn btn-xs btn-primary" data-load="${p.id}">Load</button>
                <button class="btn btn-xs btn-outline" data-dup="${p.id}">Copy</button>
                <button class="btn btn-xs btn-danger" data-del="${p.id}">Delete</button>
              </div>
            </div>`).join('') : '<p class="text-muted">No saved projects yet.</p>'}
        </div>
      </div>
      <div class="glass-card pmlab-panel">
        <h3 class="pmlab-panel-title">How it works</h3>
        <ol class="pmlab-steps">
          <li>Use the demo project or upload project documents.</li>
          <li>The system parses and normalizes tasks, milestones, risks, and budget.</li>
          <li>Analyze health, simulate risks and decisions, then export a report.</li>
        </ol>
        <p class="text-muted">Libraries (Excel/PDF/DOCX/Chart) are loaded lazily only when needed.</p>
      </div>
    </div>`;

  host.querySelectorAll('.pmlab-card[data-card]').forEach((c) => c.addEventListener('click', () => setView(c.dataset.card)));
  host.querySelector('#pmlab-demo').addEventListener('click', () => {
    setProject(JSON.parse(JSON.stringify(DEMO_PROJECT)));
    setView('dashboard');
  });
  host.querySelector('#pmlab-goto-analyzer').addEventListener('click', () => setView('analyzer'));
  host.querySelector('#pmlab-template-start').addEventListener('click', () => {
    const key = host.querySelector('#pmlab-template-list').value;
    const label = getTemplates().find((t) => t.key === key).label;
    createProjectFromTemplate(key, label);
  });
  host.querySelectorAll('[data-load]').forEach((b) => b.addEventListener('click', () => { const p = PMStorage.get(b.dataset.load); if (p) setProject(p); }));
  host.querySelectorAll('[data-dup]').forEach((b) => b.addEventListener('click', () => { const p = PMStorage.duplicate(b.dataset.dup); if (p) setProject(p); else renderHome(host); }));
  host.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { PMStorage.remove(b.dataset.del); renderHome(host); }));
}

function createProjectFromTemplate(key, label) {
  const p = createPlannedProject({ id: uid('tpl'), name: label + ' (planned)', type: key, duration: 30, team: '', budget: '', objective: '', scope: '' });
  PMStorage.save(p);
  setProject(PMStorage.get(p.id));
  setView('dashboard');
}

function homeCard(view, icon, title, desc) {
  return `<button class="pmlab-card glass-card" data-card="${view}">
    <span class="pmlab-card-icon">${icon}</span>
    <h3>${esc(title)}</h3>
    <p class="text-muted">${esc(desc)}</p>
  </button>`;
}

/* ================= DASHBOARD ================= */

function renderDashboard(host) {
  const project = PM.project;
  if (!project) { emptyState(host, 'No project loaded yet.', [['Use Demo Project', 'home'], ['Upload Documents', 'analyzer']]); return; }
  const health = computeHealth(project);
  ensureBar(project);
  host.innerHTML = `
    ${projectBar(project, health)}
    <div class="pmlab-dash-cards">
      ${dashCard('Overall Health', `${health.overall}/100`, health.status, health.status === 'GREEN' ? 'green' : health.status === 'AMBER' ? 'amber' : 'red', true)}
      ${dashCard('Schedule', health.dimensions.schedule + '/100', '', barColor(health.dimensions.schedule))}
      ${dashCard('Budget', health.dimensions.budget + '/100', '', barColor(health.dimensions.budget))}
      ${dashCard('Risk', health.dimensions.risk + '/100', '', barColor(health.dimensions.risk))}
      ${dashCard('Resource', health.dimensions.resource + '/100', '', barColor(health.dimensions.resource))}
      ${dashCard('Quality', health.dimensions.quality + '/100', '', barColor(health.dimensions.quality))}
      ${dashCard('Scope', health.dimensions.scope + '/100', '', barColor(health.dimensions.scope))}
    </div>
    <div class="pmlab-grid2">
      <div class="glass-card pmlab-panel">
        <h3 class="pmlab-panel-title">Project Progress</h3>
        ${progressBar(project.progress || 0, 'Actual', 'accent')}
        <div style="height:0.4rem"></div>
        ${progressBar(project.plannedProgress != null ? project.plannedProgress : 0, 'Planned', 'muted')}
        <p class="text-muted pmlab-small">Actual ${project.progress || 0}% vs planned ${project.plannedProgress != null ? project.plannedProgress : 'n/a'}%</p>
      </div>
      <div class="glass-card pmlab-panel">
        <h3 class="pmlab-panel-title">Task Status</h3>
        <div id="pmlab-task-chart" style="height:200px;"></div>
        <div class="pmlab-chips">
          ${(project.tasks || []).length ? Object.entries(countTasks(project)) .map(([k, v]) => `<span class="pmlab-chip pmlab-chip-${k}">${k}: ${v}</span>`).join('') : '<span class="text-muted">No tasks.</span>'}
        </div>
      </div>
    </div>
    <div class="pmlab-grid2">
      <div class="glass-card pmlab-panel">
        <h3 class="pmlab-panel-title">Milestones</h3>
        <div>${milestoneList(project)}</div>
      </div>
      <div class="glass-card pmlab-panel">
        <h3 class="pmlab-panel-title">Risk Overview</h3>
        <div id="pmlab-risk-chart" style="height:200px;"></div>
        <div class="pmlab-chips">${riskOverview(project)}</div>
      </div>
    </div>
    <div class="glass-card pmlab-panel">
      <h3 class="pmlab-panel-title">PM Insight</h3>
      <p class="pmlab-insight" id="pmlab-insight">Loading insight…</p>
    </div>
    <div class="pmlab-view-actions">
      <button class="btn btn-primary" id="pmlab-save">💾 Save Project</button>
      <button class="btn btn-outline" id="pmlab-open-risk">Risk Simulator</button>
      <button class="btn btn-outline" id="pmlab-open-reports">Generate Report</button>
    </div>`;
  loadLib('chart').then(() => { drawTaskChart(host, project); drawRiskChart(host, project); }).catch(() => {});
  host.querySelector('#pmlab-save').addEventListener('click', () => { PMStorage.save(project); saveFlash('Project saved to browser storage.'); });
  host.querySelector('#pmlab-open-risk').addEventListener('click', () => setView('risk'));
  host.querySelector('#pmlab-open-reports').addEventListener('click', () => setView('reports'));
  drawDimensionBars(host, health.dimensions);
  generateInsight(project, health).then((txt) => { const el = host.querySelector('#pmlab-insight'); if (el) el.textContent = txt; });
}

function dashCard(title, value, tag, tone, big) {
  return `<div class="pmlab-dash pmlab-tone-${tone} ${big ? 'pmlab-dash-big' : ''}">
    <span class="pmlab-dash-label">${esc(title)}</span>
    <span class="pmlab-dash-value">${esc(value)}</span>
    ${tag ? `<span class="pmlab-tag pmlab-tag-${tone}">${esc(tag)}</span>` : ''}
  </div>`;
}

function barColor(score) { return score >= 80 ? 'green' : score >= 60 ? 'amber' : 'red'; }

function drawDimensionBars(host, dims) {
  const el = host.querySelector('#pmlab-dim-bars');
  if (!el) return;
  el.innerHTML = Object.entries(dims).map(([k, v]) => `${barRow(k, v)}`).join('');
}

function countTasks(project) {
  const c = { Completed: 0, 'In Progress': 0, Blocked: 0, Overdue: 0, 'Not Started': 0, 'On Hold': 0 };
  (project.tasks || []).forEach((t) => { c[t.status] = (c[t.status] || 0) + 1; });
  return c;
}

function riskOverview(project) {
  const tiers = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  (project.risks || []).forEach((r) => { tiers[tierOf(r.score)]++; });
  const map = { Critical: 'red', High: 'amber', Medium: 'accent', Low: 'green' };
  return Object.entries(tiers).map(([k, v]) => `<span class="pmlab-chip pmlab-chip-${map[k]}">${k}: ${v}</span>`).join('');
}

/* ================= ANALYZER ================= */

function renderAnalyzer(host) {
  let busy = false;
  host.innerHTML = `
    <h2 class="pmlab-title">Project Document Analyzer</h2>
    <p class="text-muted">Drag & drop project files, or browse. Supported: <strong>.xlsx .xls .csv .pdf .docx .txt</strong>. Maximum recommended file size 10–20 MB.</p>
    <p class="pmlab-privacy">🔒 ${PRIVACY}</p>
    <div class="pmlab-drop" id="pmlab-drop" tabindex="0" role="button" aria-label="Upload project documents">
      <span class="pmlab-drop-icon">📂</span>
      <p><strong>Drag & Drop files here</strong> or click to browse</p>
      <input type="file" id="pmlab-files" accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.txt" multiple hidden>
    </div>
    <div class="pmlab-filelist" id="pmlab-filelist"></div>
    <div class="pmlab-view-actions">
      <button class="btn btn-primary" id="pmlab-analyze">Analyze Documents</button>
      <button class="btn btn-outline" id="pmlab-clear">Clear</button>
    </div>
    <div id="pmlab-analyze-out" class="pmlab-analyze-out"></div>`;

  const drop = host.querySelector('#pmlab-drop');
  const input = host.querySelector('#pmlab-files');
  input.addEventListener('change', () => { addFiles(input.files); renderFileList(host); });
  ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', (e) => { addFiles(e.dataTransfer.files); renderFileList(host); });
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') input.click(); });

  host.querySelector('#pmlab-clear').addEventListener('click', () => { PM.files = []; renderFileList(host); host.querySelector('#pmlab-analyze-out').innerHTML = ''; });
  host.querySelector('#pmlab-analyze').addEventListener('click', async () => {
    const out = host.querySelector('#pmlab-analyze-out');
    if (busy) return;
    busy = true;
    out.innerHTML = '<p class="pmlab-status">Analyzing documents…</p>';
    if (!PM.files.length) { out.innerHTML = '<p class="pmlab-status warn">Add at least one file first.</p>'; busy = false; return; }
    try {
      const res = await analyzeDocuments(PM.files);
      const project = mergeExtractions(res.extractions);
      project.documents = res.docs.filter((d) => d.status === 'ok' || d.status === 'warning').map((d) => ({ name: d.name, type: d.type, size: d.size, status: d.status }));
      const seen = new Set();
      project.warnings = [...(project.warnings || []), ...res.warnings].filter((w) => !seen.has(w) && seen.add(w));
      if (!project.name && !project.tasks.length) project.warnings.push('No project fields could be extracted from these files. Try the demo or the planner instead.');
      PM.project = project;
      PMStorage.setActive(project.id);
      out.innerHTML = summaryHTML(project, res);
      const conf = host.querySelector('#pmlab-conf');
      if (conf) {
        const c = computeConfidence(res.extractions, project);
        conf.innerHTML = `<h3 class="pmlab-panel-title">Data Confidence</h3>${Object.entries(c).map(([k, v]) => `<div class="pmlab-conf-row"><span>${esc(k)}</span><span class="pmlab-conf pmlab-conf-${v.toLowerCase().replace(' ', '-')}">${esc(v)}</span></div>`).join('')}`;
      }
      bindAnalyzeOut(host);
      animateFiles(host);
    } catch (err) {
      out.innerHTML = `<p class="pmlab-status warn">Analysis failed: ${esc(err.message || 'unknown error')}</p>`;
    } finally {
      busy = false;
    }
  });
  renderFileList(host);
}

function summaryHTML(project, res) {
  const gems = (project.tasks || []).filter((t) => t.milestone).length;
  const fields = [
    ['Project Name', esc(project.name || 'Not found in uploaded documents.')],
    ['Objective', esc(project.objective || 'Not found in uploaded documents.')],
    ['Start', esc(project.startDate || 'Not found in uploaded documents.')],
    ['End', esc(project.endDate || 'Not found in uploaded documents.')],
    ['Duration', project.duration ? project.duration + ' days' : 'Not found in uploaded documents.'],
    ['Status', esc(project.status || 'Not found in uploaded documents.')],
    ['Overall Progress', project.progress != null ? project.progress + '%' : 'Not found in uploaded documents.'],
    ['Budget', project.budget != null ? fmtRp(project.budget) : 'Not found in uploaded documents.'],
    ['Team Size', (project.resources || []).length ? (project.resources || []).length + ' team member(s)' : 'Not found in uploaded documents.'],
    ['Task Count', (project.tasks || []).length],
    ['Risk Count', (project.risks || []).length],
    ['Milestone Count', gems],
  ];
  return `
    <div class="glass-card pmlab-panel">
      <h3 class="pmlab-panel-title">Project Information Summary</h3>
      <div class="pmlab-summary-grid">${fields.map(([k, v]) => `<div class="pmlab-sum-item"><span class="pmlab-sum-label">${k}</span><span class="pmlab-sum-val">${v}</span></div>`).join('')}</div>
      ${(project.warnings || []).length ? `<div class="pmlab-warnings">${project.warnings.map((w) => `<p>⚠️ ${esc(w)}</p>`).join('')}</div>` : ''}
      <div class="pmlab-grid2">
        <div id="pmlab-conf" class="pmlab-conf-box"></div>
        <div class="pmlab-conf-box">
          <h3 class="pmlab-panel-title">Recognized Skills Injected</h3>
          <p class="text-muted">Document parsing, normalization, confidence scoring, health analysis, risk simulation, and reporting — all client-side.</p>
        </div>
      </div>
    </div>
    <div class="pmlab-view-actions">
      <button class="btn btn-primary" id="pmlab-save-analyzed">💾 Save Project</button>
      <button class="btn btn-outline" id="pmlab-go-dash">Open Dashboard</button>
    </div>`;
}

function bindAnalyzeOut(host) {
  const out = host.querySelector('#pmlab-analyze-out');
  out.querySelector('#pmlab-save-analyzed')?.addEventListener('click', () => { PMStorage.save(PM.project); saveFlash('Project saved to browser storage.'); });
  out.querySelector('#pmlab-go-dash')?.addEventListener('click', () => setView('dashboard'));
}

function addFiles(fileList) {
  if (!fileList) return;
  for (const f of Array.from(fileList)) {
    if (!PM.files.some((x) => x.name === f.name && x.size === f.size)) PM.files.push(f);
  }
}

function renderFileList(host) {
  const list = host.querySelector('#pmlab-filelist');
  if (!list) return;
  if (!PM.files.length) { list.innerHTML = ''; return; }
  list.innerHTML = PM.files.map((f, i) => `<div class="pmlab-fileitem"><span class="pmlab-file-icon">📄</span><span class="pmlab-file-name">${esc(f.name)}</span><span class="text-muted">${fmtSize(f.size)} · ${esc(fileType(f.name))}</span><span class="pmlab-status ok">✓ Queued</span></div>`).join('');
}

function animateFiles(host) {
  host.querySelectorAll('.pmlab-fileitem').forEach((el) => el.classList.add('done'));
}

/* ================= PLANNER ================= */

function renderPlanner(host) {
  const templates = getTemplates();
  host.innerHTML = `
    <h2 class="pmlab-title">AI Project Planner</h2>
    <p class="text-muted">Describe the project and generate a WBS plan with tasks, owners, dependencies, milestones and risks — powered by deterministic templates (AI API optional later).</p>
    <div class="glass-card pmlab-panel pmlab-form">
      <div class="pmlab-field"><label for="plan-name">Project Name</label><input type="text" id="plan-name" class="tool-input" placeholder="e.g. Data Center Maintenance 2026"></div>
      <div class="pmlab-field"><label for="plan-objective">Project Objective</label><input type="text" id="plan-objective" class="tool-input" placeholder="e.g. Preventive maintenance for 120 racks"></div>
      <div class="pmlab-grid2">
        <div class="pmlab-field"><label for="plan-type">Project Type</label><select id="plan-type" class="tool-input">${templates.map((t) => `<option value="${t.key}">${esc(t.label)}</option>`).join('')}</select></div>
        <div class="pmlab-field"><label for="plan-duration">Duration (days)</label><input type="number" id="plan-duration" class="tool-input" value="30" min="1"></div>
      </div>
      <div class="pmlab-grid2">
        <div class="pmlab-field"><label for="plan-team">Team (comma separated)</label><input type="text" id="plan-team" class="tool-input" placeholder="e.g. Coordinator, Engineer 1, Engineer 2"></div>
        <div class="pmlab-field"><label for="plan-budget">Budget (optional)</label><input type="text" id="plan-budget" class="tool-input" placeholder="e.g. 250000000"></div>
      </div>
      <div class="pmlab-field"><label for="plan-scope">Scope / Description</label><textarea id="plan-scope" class="tool-textarea" rows="3" placeholder="What is in and out of scope?"></textarea></div>
      <div class="pmlab-view-actions">
        <button class="btn btn-primary" id="plan-generate">Generate Project Plan →</button>
      </div>
    </div>
    <div id="plan-out"></div>`;
  const types = host.querySelector('#plan-type');
  host.querySelector('#plan-name').addEventListener('input', () => {});
  host.querySelector('#plan-generate').addEventListener('click', () => {
    const input = {
      id: uid('plan'),
      name: host.querySelector('#plan-name').value.trim() || templates.find((t) => t.key === types.value).label + ' (planned)',
      objective: host.querySelector('#plan-objective').value.trim(),
      type: types.value,
      duration: parseInt(host.querySelector('#plan-duration').value, 10) || 30,
      team: host.querySelector('#plan-team').value,
      budget: host.querySelector('#plan-budget').value,
      scope: host.querySelector('#plan-scope').value.trim(),
    };
    const p = createPlannedProject(input);
    PMStorage.save(p);
    setProject(PMStorage.get(p.id));
    host.querySelector('#plan-out').innerHTML = `<p class="pmlab-status ok">✓ Project plan generated (${p.tasks.length} tasks across ${p.milestones.length} milestones). <button class="btn btn-sm btn-primary" id="plan-go">Open Dashboard</button></p>`;
    host.querySelector('#plan-go')?.addEventListener('click', () => setView('dashboard'));
  });
}

/* ================= HEALTH ================= */

function renderHealth(host) {
  const project = PM.project;
  if (!project) { emptyState(host, 'Load a project to analyze health.', [['Use Demo Project', 'home']]); return; }
  const health = computeHealth(project);
  const d = health.dimensions;
  host.innerHTML = `
    ${projectBar(project, health)}
    <div class="pmlab-gauge-row">
      <div class="pmlab-gauge pmlab-gauge-${health.status.toLowerCase()}">
        <span class="pmlab-gauge-value">${health.overall}</span>
        <span class="pmlab-gauge-max">/ 100</span>
        <span class="pmlab-gauge-label">PROJECT HEALTH · ${health.status}</span>
      </div>
      <div class="glass-card pmlab-panel pmlab-wide">
        <h3 class="pmlab-panel-title">Dimensions</h3>
        <div id="pmlab-dim-bars"></div>
      </div>
    </div>
    <div class="pmlab-grid2">
      <div class="glass-card pmlab-panel">
        <h3 class="pmlab-panel-title">Why this score? (Rules)</h3>
        <ul class="pmlab-rules">${health.rationale.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        <ul class="pmlab-rules">
          <li>Schedule variance &gt; 20% → heavy penalty</li>
          <li>Overdue tasks &gt; 4 → heavy penalty</li>
          <li>Critical risks (score ≥ 15) → strong risk penalty</li>
          <li>Budget actual vs earned value &gt; 15% → red</li>
        </ul>
      </div>
      <div class="glass-card pmlab-panel">
        <h3 class="pmlab-panel-title">Recommended Actions</h3>
        <ol class="pmlab-rules">${health.execSummary.recommendations.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
      </div>
    </div>`;
  drawDimensionBars(host, d);
  const bar = host.querySelector('#pmlab-dim-bars');
  if (bar) bar.querySelectorAll('.pmlab-bar-row').forEach((r) => { const v = parseInt(r.dataset.v, 10); r.querySelector('.pmlab-bar-fill').style.width = v + '%'; r.querySelector('.pmlab-bar-score').textContent = v + '/100'; });
}

/* ================= RISK ================= */

function renderRisk(host) {
  const project = ensureDemo();
  host.innerHTML = `
    <h2 class="pmlab-title">Risk Simulator</h2>
    <p class="text-muted">Score probability × impact (1–5). See the risk before and after mitigation.</p>
    <div class="glass-card pmlab-panel pmlab-form">
      <div class="pmlab-field"><label for="risk-desc">Risk Description</label><input type="text" id="risk-desc" class="tool-input" placeholder="e.g. Vendor delivery delayed"></div>
      <div class="pmlab-grid2">
        <div class="pmlab-field"><label for="risk-cat">Category</label><select id="risk-cat" class="tool-input">${['Technical', 'Schedule', 'Cost', 'Resource', 'Vendor', 'Security', 'Operational', 'Stakeholder'].map((c) => `<option>${c}</option>`).join('')}</select></div>
        <div class="pmlab-field"><label for="risk-response">Response</label><select id="risk-response" class="tool-input">${['Mitigate', 'Avoid', 'Transfer', 'Accept'].map((c) => `<option>${c}</option>`).join('')}</select></div>
      </div>
      <div class="pmlab-grid3">
        <div class="pmlab-field"><label for="risk-p">Probability (1–5)</label><input type="number" id="risk-p" class="tool-input" value="4" min="1" max="5"></div>
        <div class="pmlab-field"><label for="risk-i">Impact (1–5)</label><input type="number" id="risk-i" class="tool-input" value="4" min="1" max="5"></div>
        <div class="pmlab-field"><label for="risk-afterP">After Probability</label><input type="number" id="risk-afterP" class="tool-input" value="2" min="1" max="5"></div>
      </div>
      <div class="pmlab-grid3">
        <div class="pmlab-field"><label for="risk-afterI">After Impact</label><input type="number" id="risk-afterI" class="tool-input" value="2" min="1" max="5"></div>
        <div class="pmlab-field"><label for="risk-owner">Owner</label><input type="text" id="risk-owner" class="tool-input" placeholder="Owner"></div>
        <div class="pmlab-field"><label for="risk-mit">Mitigation</label><input type="text" id="risk-mit" class="tool-input" placeholder="Mitigation"></div>
      </div>
      <div class="pmlab-view-actions">
        <button class="btn btn-primary" id="risk-eval">Evaluate & Add to Register</button>
      </div>
      <div id="risk-result"></div>
    </div>
    <div class="glass-card pmlab-panel">
      <h3 class="pmlab-panel-title">Risk Register (current project)</h3>
      <div id="risk-register"></div>
    </div>`;

  host.querySelector('#risk-eval').addEventListener('click', () => {
    const get = (id) => host.querySelector('#' + String(id).replace(/^#/, ''));
    const risk = {
      id: uid('r'),
      description: get('#risk-desc').value.trim() || 'Untitled risk',
      probability: clamp5(get('#risk-p').value),
      impact: clamp5(get('#risk-i').value),
      category: get('#risk-cat').value,
      response: get('#risk-response').value,
      owner: get('#risk-owner').value.trim(),
      mitigation: get('#risk-mit').value.trim(),
      afterProbability: clamp5(get('#risk-afterP').value),
      afterImpact: clamp5(get('#risk-afterI').value),
      status: 'Open',
    };
    const evalR = evaluateRisk(risk);
    const out = host.querySelector('#risk-result');
    out.innerHTML = riskResultHTML(risk, evalR);
    if (!project.risks) project.risks = [];
    project.risks.push({ ...risk, score: risk.probability * risk.impact });
    renderRiskRegister(host);
  });
  renderRiskRegister(host);
}

function renderRiskRegister(host) {
  const project = PM.project || ensureDemo();
  const box = host.querySelector('#risk-register');
  if (!box) return;
  const rows = (project.risks || []).map((r) => {
    const e = evaluateRisk(r);
    return `<div class="pmlab-risk-item">
      <div class="pmlab-risk-head"><strong>${esc(r.description)}</strong><span class="pmlab-tag pmlab-tag-${toneOf(e.before.tier)}">${e.before.tier} ${e.before.score}</span></div>
      <div class="pmlab-risk-sub">${esc(r.category)} · ${esc(r.owner || 'no owner')} · response ${esc(r.response)}</div>
      <div class="pmlab-risk-red">Before ${e.before.probability}×${e.before.impact}=${e.before.score} → After ${e.after.probability}×${e.after.impact}=${e.after.score} → <strong>Reduction ${e.reduction}%</strong></div>
    </div>`;
  }).join('');
  box.innerHTML = rows || '<p class="text-muted">No risks registered. Add one above.</p>';
}

function riskResultHTML(risk, e) {
  return `<div class="pmlab-risk-result">
    <div class="pmlab-risk-col"><h4>BEFORE MITIGATION</h4><p>Probability: ${e.before.probability}</p><p>Impact: ${e.before.impact}</p><p class="pmlab-big ${toneOf(e.before.tier)}">${e.before.score} ${e.before.tier}</p></div>
    <div class="pmlab-risk-arrow">→</div>
    <div class="pmlab-risk-col"><h4>AFTER MITIGATION</h4><p>Probability: ${e.after.probability}</p><p>Impact: ${e.after.impact}</p><p class="pmlab-big ${toneOf(e.after.tier)}">${e.after.score} ${e.after.tier}</p></div>
    <div class="pmlab-risk-red-box"><strong>Risk Reduction: ${e.reduction}%</strong><p class="text-muted">Suggested response: ${suggestedResponse(risk.category, e.before.score)}</p></div>
  </div>`;
}

/* ================= SCENARIO ================= */

function renderScenario(host) {
  const scenarios = getScenarioList();
  host.innerHTML = `
    <h2 class="pmlab-title">PM Scenario Lab</h2>
    <p class="text-muted">Pick a realistic situation and decide. There is no single correct answer — every option trades off schedule, cost, risk, quality and stakeholders.</p>
    <div class="pmlab-field"><label for="scenario-sel">Scenario</label><select id="scenario-sel" class="tool-input pmlab-select-wide">${scenarios.map((s) => `<option value="${s.id}">${esc(s.category)} — ${esc(s.title)}</option>`).join('')}</select></div>
    <div id="scenario-box"></div>`;
  const sel = host.querySelector('#scenario-sel');
  sel.addEventListener('change', () => { PM.scenarioId = sel.value; renderScenarioBox(host); });
  renderScenarioBox(host);
}

function renderScenarioBox(host) {
  const box = host.querySelector('#scenario-box');
  const scenario = getScenario(PM.scenarioId) || getScenarioList()[0] && getScenario(getScenarioList()[0].id);
  if (!scenario) return;
  box.innerHTML = `
    <div class="glass-card pmlab-panel">
      <h3 class="pmlab-panel-title">SCENARIO: ${esc(scenario.title)}</h3>
      <p class="text-muted">Day ${scenario.day}/${scenario.total} · Progress ${scenario.progress}% · Planned ${scenario.planned}%</p>
      <p class="pmlab-situation">${esc(scenario.situation)}</p>
      <h4 class="pmlab-panel-sub">What should the Project Coordinator do?</h4>
      <div class="pmlab-options">
        ${scenario.options.map((o) => `<button class="pmlab-option btn btn-outline" data-opt="${o.key}">${esc(o.label)}</button>`).join('')}
      </div>
      <div id="scenario-decision"></div>
      <p class="text-muted pmlab-note">⚠️ This simulator evaluates trade-offs, not a single “correct” PM answer.</p>
    </div>`;
  box.querySelectorAll('.pmlab-option').forEach((b) => b.addEventListener('click', () => {
    const res = evaluateScenario(scenario, b.dataset.opt);
    if (!res) return;
    const max = res.best || 1;
    box.querySelector('#scenario-decision').innerHTML = `
      <h4 class="pmlab-panel-sub">DECISION ANALYSIS — ${res.rating}</h4>
      <div class="pmlab-impacts">
        ${res.impacts.map((im) => `
          <div class="pmlab-impact">
            <span class="pmlab-impact-label">${esc(im.label)}</span>
            <div class="pmlab-impact-bar"><div class="pmlab-impact-fill ${im.value >= 0 ? 'pos' : 'neg'}" style="width:${Math.abs(im.value) / 3 * 100}%"></div></div>
            <span class="pmlab-impact-val ${im.value >= 0 ? 'pos' : 'neg'}">${im.value >= 0 ? '+' : ''}${im.value}</span>
          </div>`).join('')}
      </div>
      <p><strong>Decision Score: ${res.total}/10</strong> — evaluated as <span class="pmlab-tag ${res.rating === 'Recommended' ? 'pmlab-tag-green' : res.rating === 'Acceptable' ? 'pmlab-tag-amber' : 'pmlab-tag-red'}">${res.rating}</span></p>
      <p class="pmlab-situation">Trade-off: ${esc(res.option.tradeOffs)}</p>`;
    box.querySelectorAll('.pmlab-option').forEach((x) => x.classList.remove('chosen'));
    b.classList.add('chosen');
  }));
}

/* ================= REPORTS ================= */

function renderReports(host) {
  const project = PM.project;
  if (!project) { emptyState(host, 'Load a project to generate a report.', [['Use Demo Project', 'home']]); return; }
  const health = computeHealth(project);
  host.innerHTML = `
    ${projectBar(project, health)}    
    <div class="glass-card pmlab-panel">
      <h3 class="pmlab-panel-title">Executive Project Summary</h3>
      <div class="pmlab-exec">
        <p><strong>PROJECT STATUS:</strong> <span class="pmlab-tag pmlab-tag-${health.status.toLowerCase()}">${health.status}</span></p>
        <div class="pmlab-exec-grid">
          ${execRow('Overall Progress', project.progress != null ? project.progress + '%' : 'n/a')}
          ${execRow('Schedule', health.execSummary.scheduleNote)}
          ${execRow('Budget', health.execSummary.budgetNote)}
          ${execRow('Top Risk', health.execSummary.topRisks.length ? health.execSummary.topRisks[0] : 'n/a')}
          ${execRow('Top Issue', health.execSummary.topIssues.length ? health.execSummary.topIssues[0] : 'n/a')}
          ${execRow('Next Milestone', health.execSummary.nextMilestone || 'n/a')}
        </div>
      </div>
    </div>
    <div class="pmlab-view-actions">
      <button class="btn btn-primary" id="pmlab-gen-report">Generate PM Report</button>
      <button class="btn btn-outline" id="pmlab-print">Print / Save as PDF</button>
      <button class="btn btn-outline" id="pmlab-exp-json">Export Project JSON</button>
      <button class="btn btn-outline" id="pmlab-exp-csv">Export Task CSV</button>
      <button class="btn btn-outline" id="pmlab-exp-xlsx">Export Excel</button>
    </div>
    <div id="pmlab-report-preview"></div>
    <div class="pmlab-view-actions">
      <button class="btn btn-primary" id="pmlab-save2">💾 Save Project</button>
    </div>`;
  host.querySelector('#pmlab-save2').addEventListener('click', () => { PMStorage.save(project); saveFlash('Project saved.'); });
  host.querySelector('#pmlab-print').addEventListener('click', () => {
    const html = buildReportHTML(project, health);
    document.getElementById('pmlab-report-print').innerHTML = html;
    window.print();
  });
  host.querySelector('#pmlab-exp-json').addEventListener('click', () => exportProjectJSON(project));
  host.querySelector('#pmlab-exp-csv').addEventListener('click', () => exportTasksCSV(project));
  host.querySelector('#pmlab-exp-xlsx').addEventListener('click', async () => {
    await loadLib('xlsx').catch(() => {});
    const res = exportTasksXLSX(project);
    if (res !== 'ok') saveFlash(res);
  });
  host.querySelector('#pmlab-gen-report').addEventListener('click', () => {
    const preview = host.querySelector('#pmlab-report-preview');
    PM.reportHtml = buildReportHTML(project, health);
    preview.innerHTML = PM.reportHtml;
    document.getElementById('pmlab-report-print').innerHTML = PM.reportHtml;
  });
}

/* ================= SHARED ================= */

function projectBar(project, health) {
  return `<div class="glass-card pmlab-projectbar">
    <div class="pmlab-projectbar-name"><h2>${esc(project.name || 'Untitled Project')}</h2>
      <p class="text-muted">${esc(project.status || 'n/a')} · ${project.startDate || '—'} → ${project.endDate || '—'} · ${project.duration ? project.duration + ' days' : ''}</p>
    </div>
    <div class="pmlab-projectbar-health">
      <span class="pmlab-tag pmlab-tag-${health.status.toLowerCase()}">${health.status} ${health.overall}/100</span>
      <div class="pmlab-minibar"><div class="pmlab-minibar-fill" style="width:${health.overall}%"></div></div>
    </div>
  </div>`;
}

function milestoneList(project) {
  const ms = project.milestones || [];
  if (!ms.length) return '<p class="text-muted">No milestones.</p>';
  return ms.map((m) => `<div class="pmlab-milestone"><span class="pmlab-dot pmlab-dot-${m.status === 'Completed' ? 'done' : m.status === 'Delayed' ? 'late' : 'up'}"></span><span>${esc(m.name)}</span><span class="text-muted">${esc(m.dueDate || '—')}</span><span class="pmlab-chip pmlab-chip-${m.status === 'Completed' ? 'green' : m.status === 'Delayed' ? 'red' : 'accent'}">${esc(m.status)}</span></div>`).join('');
}

function emptyState(host, msg, buttons) {
  host.innerHTML = `<div class="glass-card pmlab-panel pmlab-empty"><h3>${esc(msg)}</h3><div class="pmlab-view-actions">${buttons.map(([label, view]) => `<button class="btn btn-primary" data-goto="${view}">${esc(label)}</button>`).join('')}</div></div>`;
  host.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.goto)));
}

function drawTaskChart(host, project) {
  const wrap = host.querySelector('#pmlab-task-chart');
  if (!wrap) return;
  if (!window.Chart) return;
  wrap.innerHTML = '<canvas></canvas>';
  const c = countTasks(project);
  const keys = Object.keys(c).filter((k) => c[k] > 0);
  const chart = new Chart(wrap.querySelector('canvas'), {
    type: 'bar',
    data: { labels: keys, datasets: [{ label: 'Tasks', data: keys.map((k) => c[k]), backgroundColor: keys.map(taskColor) }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
  });
  PM.charts.push(chart);
}

function drawRiskChart(host, project) {
  const wrap = host.querySelector('#pmlab-risk-chart');
  if (!wrap) return;
  if (!window.Chart) return;
  wrap.innerHTML = '<canvas></canvas>';
  const tiers = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  (project.risks || []).forEach((r) => { tiers[tierOf(r.score)]++; });
  const keys = Object.keys(tiers).filter((k) => tiers[k] > 0);
  const chart = new Chart(wrap.querySelector('canvas'), {
    type: 'doughnut',
    data: { labels: keys, datasets: [{ data: keys.map((k) => tiers[k]), backgroundColor: keys.map((k) => ({ Critical: '#fb7185', High: '#fbbf24', Medium: '#e879f9', Low: '#86efac' }[k])) }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
  });
  PM.charts.push(chart);
}

function destroyCharts() {
  if (!window.Chart) { PM.charts = []; return; }
  PM.charts.forEach((ch) => { try { ch.destroy(); } catch (e) {} });
  PM.charts = [];
}

function taskColor(status) {
  return { Completed: '#86efac', 'In Progress': '#e879f9', Blocked: '#fb7185', Overdue: '#fbbf24', 'Not Started': '#b09cc4', 'On Hold': '#a855f7' }[status] || '#b09cc4';
}

function progressBar(val, label, tone) {
  return `<div class="pmlab-pbar"><div class="pmlab-pbar-label">${esc(label)} — ${val}%</div><div class="pmlab-pbar-track"><div class="pmlab-pbar-fill pmlab-pbar-${tone}" style="width:${Math.max(0, Math.min(100, val))}%"></div></div></div>`;
}

function barRow(key, val) {
  return `<div class="pmlab-bar-row" data-v="${val}"><span class="pmlab-bar-label">${esc(key)}</span><span class="pmlab-bar-track"><span class="pmlab-bar-fill pmlab-bar-${barColor(val)}" style="width:${val}%"></span><span class="pmlab-bar-score">${val}/100</span></span></div>`;
}

function ensureBar(project) {
  if (!project.tasks) project.tasks = [];
  if (!project.risks) project.risks = [];
  if (!project.milestones) project.milestones = [];
  if (!project.issues) project.issues = [];
}

function execRow(k, v) { return `<div><strong>${esc(k)}:</strong> ${esc(v)}</div>`; }

function fmtRp(n) { return 'Rp' + Number(n || 0).toLocaleString('id-ID'); }
function fmtSize(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
function fileType(name) { const p = String(name || '').split('.'); return p.length > 1 ? p.pop().toUpperCase() : ''; }
function clamp5(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(1, Math.min(5, Math.round(n))) : 1; }
function esc(s) { const d = document.createElement('div'); d.appendChild(document.createTextNode(String(s == null ? '' : s))); return d.innerHTML; }
function toneOf(tier) { return tier === 'Critical' ? 'red' : tier === 'High' ? 'amber' : tier === 'Medium' ? 'accent' : 'green'; }

function saveFlash(msg) {
  const el = document.createElement('div');
  el.className = 'pmlab-flash';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

window.PMLab = { boot, setView, getProject, setProject, ensureDemo, loadDemo, PRIVACY, version: 'v2' };

document.addEventListener('DOMContentLoaded', boot);