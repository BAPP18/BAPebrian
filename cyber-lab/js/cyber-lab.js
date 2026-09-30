import { initAllTools } from './tools/index.js?v=1';

const VIEWS = ['home', 'dns', 'headers', 'jwt', 'enum', 'as', 'repeater', 'csrf'];

const TOOL_CARDS = [
  ['dns', 'DNS Lookup', 'Query A, AAAA, MX, NS, TXT, CNAME, SOA.'],
  ['headers', 'Security Headers', 'Grade a site\u2019s HTTP headers, A\u2013F.'],
  ['jwt', 'JWT & Hash Inspector', 'Decode JWTs, identify 30+ hashes.'],
  ['enum', 'Enumeration', 'Find subdomains & hidden paths.'],
  ['as', 'Attack Surface', 'Scan 12 ports + hardening tips.'],
  ['repeater', 'HTTP Repeater', 'Send requests, fuzz for IDOR.'],
  ['csrf', 'CSRF PoC Generator', 'Build CSRF proof-of-concept forms.'],
];

const PRIVACY = 'Runs 100% in your browser. Only test systems you own or may test.';

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
      <p class="cylab-hero-sub">Hands-on browser tools for security testing.</p>
      <p class="text-muted" style="font-size:0.78rem">${PRIVACY}</p>
    </div>
    <div class="cylab-cards">
      ${TOOL_CARDS.map(([view, title, desc]) => `
        <button class="cylab-card glass-card" data-view="${view}">
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