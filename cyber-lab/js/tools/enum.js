import { escapeHtml, isInternalHost, guardPublicUrl, CORS_PROXY, DNS_API } from './shared.js?v=1';

const SUBDOMAINS = [
  'www', 'mail', 'admin', 'dev', 'api', 'blog', 'cdn', 'ftp', 'ssh',
  'test', 'staging', 'vpn', 'webmail', 'portal', 'backup', 'app',
  'git', 'jenkins', 'db', 'server',
];

const DIR_PATHS = [
  '/admin', '/.git', '/wp-admin', '/config', '/backup', '/api', '/login',
  '/.env', '/robots.txt', '/sitemap.xml', '/phpmyadmin', '/.htaccess',
  '/server-status', '/crossdomain.xml', '/test',
];

export function initEnumeration() {
  initEnumSubTabs();
  initSubdomainEnum();
  initDirEnum();
}

function initEnumSubTabs() {
  const container = document.getElementById('enum-tool');
  if (!container) return;
  const tabs = container.querySelectorAll('.enum-sub-tab');
  const contents = container.querySelectorAll('.enum-sub-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById(tab.dataset.ensub);
      if (content) content.classList.add('active');
    });
  });
}

function initSubdomainEnum() {
  const input = document.getElementById('enum-domain');
  const btn = document.getElementById('enum-domain-btn');
  const result = document.getElementById('enum-domain-result');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    let domain = input.value.trim();
    if (!domain) { result.innerHTML = '<p class="text-muted">Enter a domain first</p>'; return; }
    if (domain.startsWith('http')) { try { domain = new URL(domain).hostname; } catch {} }
    if (isInternalHost(domain)) { result.innerHTML = '<p class="text-warning">⚠️ Internal/private addresses are not allowed.</p>'; return; }
    btn.disabled = true;
    btn.textContent = 'Scanning...';
    result.innerHTML = `<div class="enum-progress"><div class="enum-progress-bar" style="width:0%"></div></div><p class="text-muted enum-status">Starting scan of ${SUBDOMAINS.length} subdomains...</p>`;

    let resolved = 0;
    let rows = '';
    for (let i = 0; i < SUBDOMAINS.length; i++) {
      const sub = SUBDOMAINS[i];
      const fqdn = `${sub}.${domain}`;
      const progress = Math.round(((i + 1) / SUBDOMAINS.length) * 100);
      try {
        const resp = await fetch(`${DNS_API}?name=${encodeURIComponent(fqdn)}&type=A`);
        if (resp.ok) {
          const data = await resp.json();
          const found = data.Status === 0 && data.Answer && data.Answer.length > 0;
          if (found) {
            const ips = data.Answer.map(r => escapeHtml(r.data)).join(', ');
            rows += `<div class="enum-row enum-ok"><span class="enum-icon">✅</span><span class="enum-name">${escapeHtml(fqdn)}</span><span class="enum-ip">${ips}</span></div>`;
            resolved++;
          } else {
            rows += `<div class="enum-row enum-err"><span class="enum-icon">❌</span><span class="enum-name">${escapeHtml(fqdn)}</span><span class="enum-ip">No record</span></div>`;
          }
        } else {
          rows += `<div class="enum-row enum-err"><span class="enum-icon">❌</span><span class="enum-name">${escapeHtml(fqdn)}</span><span class="enum-ip">DNS error</span></div>`;
        }
      } catch {
        rows += `<div class="enum-row enum-err"><span class="enum-icon">❌</span><span class="enum-name">${escapeHtml(fqdn)}</span><span class="enum-ip">Query failed</span></div>`;
      }
      result.innerHTML = `<div class="enum-progress"><div class="enum-progress-bar" style="width:${progress}%"></div></div><p class="text-muted enum-status">Scanning ${i + 1}/${SUBDOMAINS.length}...</p><div class="enum-list">${rows}</div>`;
    }
    result.innerHTML = `<div class="enum-progress"><div class="enum-progress-bar" style="width:100%"></div></div><div class="enum-summary">✅ ${resolved} resolved | ❌ ${SUBDOMAINS.length - resolved} not found</div><div class="enum-list">${rows}</div><p class="text-muted enum-disclaimer">⚠️ For educational purposes only. Test only websites you own.</p>`;
    btn.disabled = false;
    btn.textContent = 'Start Enumeration';
  });
}

function initDirEnum() {
  const input = document.getElementById('enum-url');
  const btn = document.getElementById('enum-url-btn');
  const result = document.getElementById('enum-url-result');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    let baseUrl = input.value.trim();
    if (!baseUrl) { result.innerHTML = '<p class="text-muted">Enter a URL first</p>'; return; }
    if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;
    try { new URL(baseUrl); } catch { result.innerHTML = '<p class="text-warning">⚠️ Invalid URL</p>'; return; }
    const guardErr = guardPublicUrl(baseUrl);
    if (guardErr) { result.innerHTML = `<p class="text-warning">${guardErr}</p>`; return; }
    const base = baseUrl.replace(/\/+$/, '');

    btn.disabled = true;
    btn.textContent = 'Scanning...';
    result.innerHTML = `<div class="enum-progress"><div class="enum-progress-bar" style="width:0%"></div></div><p class="text-muted enum-status">Starting scan of ${DIR_PATHS.length} paths...</p>`;

    let counts = { '200': 0, '300': 0, '400': 0, '500': 0, 'err': 0 };
    let rows = '';
    for (let i = 0; i < DIR_PATHS.length; i++) {
      const path = DIR_PATHS[i];
      const fullUrl = base + path;
      const progress = Math.round(((i + 1) / DIR_PATHS.length) * 100);
      try {
        const resp = await fetch(CORS_PROXY + encodeURIComponent(fullUrl), { method: 'GET' });
        const status = resp.status;
        const size = (resp.headers.get('content-length') || '?') + 'B';
        let icon, cls;
        if (status >= 200 && status < 300) { icon = '✅'; cls = 'enum-ok'; counts['200']++; }
        else if (status >= 300 && status < 400) { icon = '🔀'; cls = 'enum-warn'; counts['300']++; }
        else if (status >= 400 && status < 500) { icon = status === 404 ? '❌' : '🔒'; cls = 'enum-err'; counts['400']++; }
        else { icon = '⚠️'; cls = 'enum-err'; counts['500']++; }
        rows += `<div class="enum-row ${cls}"><span class="enum-icon">${icon}</span><span class="enum-name">${escapeHtml(path)}</span><span class="enum-ip">${status} | ${escapeHtml(size)}</span></div>`;
      } catch {
        rows += `<div class="enum-row enum-err"><span class="enum-icon">⚠️</span><span class="enum-name">${escapeHtml(path)}</span><span class="enum-ip">Connection failed</span></div>`;
        counts['err']++;
      }
      result.innerHTML = `<div class="enum-progress"><div class="enum-progress-bar" style="width:${progress}%"></div></div><p class="text-muted enum-status">Scanning ${i + 1}/${DIR_PATHS.length}...</p><div class="enum-list">${rows}</div>`;
    }
    result.innerHTML = `<div class="enum-progress"><div class="enum-progress-bar" style="width:100%"></div></div><div class="enum-summary">✅ ${counts['200']}x 2xx | 🔀 ${counts['300']}x 3xx | 🔒 ${counts['400']}x 4xx | ⚠️ ${counts['500']}x 5xx</div><div class="enum-list">${rows}</div><p class="text-muted enum-disclaimer">⚠️ For educational purposes only. Test only websites you own.</p>`;
    btn.disabled = false;
    btn.textContent = 'Start Scan';
  });
}