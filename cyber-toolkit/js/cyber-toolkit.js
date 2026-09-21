import { initAllTools } from './tools/index.js?v=1';

const VIEWS = ['home', 'password', 'log', 'phishing', 'port', 'vuln', 'packet'];

const TOOL_CARDS = [
  ['password', '🔑', 'Password Strength', 'Check entropy & common patterns, or generate a secure password.'],
  ['log', '📜', 'Log Analyzer', 'Detect SSH brute-force attempts and directory scanning in logs.'],
  ['phishing', '🎣', 'Phishing URL Detector', 'Heuristic analysis of URLs for phishing indicators.'],
  ['port', '🌐', 'Port Scanner', 'Educational demo scan of common ports on a target.'],
  ['vuln', '⚠️', 'CVE Scanner', 'Search the NVD API for known CVEs of a software & version.'],
  ['packet', '📡', 'Packet Sniffer Guide', 'How the Scapy-based sniffer works & how to run it.'],
];

const PRIVACY = 'Tool yang bisa berjalan di browser dijalankan client-side. Gunakan hanya untuk target yang Anda miliki.';

export function boot() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.dataset.theme = savedTheme;
  const tb = document.getElementById('cytk-theme');
  if (tb) {
    tb.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    tb.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
      tb.textContent = next === 'dark' ? '🌙' : '☀️';
    });
  }
  document.querySelectorAll('#cytk-sidebar [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
  renderView('home');
  initAllTools();
}

export function setView(view) {
  if (!VIEWS.includes(view)) view = 'home';
  renderView(view);
}

function renderView(view) {
  document.querySelectorAll('#cytk-sidebar [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.cytk-view').forEach((s) => s.classList.toggle('active', s.id === 'view-' + view));
  const host = document.getElementById('view-' + view);
  if (!host) return;
  if (view === 'home') renderHome(host);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHome(host) {
  host.innerHTML = `
    <div class="cytk-hero">
      <h1 class="cytk-hero-title">Cybersecurity Toolkit</h1>
      <p class="cytk-hero-sub">Web port dari proyek CLI Python — password security, security log analysis, phishing detection, vulnerability lookup, dan panduan network scanning.</p>
      <p class="text-muted" style="font-size:0.78rem">🔒 ${PRIVACY}</p>
    </div>
    <div class="cytk-cards">
      ${TOOL_CARDS.map(([view, icon, title, desc]) => `
        <button class="cytk-card glass-card" data-view="${view}">
          <span class="cytk-card-icon">${icon}</span>
          <h3>${esc(title)}</h3>
          <p class="text-muted">${esc(desc)}</p>
        </button>`).join('')}
    </div>`;
  host.querySelectorAll('.cytk-card[data-view]').forEach((c) => c.addEventListener('click', () => setView(c.dataset.view)));
}

function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

boot();