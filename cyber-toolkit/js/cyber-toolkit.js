import { initAllTools } from './tools/index.js?v=1';

const VIEWS = ['home', 'password', 'log', 'phishing', 'port', 'vuln', 'packet'];

const TOOL_CARDS = [
  ['password', 'Password Strength', 'Entropy check + secure generator.'],
  ['log', 'Log Analyzer', 'Spot brute-force & scans in logs.'],
  ['phishing', 'Phishing URL Detector', 'Score URLs for phishing signs.'],
  ['port', 'Port Scanner', 'Demo scan of common ports.'],
  ['vuln', 'CVE Scanner', 'CVEs by software & version.'],
  ['packet', 'Packet Sniffer Guide', 'Capture packets with Scapy — setup & how it works.'],
];

const PRIVACY = 'Client-side only. Test only systems you may test.';

export function boot() {
  // Dark-only site.
  document.documentElement.dataset.theme = 'dark';
  try { localStorage.removeItem('theme'); } catch {}
  document.querySelectorAll('#cytk-sidebar [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
  renderView('home');
  initAllTools();
  // Sub-tab switching (password check/generate) scoped per tool card.
  document.querySelectorAll('.sub-tabs').forEach((bar) => {
    const card = bar.closest('.tool-card') || document;
    bar.querySelectorAll('.sub-tab').forEach((tab) => tab.addEventListener('click', () => {
      bar.querySelectorAll('.sub-tab').forEach((t) => t.classList.remove('active'));
      card.querySelectorAll('.sub-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      const pane = card.querySelector('#' + tab.dataset.sub);
      if (pane) pane.classList.add('active');
    }));
  });
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
      <p class="cytk-hero-sub">Password, log, phishing, CVE & network tools — in your browser.</p>
      <p class="text-muted" style="font-size:0.78rem">${PRIVACY}</p>
    </div>
    <div class="cytk-cards">
      ${TOOL_CARDS.map(([view, title, desc]) => `
        <button class="cytk-card glass-card" data-view="${view}">
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