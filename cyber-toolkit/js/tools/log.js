import { escapeHtml } from './shared.js?v=1';

const FAILED_SSH_PATTERN = /Failed password.*from (\d+\.\d+\.\d+\.\d+)/;
const ACCESS_LOG_PATTERN = /(\d+\.\d+\.\d+\.\d+).*\[(.*?)\].*"(\w+) (\S+) HTTP.*" (\d+)/;

const BRUTE_FORCE_THRESHOLD = 5;
const SCAN_THRESHOLD = 20;

function analyzeSSHLog(lines) {
  const failed = new Map();
  for (const line of lines) {
    const m = FAILED_SSH_PATTERN.exec(line);
    if (m) failed.set(m[1], (failed.get(m[1]) || 0) + 1);
  }
  if (failed.size === 0) return '<p class="text-muted">Tidak ada pola failed SSH login ditemukan.</p>';
  const sorted = [...failed.entries()].sort((a, b) => b[1] - a[1]);
  return `
    <p class="dns-header">SSH Failed Login Analysis</p>
    <div class="hdr-list">
      ${sorted.map(([ip, count]) => `
        <div class="hdr-row ${count > BRUTE_FORCE_THRESHOLD ? 'hdr-miss' : ''}">
          <span class="hdr-name">${escapeHtml(ip)}</span>
          <span class="hdr-val">failed attempts: ${count}${count > BRUTE_FORCE_THRESHOLD ? ' <b>← SUSPICIOUS (possible brute force)</b>' : ''}</span>
        </div>`).join('')}
    </div>`;
}

function analyzeAccessLog(lines) {
  const ipRequests = new Map();
  const ip404 = new Map();
  const statusCounter = new Map();

  for (const line of lines) {
    const m = ACCESS_LOG_PATTERN.exec(line);
    if (!m) continue;
    const ip = m[1];
    const status = m[5];
    ipRequests.set(ip, (ipRequests.get(ip) || 0) + 1);
    statusCounter.set(status, (statusCounter.get(status) || 0) + 1);
    if (status === '404') ip404.set(ip, (ip404.get(ip) || 0) + 1);
  }
  if (ipRequests.size === 0) return null;

  const topIPs = [...ipRequests.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const statuses = [...statusCounter.entries()].sort((a, b) => b[1] - a[1]);
  const suspicious = [...ip404.entries()].filter(([, c]) => c > SCAN_THRESHOLD).sort((a, b) => b[1] - a[1]);

  return `
    <p class="dns-header">Web Access Log Analysis</p>
    <p class="text-muted" style="margin:0 0 0.35rem">Top 5 IP paling aktif:</p>
    <div class="hdr-list">
      ${topIPs.map(([ip, count]) => `
        <div class="hdr-row"><span class="hdr-name">${escapeHtml(ip)}</span><span class="hdr-val">${count} requests</span></div>`).join('')}
    </div>
    <p class="text-muted" style="margin:0 0 0.35rem">Status code distribution:</p>
    <div class="hdr-list">
      ${statuses.map(([status, count]) => `
        <div class="hdr-row"><span class="hdr-name" style="min-width:80px">${escapeHtml(status)}</span><span class="hdr-val">${count}</span></div>`).join('')}
    </div>
    <p class="text-muted" style="margin:0 0 0.35rem">Potensi directory/vulnerability scanning (banyak 404):</p>
    <div class="hdr-list">
      ${suspicious.length
        ? suspicious.map(([ip, count]) => `
            <div class="hdr-row hdr-miss"><span class="hdr-name">${escapeHtml(ip)}</span><span class="hdr-val">${count} × 404 <b>← SUSPICIOUS</b></span></div>`).join('')
        : '<div class="hdr-row"><span class="hdr-val">Tidak ada IP mencurigakan.</span></div>'}
    </div>`;
}

export function initLogAnalyzer() {
  const area = document.getElementById('log-input');
  const btn = document.getElementById('log-analyze');
  const result = document.getElementById('log-result');
  if (!area || !btn || !result) return;

  btn.addEventListener('click', () => {
    const text = area.value;
    if (!text.trim()) { result.innerHTML = '<p class="text-warning">Tempel isi log terlebih dahulu.</p>'; return; }
    const lines = text.split(/\r?\n/);
    result.innerHTML = `<p class="text-muted" style="margin-bottom:0.5rem">Menganalisis ${lines.length} baris log...</p>`;
    const accessHtml = analyzeAccessLog(lines);
    if (accessHtml) {
      result.innerHTML += accessHtml;
    } else {
      result.innerHTML += analyzeSSHLog(lines);
    }
  });
}