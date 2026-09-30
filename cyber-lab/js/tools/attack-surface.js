import { escapeHtml, isInternalHost, CORS_PROXY } from './shared.js?v=1';

const SCAN_PORTS = [
  { port: 443, proto: 'https', name: 'HTTPS' },
  { port: 80, proto: 'http', name: 'HTTP' },
  { port: 8443, proto: 'https', name: 'HTTPS Alt' },
  { port: 8080, proto: 'http', name: 'HTTP Alt' },
  { port: 3000, proto: 'http', name: 'Node.js Dev' },
  { port: 5000, proto: 'http', name: 'Flask/Express' },
  { port: 8000, proto: 'http', name: 'Python Dev' },
  { port: 8888, proto: 'http', name: 'Jupyter/Proxy' },
  { port: 9090, proto: 'http', name: 'Admin Panel' },
  { port: 9000, proto: 'http', name: 'PHP-FPM/Alt' },
  { port: 4000, proto: 'http', name: 'React/Gatsby' },
  { port: 4173, proto: 'http', name: 'Vite Preview' },
];

function getNextActions(port, status, techs) {
  const actions = [];
  const mitigations = [];
  if (port === 443 || port === 8443) {
    actions.push('Check SSL/TLS ciphers and certificate');
    actions.push('Test Heartbleed if running an old SSL version');
    actions.push('Look for API endpoints at /api, /v1, /graphql');
    mitigations.push('Use HSTS preload');
    mitigations.push('Hide server version in response headers');
  }
  if (port === 80) {
    actions.push('Check HTTP → HTTPS redirect (SSLStrip risk)');
    mitigations.push('Enable HSTS, 301 redirect to HTTPS');
  }
  if (port === 8080 || port === 8000 || port === 3000 || port === 5000 || port === 4000 || port === 4173) {
    actions.push('Try common paths: /admin, /api, /.env, /config');
    actions.push('Check for default login panels (admin:admin)');
    actions.push('Test IDOR on any API endpoints found');
    mitigations.push('Do not expose dev servers publicly');
    mitigations.push('Use a reverse proxy (nginx/caddy) with auth');
  }
  if (port === 8888) {
    actions.push('Check for tokenless Jupyter Notebook access');
    actions.push('Try proxy requests via SSRF');
    mitigations.push('Use auth tokens and network restrictions');
  }
  if (port === 9090) {
    actions.push('Check admin panels, try default credentials');
    mitigations.push('Use VPN/firewall, do not expose publicly');
  }
  if (techs.length > 0) {
    techs.forEach(t => {
      if (t.toLowerCase().includes('nginx')) { actions.push('Check nginx misconfig (path traversal, alias)'); mitigations.push('Update nginx, disable server_tokens'); }
      if (t.toLowerCase().includes('apache')) { actions.push('Check directory listing, .htaccess bypass'); mitigations.push('Disable directory listing, update Apache'); }
      if (t.toLowerCase().includes('iis')) { actions.push('Check HTTP methods, WebDAV'); mitigations.push('Disable WebDAV, limit HTTP methods'); }
      if (t.toLowerCase().includes('php')) { actions.push('Check PHP info leaks, LFI/RFI'); mitigations.push('Disable expose_php, harden file upload'); }
      if (t.toLowerCase().includes('express') || t.toLowerCase().includes('node')) { actions.push('Check error stack traces, debug mode'); mitigations.push('Set NODE_ENV=production, disable x-powered-by'); }
      if (t.toLowerCase().includes('python') || t.toLowerCase().includes('flask') || t.toLowerCase().includes('django')) { actions.push('Check debug mode, /admin, CSRF protection'); mitigations.push('Disable debug in production, use a strong secret key'); }
    });
  }
  actions.push('Next: Enumeration → directory scan on this port');
  if (mitigations.length === 0) mitigations.push('Review security headers, consider a WAF');
  return { actions: actions.slice(0, 5), mitigations: mitigations.slice(0, 3) };
}

export function initAttackSurface() {
  const input = document.getElementById('as-domain');
  const btn = document.getElementById('as-scan');
  const result = document.getElementById('as-result');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    let domain = input.value.trim();
    if (!domain) { result.innerHTML = '<p class="text-muted">Enter a domain first</p>'; return; }
    if (domain.startsWith('http')) { try { domain = new URL(domain).hostname; } catch {} }

    if (isInternalHost(domain)) { result.innerHTML = '<p class="text-warning">⚠️ Internal/private addresses are not allowed.</p>'; return; }

    btn.disabled = true;
    btn.textContent = 'Scanning...';
    result.innerHTML = `<div class="enum-progress"><div class="enum-progress-bar" style="width:0%"></div></div><p class="text-muted enum-status">Scanning ${SCAN_PORTS.length} ports...</p>`;

    let rows = '';
    let openCount = 0;
    for (let i = 0; i < SCAN_PORTS.length; i++) {
      const p = SCAN_PORTS[i];
      const url = `${p.proto}://${domain}:${p.port}`;
      const progress = Math.round(((i + 1) / SCAN_PORTS.length) * 100);
      let techs = [];
      let status = 0;
      let open = false;
      try {
        const resp = await fetch(CORS_PROXY + encodeURIComponent(url), { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        status = resp.status;
        open = true;
        openCount++;
        resp.headers.forEach((v, k) => {
          const lk = k.toLowerCase();
          if (lk === 'server' || lk === 'x-powered-by' || lk === 'x-aspnet-version') {
            techs.push(`${k}: ${v}`);
          }
        });
        if (resp.headers.get('set-cookie')) techs.push('Set-Cookie: ' + resp.headers.get('set-cookie').split(';')[0] + ';...');
      } catch {}
      const icon = open ? '✅' : '❌';
      const cls = open ? 'as-open' : 'as-closed';
      const statusText = open ? status : '-';
      const techText = techs.length > 0 ? techs.map((t) => escapeHtml(t)).join('<br>') : '<span class="text-muted">None detected</span>';
      const next = open ? getNextActions(p.port, status, techs) : null;
      let nextHtml = '';
      if (next) {
        nextHtml = `<div class="as-next"><div class="as-next-title">Next Actions</div><ul>${next.actions.map(a => '<li>' + escapeHtml(a) + '</li>').join('')}</ul><div class="as-next-title">Mitigations</div><ul>${next.mitigations.map(m => '<li>' + escapeHtml(m) + '</li>').join('')}</ul></div>`;
      }
      rows += `<div class="as-row ${cls}"><div class="as-row-main"><span class="as-icon">${icon}</span><span class="as-port">${p.port}</span><span class="as-proto">${p.proto.toUpperCase()}</span><span class="as-name">${escapeHtml(p.name)}</span><span class="as-status">${statusText}</span></div><div class="as-detail"><div class="as-tech"><span class="as-tech-title">Detected:</span> ${techText}</div>${nextHtml}</div></div>`;
      result.innerHTML = `<div class="enum-progress"><div class="enum-progress-bar" style="width:${progress}%"></div></div><p class="text-muted enum-status">Port ${p.port}... (${i + 1}/${SCAN_PORTS.length})</p><div class="as-list">${rows}</div>`;
    }
    result.innerHTML = `<div class="as-summary">✅ ${openCount} open | ❌ ${SCAN_PORTS.length - openCount} closed</div><div class="as-list">${rows}</div><p class="text-muted enum-disclaimer">⚠️ Only HTTP/HTTPS ports can be scanned from the browser. For full port scan, use nmap.</p>`;
    btn.disabled = false;
    btn.textContent = 'Start Scan';
  });
}