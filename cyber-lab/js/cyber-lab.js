import { initAllTools } from './tools/index.js?v=1';

const VIEWS = ['home', 'dns', 'headers', 'jwt', 'enum', 'as', 'repeater', 'csrf'];

const TOOL_CARDS = [
  ['dns', '🔍', 'DNS Lookup', 'Network recon: query A, AAAA, MX, NS, TXT, CNAME, SOA records.'],
  ['headers', '🌐', 'Security Headers', 'Scan missing HTTP security headers, get a grade (A-F) and recommendations.'],
  ['jwt', '🔐', 'JWT & Hash Inspector', 'Decode JWT tokens and identify 30+ hash algorithms.'],
  ['enum', '🔎', 'Enumeration', 'Discover subdomains and scan common directories on a target.'],
  ['as', '📡', 'Attack Surface', 'Scan 12 common HTTP/HTTPS ports with pentest guidance + mitigations.'],
  ['repeater', '🧪', 'HTTP Repeater', 'Craft custom requests + auto-fuzz potential IDOR vulnerabilities.'],
  ['csrf', '🌊', 'CSRF PoC Generator', 'Generate HTML proof-of-concept forms for CSRF testing.'],
];

const PRIVACY = 'Semua tool berjalan di browser (client-side). Gunakan hanya untuk target yang Anda miliki.';

export function boot() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.dataset.theme = savedTheme;
  const tb = document.getElementById('cylab-theme');
  if (tb) {
    tb.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    tb.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
      tb.textContent = next === 'dark' ? '🌙' : '☀️';
    });
  }
  document.querySelectorAll('#cylab-sidebar [data-view]').forEach((btn) => {
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
  document.querySelectorAll('#cylab-sidebar [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.cylab-view').forEach((s) => s.classList.toggle('active', s.id === 'view-' + view));
  const host = document.getElementById('view-' + view);
  if (!host) return;
  if (view === 'home') renderHome(host);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHome(host) {
  host.innerHTML = `
    <div class="cylab-hero">
      <h1 class="cylab-hero-title">Cyber Security Lab</h1>
      <p class="cylab-hero-sub">Advanced penetration testing tools for reconnaissance, web app security, enumeration, request crafting, and exploitation testing.</p>
      <p class="text-muted" style="font-size:0.78rem">🔒 ${PRIVACY}</p>
    </div>
    <div class="cylab-cards">
      ${TOOL_CARDS.map(([view, icon, title, desc]) => `
        <button class="cylab-card glass-card" data-view="${view}">
          <span class="cylab-card-icon">${icon}</span>
          <h3>${esc(title)}</h3>
          <p class="text-muted">${esc(desc)}</p>
        </button>`).join('')}
    </div>`;
  host.querySelectorAll('.cylab-card[data-view]').forEach((c) => c.addEventListener('click', () => setView(c.dataset.view)));
}

function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

boot();