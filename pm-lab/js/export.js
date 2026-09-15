export function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime || 'application/octet-stream' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function exportProjectJSON(project) {
  download(safeName(project) + '-project.json', JSON.stringify(project, null, 2), 'application/json');
}

export function exportTasksCSV(project) {
  const cols = ['ID', 'Task', 'Owner', 'Status', 'Priority', 'Start Date', 'End Date', 'Duration', 'Progress %', 'Dependency', 'Milestone'];
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const rows = (project.tasks || []).map((t) => cols.map((c) => { const m = { ID: t.id, Task: t.name, Owner: t.owner, Status: t.status, Priority: t.priority, 'Start Date': t.startDate, 'End Date': t.endDate, Duration: t.duration, 'Progress %': t.progress, Dependency: t.dependency, Milestone: t.milestone ? 'Yes' : '' }; return m[c]; }).map(esc).join(','));
  const csv = [cols.map((c) => esc(c)).join(','), ...rows].join('\n');
  download(safeName(project) + '-tasks.csv', csv, 'text/csv;charset=utf-8');
}

export function exportTasksXLSX(project) {
  if (!window.XLSX) return 'No XLSX runtime loaded.';
  const wb = window.XLSX.utils.book_new();
  const ws = window.XLSX.utils.json_to_sheet((project.tasks || []).map((t) => ({
    ID: t.id, Task: t.name, Owner: t.owner, Status: t.status, Priority: t.priority,
    'Start Date': t.startDate, 'End Date': t.endDate, Duration: t.duration, 'Progress %': t.progress,
    Dependency: t.dependency, Milestone: t.milestone ? 'Yes' : '',
  })));
  window.XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
  window.XLSX.writeFile(wb, safeName(project) + '-tasks.xlsx');
  return 'ok';
}

export function buildReportHTML(project, health) {
  const d = health ? health.dimensions : {};
  const pct = (n) => (n != null ? n.toFixed(1) + '%' : 'n/a');
  const num = (n) => (n != null ? Number(n).toLocaleString('id-ID') : 'n/a');
  const riskRows = (project.risks || []).map((r) => `<tr><td>${esc(r.description)}</td><td>${r.probability} x ${r.impact}</td><td>${esc(r.category)}</td><td>${esc(r.owner)}</td><td>${esc(r.mitigation || '-')}</td></tr>`).join('');
  return `
    <div class="pmlab-report-doc">
      <h1>Project Report — ${esc(project.name || 'Untitled')}</h1>
      <p class="pmlab-report-meta">Generated ${new Date().toLocaleString('en-GB')}</p>

      <h2>Project Overview</h2>
      <table class="pmlab-report-table"><tbody>
        <tr><th>Status</th><td>${esc(project.status || 'n/a')} (Health: ${health ? health.status : 'n/a'} ${health ? health.overall + '/100' : ''})</td></tr>
        <tr><th>Objective</th><td>${esc(project.objective || '—')}</td></tr>
        <tr><th>Dates</th><td>${esc(project.startDate || '—')} → ${esc(project.endDate || '—')} (${project.duration || 'n/a'} days)</td></tr>
        <tr><th>Progress</th><td>${pct(project.progress)} (planned ${pct(project.plannedProgress)})</td></tr>
        <tr><th>Budget</th><td>${num(project.budget)} / Actual ${num(project.actualCost)}</td></tr>
        <tr><th>Team</th><td>${esc((project.resources || []).map((r) => r.name).join(', ') || 'n/a')}</td></tr>
      </tbody></table>

      <h2>Project Health</h2>
      <table class="pmlab-report-table"><tbody>
        ${['schedule', 'budget', 'scope', 'risk', 'resource', 'quality'].map((k) => `<tr><th>${cap(k)}</th><td>${d[k] != null ? d[k] + '/100' : 'n/a'}</td></tr>`).join('')}
        <tr><th>Overall</th><td><strong>${health ? health.overall + '/100 (' + health.status + ')' : 'n/a'}</strong></td></tr>
      </tbody></table>

      <h2>Task Summary</h2>
      <p>${health && health.counts ? `${health.counts.completed} completed / ${health.counts.inProgress} in progress / ${health.counts.overdue} overdue / ${health.counts.blocked} blocked / ${health.counts.notStarted} not started (total ${(project.tasks || []).length})` : `${(project.tasks || []).length} task(s)`}</p>
      <table class="pmlab-report-table"><tbody>
        ${(project.tasks || []).slice(0, 40).map((t) => `<tr><td>${esc(t.name)}</td><td>${esc(t.owner || '—')}</td><td>${esc(t.status)}</td><td>${esc(t.startDate || '—')}</td><td>${esc(t.endDate || '—')}</td><td>${t.progress != null ? t.progress + '%' : '—'}</td></tr>`).join('')}
      </tbody></table>

      <h2>Milestones</h2>
      <ul>${(project.milestones || []).map((m) => `<li>${esc(m.dueDate || '—')} — <strong>${esc(m.name)}</strong> (${esc(m.status)})</li>`).join('')}</ul>

      <h2>Risks</h2>
      <table class="pmlab-report-table"><tbody>${riskRows || '<tr><td>No risks registered.</td></tr>'}</tbody></table>

      <h2>Issues</h2>
      <ul>${(project.issues || []).map((i) => `<li><strong>${esc(i.priority || '')}</strong> ${esc(i.title || i.description)} — ${esc(i.status || 'Open')}</li>`).join('') || '<li>No open issues.</li>'}</ul>

      <h2>Recommendations & Next Actions</h2>
      <ol>${(health && health.execSummary.recommendations || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
    </div>
  `;
}

function esc(s) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(s == null ? '' : s)));
  return d.innerHTML;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function safeName(p) { return String(p.name || 'project').replace(/[^a-z0-9_-]/gi, '_').slice(0, 40); }