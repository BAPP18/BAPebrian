import { escapeHtml } from './shared.js?v=1';

const COMMON_PORTS = {
  21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
  80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
  445: 'SMB', 3306: 'MySQL', 3389: 'RDP', 8080: 'HTTP-Proxy',
};

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function scanPort(target, port, seed) {
  const hv = Math.imul(hashSeed(target + '|' + port), seed) >>> 0;
  const base = (hv % 10000) / 100;
  const normalized = ((port * 31 + seed * 7) % 100) / 100;
  return base > 25 && normalized > 0.4;
}

export function initPortScanner() {
  const input = document.getElementById('port-target');
  const btn = document.getElementById('port-scan');
  const result = document.getElementById('port-result');
  if (!input || !btn || !result) return;

  btn.addEventListener('click', () => {
    const target = input.value.trim();
    if (!target) { result.innerHTML = '<p class="text-warning">Enter a target IP/hostname.</p>'; return; }

    result.innerHTML = `
      <div class="rep-status-bar">
        <span class="text-muted" style="font-size:0.8rem">Scanning target: <b>${escapeHtml(target)}</b></span>
        <span class="rep-meta">demo scan (13 common ports)</span>
      </div>
      <p class="text-muted" style="font-size:0.75rem;margin:0 0 0.5rem">Browsers cannot open raw TCP connections — results below are a deterministic simulation for education. Run the real <code>port_scanner.py</code> via CLI/sockets for actual results.</p>`;

    const seed = hashSeed(target) || 1;
    const openPorts = [];
    for (const [p, svc] of Object.entries(COMMON_PORTS)) {
      const port = parseInt(p, 10);
      if (scanPort(target, port, seed)) openPorts.push([port, svc]);
    }

    result.innerHTML += `
      <div class="dns-header">Scan results (simulated)</div>
      ${openPorts.length
        ? `<div class="hdr-list">
            ${openPorts.map(([port, svc]) => `
              <div class="hdr-row hdr-ok">
                <span class="hdr-name">Port ${port}</span>
                <span class="hdr-val">→ ${escapeHtml(svc)} (<b>OPEN</b>)</span>
              </div>`).join('')}
          </div>`
        : '<div class="hdr-row"><span class="hdr-val">No open ports detected in this simulation.</span></div>'}
      ${openPorts.length ? `<p class="hdr-recommend" style="margin-top:0.5rem">Total open ports: <b>${openPorts.length}</b>. Try a different target to see other combinations.</p>` : ''}`;
  });
}