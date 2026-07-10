export function initAllTools() {
  initTabs('cyber-tabs');
  initDNSLookup();
  initSecurityHeaders();
  initJWTHashInspector();
  initEnumeration();
  initHTTPRepeater();
}

function initTabs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const tabs = container.querySelectorAll('.lab-tab');
  const contents = document.querySelectorAll('.lab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById(tab.dataset.tab);
      if (content) content.classList.add('active');
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

// ===== 1. Network Recon — DNS Lookup =====
const DNS_API = 'https://dns.google/resolve';

function initDNSLookup() {
  const input = document.getElementById('dns-input');
  const result = document.getElementById('dns-result');
  const btns = document.querySelectorAll('.dns-btn');
  if (!input) return;

  function getHostname(str) {
    try {
      const url = str.startsWith('http') ? new URL(str) : new URL('http://' + str);
      return url.hostname;
    } catch { return ''; }
  }

  function isInternalHost(hostname) {
    const internal = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0)$/;
    return internal.test(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal');
  }

  btns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const hostname = getHostname(input.value.trim());
      if (!hostname) { result.innerHTML = '<p class="text-muted">Enter a valid domain</p>'; return; }
      if (isInternalHost(hostname)) { result.innerHTML = '<p class="text-warning">⚠️ Internal addresses are not allowed</p>'; return; }
      const type = btn.dataset.dns;
      const label = btn.textContent.trim();
      btn.disabled = true;
      btn.textContent = '⏳';
      result.innerHTML = '<p class="text-muted">Querying...</p>';
      try {
        const resp = await fetch(`${DNS_API}?name=${encodeURIComponent(hostname)}&type=${type}`);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        renderDNSResult(result, hostname, type, label, data);
      } catch {
        result.innerHTML = `<p class="text-warning">⚠️ Query failed for ${escapeHtml(hostname)}. Try the CORS proxy fallback.</p>`;
        tryFallbackDNS(result, hostname, type, label);
      }
      btn.disabled = false;
      btn.textContent = label;
    });
  });
}

async function tryFallbackDNS(el, hostname, type, label) {
  const proxy = 'https://api.cors.syrins.tech/?url=';
  const fallback = `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=${type}`;
  try {
    const resp = await fetch(proxy + encodeURIComponent(fallback));
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    renderDNSResult(el, hostname, type, label, data);
  } catch {
    el.innerHTML = `<p class="text-warning">⚠️ Could not resolve ${escapeHtml(hostname)}. Check the domain name.</p>`;
  }
}

function renderDNSResult(el, hostname, type, label, data) {
  if (data.Status !== 0 || !data.Answer) {
    el.innerHTML = `<p class="text-muted">No ${escapeHtml(label)} records found for ${escapeHtml(hostname)}</p>`;
    return;
  }
  let rows = '';
  data.Answer.forEach(r => {
    const val = String(r.data);
    rows += `<div class="dns-row"><span class="dns-type">${escapeHtml(type)}</span><span class="dns-val">${escapeHtml(val)}</span><span class="dns-ttl">TTL: ${escapeHtml(String(r.TTL))}s</span></div>`;
  });
  el.innerHTML = `
    <div class="dns-header">${escapeHtml(hostname)} — ${escapeHtml(label)} (${escapeHtml(String(data.Answer.length))} records)</div>
    ${rows}
  `;
}

// ===== 2. Web App Security — Security Headers Analyzer =====
const HEADERS_PROXY = 'https://api.cors.syrins.tech/?url=';

const SECURITY_HEADERS = {
  'strict-transport-security': { name: 'HSTS', severity: 'high', desc: 'Enforces HTTPS connections' },
  'content-security-policy': { name: 'CSP', severity: 'high', desc: 'Prevents XSS & data injection' },
  'x-frame-options': { name: 'X-Frame-Options', severity: 'high', desc: 'Prevents clickjacking' },
  'x-content-type-options': { name: 'X-Content-Type-Options', severity: 'medium', desc: 'Prevents MIME sniffing' },
  'referrer-policy': { name: 'Referrer-Policy', severity: 'medium', desc: 'Controls referrer info leakage' },
  'permissions-policy': { name: 'Permissions-Policy', severity: 'medium', desc: 'Restricts browser features' },
  'access-control-allow-origin': { name: 'CORS', severity: 'medium', desc: 'Cross-Origin Resource Sharing' },
};

function initSecurityHeaders() {
  const input = document.getElementById('headers-input');
  const btn = document.getElementById('headers-check');
  const result = document.getElementById('headers-result');
  if (!btn) return;

  function isValidUrl(str) {
    try {
      const u = new URL(str);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch { return false; }
  }

  btn.addEventListener('click', async () => {
    let url = input.value.trim();
    if (!url) { result.innerHTML = '<p class="text-muted">Enter a URL first</p>'; return; }
    if (!url.startsWith('http')) url = 'https://' + url;
    if (!isValidUrl(url)) { result.innerHTML = '<p class="text-warning">⚠️ Invalid URL format.</p>'; return; }
    btn.disabled = true;
    btn.textContent = 'Scanning...';
    result.innerHTML = '<p class="text-muted">Fetching headers...</p>';
    try {
      const headers = await fetchHeadersViaProxy(url);
      if (headers) {
        renderHeadersResult(result, headers);
      } else {
        result.innerHTML = `<p class="text-warning">⚠️ Could not analyze ${escapeHtml(url)}. The site may block requests.</p>`;
      }
    } catch {
      result.innerHTML = `<p class="text-warning">⚠️ Could not analyze ${escapeHtml(url)}. The site may block requests.</p>`;
    }
    btn.disabled = false;
    btn.textContent = 'Check Headers';
  });
}

async function fetchHeadersViaProxy(url) {
  try {
    const resp = await fetch(HEADERS_PROXY + encodeURIComponent(url), { method: 'GET' });
    if (!resp.ok) return null;
    const headerMap = {};
    resp.headers.forEach((val, key) => { headerMap[key.toLowerCase()] = val; });
    return headerMap;
  } catch {
    return null;
  }
}

function renderHeadersResult(el, headers) {
  let present = 0;
  let total = Object.keys(SECURITY_HEADERS).length;
  let rows = '';

  for (const [key, meta] of Object.entries(SECURITY_HEADERS)) {
    const val = headers[key];
    const found = val !== undefined && val !== null && val !== '';
    if (found) present++;
    const icon = found ? '✅' : '❌';
    rows += `
      <div class="hdr-row ${found ? 'hdr-ok' : 'hdr-miss'}">
        <span class="hdr-icon">${icon}</span>
        <span class="hdr-name">${meta.name}</span>
        <span class="hdr-sev ${meta.severity}">${meta.severity}</span>
        <span class="hdr-val">${found ? val : 'MISSING'}</span>
      </div>`;
  }

  const pct = Math.round((present / total) * 100);
  let grade, gradeClass;
  if (pct >= 90) { grade = 'A'; gradeClass = 'grade-a'; }
  else if (pct >= 70) { grade = 'B'; gradeClass = 'grade-b'; }
  else if (pct >= 50) { grade = 'C'; gradeClass = 'grade-c'; }
  else if (pct >= 30) { grade = 'D'; gradeClass = 'grade-d'; }
  else { grade = 'F'; gradeClass = 'grade-f'; }

  el.innerHTML = `
    <div class="hdr-summary">
      <span class="hdr-grade ${gradeClass}">${grade}</span>
      <span class="hdr-stats">${present}/${total} security headers present</span>
    </div>
    <div class="hdr-list">${rows}</div>
    <div class="hdr-recommend">
      ${present < total ? `<p>⚠️ Missing ${escapeHtml(String(total - present))} security header(s). Consider adding them to improve your security posture.</p>` : '<p>✅ Good security header configuration!</p>'}
    </div>`;
}

// ===== 3. JWT & Hash Inspector =====
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  try { return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')); }
  catch { try { return atob(str); } catch { return '[Invalid Base64]'; } }
}

function initSubTabs() {
  const tabs = document.querySelectorAll('.sub-tab');
  const contents = document.querySelectorAll('.sub-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById(tab.dataset.sub);
      if (content) content.classList.add('active');
    });
  });
}

function initJWTHashInspector() {
  initSubTabs();
  initJWTDecoder();
  initHashIdentifier();
}

function initJWTDecoder() {
  const input = document.getElementById('jwt-input');
  const btn = document.getElementById('jwt-decode');
  const result = document.getElementById('jwt-result');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const token = input.value.trim();
    if (!token) { result.innerHTML = '<p class="text-muted">Paste a JWT token above</p>'; return; }
    const parts = token.split('.');
    if (parts.length !== 3) {
      result.innerHTML = '<p class="text-warning">⚠️ Invalid JWT format. Expected 3 parts (header.payload.signature)</p>';
      return;
    }
    try {
      const headerStr = base64UrlDecode(parts[0]);
      const payloadStr = base64UrlDecode(parts[1]);
      if (headerStr === '[Invalid Base64]' || payloadStr === '[Invalid Base64]') {
        result.innerHTML = '<p class="text-warning">⚠️ Invalid Base64 encoding in JWT parts.</p>'; return;
      }
      const header = JSON.parse(headerStr);
      const payload = JSON.parse(payloadStr);
      const signature = parts[2];
      renderJWTResult(result, header, payload, signature);
    } catch {
      result.innerHTML = '<p class="text-warning">⚠️ Could not decode JWT. Make sure it is a valid token.</p>';
    }
  });
}

function renderJWTResult(el, header, payload, signature) {
  el.innerHTML = `
    <div class="jwt-section">
      <div class="jwt-section-title">HEADER: ALGORITHM & TOKEN TYPE</div>
      <pre class="jwt-json">${JSON.stringify(header, null, 2)}</pre>
    </div>
    <div class="jwt-section">
      <div class="jwt-section-title">PAYLOAD: DATA</div>
      <pre class="jwt-json">${JSON.stringify(payload, null, 2)}</pre>
    </div>
    <div class="jwt-section">
      <div class="jwt-section-title">SIGNATURE</div>
      <div class="jwt-sig">${signature.slice(0, 40)}...</div>
      <p class="text-muted" style="font-size:0.75rem;margin-top:0.5rem">
        ${header.alg === 'none' ? '⚠️ Algorithm is "none" — this token is NOT verified!' :
          header.alg?.startsWith('HS') ? '⚠️ Symmetric algorithm (HS256/384/512) — token can be forged if secret is weak' :
          header.alg?.startsWith('RS') || header.alg?.startsWith('ES') ? 'ℹ️ Asymmetric algorithm — requires public key to verify' :
          'ℹ️ Unknown algorithm'}
      </p>
    </div>`;
}

// ===== Hash Identifier (pure JS, no dependencies) =====
const HASH_PATTERNS = [
  { name: 'MD5', length: 32, pattern: /^[a-f0-9]{32}$/i },
  { name: 'SHA-1', length: 40, pattern: /^[a-f0-9]{40}$/i },
  { name: 'SHA-256', length: 64, pattern: /^[a-f0-9]{64}$/i },
  { name: 'SHA-384', length: 96, pattern: /^[a-f0-9]{96}$/i },
  { name: 'SHA-512', length: 128, pattern: /^[a-f0-9]{128}$/i },
  { name: 'SHA-224', length: 56, pattern: /^[a-f0-9]{56}$/i },
  { name: 'RIPEMD-128', length: 32, pattern: /^[a-f0-9]{32}$/i },
  { name: 'RIPEMD-160', length: 40, pattern: /^[a-f0-9]{40}$/i },
  { name: 'RIPEMD-256', length: 64, pattern: /^[a-f0-9]{64}$/i },
  { name: 'RIPEMD-320', length: 80, pattern: /^[a-f0-9]{80}$/i },
  { name: 'Tiger-160', length: 40, pattern: /^[a-f0-9]{40}$/i },
  { name: 'Tiger-192', length: 48, pattern: /^[a-f0-9]{48}$/i },
  { name: 'MD4', length: 32, pattern: /^[a-f0-9]{32}$/i },
  { name: 'MD2', length: 32, pattern: /^[a-f0-9]{32}$/i },
  { name: 'FNV-1a-32', length: 8, pattern: /^[a-f0-9]{8}$/i },
  { name: 'CRC32', length: 8, pattern: /^[a-f0-9]{8}$/i },
  { name: 'Adler32', length: 8, pattern: /^[a-f0-9]{8}$/i },
  { name: 'MySQL 3.x', length: 16, pattern: /^[a-f0-9]{16}$/i },
  { name: 'MySQL 4.x/5.x', length: 41, pattern: /^\*[a-f0-9]{40}$/i },
  { name: 'SHA-256 (uppercase)', length: 64, pattern: /^[A-F0-9]{64}$/ },
  { name: 'SHA-512 (uppercase)', length: 128, pattern: /^[A-F0-9]{128}$/ },
  { name: 'bcrypt', pattern: /^\$2[abxy]?\$\d{2}\$[A-Za-z0-9./]{53}$/ },
  { name: 'bcrypt ($2y$)', pattern: /^\$2y\$\d{2}\$[A-Za-z0-9./]{53}$/ },
  { name: 'SHA-512 crypt', pattern: /^\$6\$[A-Za-z0-9./]+\$[A-Za-z0-9./]+$/ },
  { name: 'SHA-256 crypt', pattern: /^\$5\$[A-Za-z0-9./]+\$[A-Za-z0-9./]+$/ },
  { name: 'MD5 crypt', pattern: /^\$1\$[A-Za-z0-9./]+\$[A-Za-z0-9./]+$/ },
  { name: 'NTLM', length: 32, pattern: /^[a-f0-9]{32}$/i },
  { name: 'LM Hash', length: 32, pattern: /^[a-f0-9]{32}$/i },
  { name: 'Whirlpool', length: 128, pattern: /^[a-f0-9]{128}$/i },
  { name: 'GOST R 34.11-94', length: 64, pattern: /^[a-f0-9]{64}$/i },
  { name: 'Streebog-256', length: 64, pattern: /^[a-f0-9]{64}$/i },
  { name: 'Streebog-512', length: 128, pattern: /^[a-f0-9]{128}$/i },
];

function identifyHash(hash) {
  const clean = hash.trim();
  if (!clean) return [];
  const results = [];
  for (const h of HASH_PATTERNS) {
    if (h.pattern.test(clean)) {
      if (h.length && clean.length !== h.length) continue;
      results.push(h.name);
    }
  }
  return results;
}

function initHashIdentifier() {
  const input = document.getElementById('hash-input');
  const result = document.getElementById('hash-result');
  if (!input) return;

  function update() {
    const hash = input.value.trim();
    if (!hash) { result.innerHTML = '<p class="text-muted">Enter a hash string above</p>'; return; }
    const matches = identifyHash(hash);
    if (matches.length === 0) {
      result.innerHTML = '<p class="text-warning">⚠️ Unknown hash type. Check your input.</p>';
      return;
    }
    result.innerHTML = `
      <div class="hash-header">Found ${matches.length} possible algorithm(s):</div>
      ${matches.map((m, i) => `
        <div class="hash-row ${i === 0 ? 'hash-best' : ''}">
          ${i === 0 ? '⭐ ' : ''}${escapeHtml(m)}
          ${i === 0 ? '<span class="hash-badge">Most likely</span>' : ''}
        </div>
      `).join('')}
      <p class="text-muted" style="font-size:0.75rem;margin-top:0.75rem">
        ℹ️ Only length & format-based detection. Verify with actual decryption.
      </p>`;
  }

  input.addEventListener('input', update);
}

// ===== 4. Enumeration — Subdomain & Directory =====
const CORS_PROXY = 'https://api.cors.syrins.tech/?url=';

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

function initEnumeration() {
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
        const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(fqdn)}&type=A`);
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

// ===== 5. HTTP Repeater =====
function initHTTPRepeater() {
  const urlInput = document.getElementById('rep-url');
  const methodSelect = document.getElementById('rep-method');
  const headersInput = document.getElementById('rep-headers');
  const bodyInput = document.getElementById('rep-body');
  const btn = document.getElementById('rep-send');
  const result = document.getElementById('rep-result');
  if (!btn) return;

  function toggleBody() {
    const method = methodSelect.value;
    const hasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    bodyInput.disabled = !hasBody;
    bodyInput.placeholder = hasBody ? 'Request body (JSON, form data, etc.)' : 'Body not applicable for ' + method;
  }
  methodSelect.addEventListener('change', toggleBody);
  toggleBody();

  function parseHeaders(str) {
    const map = {};
    str.split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        if (key && val) map[key] = val;
      }
    });
    return map;
  }

  btn.addEventListener('click', async () => {
    let url = urlInput.value.trim();
    if (!url) { result.innerHTML = '<p class="text-muted">Enter a URL first</p>'; return; }
    if (!url.startsWith('http')) url = 'https://' + url;
    try { new URL(url); } catch { result.innerHTML = '<p class="text-warning">⚠️ Invalid URL</p>'; return; }

    const method = methodSelect.value;
    const headers = parseHeaders(headersInput.value);
    const body = ['POST', 'PUT', 'PATCH'].includes(method) ? bodyInput.value : undefined;

    btn.disabled = true;
    btn.textContent = 'Sending...';
    result.innerHTML = '<p class="text-muted">Sending request...</p>';

    const startTime = performance.now();
    try {
      const proxyUrl = CORS_PROXY + encodeURIComponent(url);
      const fetchOpts = { method, headers };
      if (body !== undefined) fetchOpts.body = body;
      const resp = await fetch(proxyUrl, fetchOpts);
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      const respHeaders = {};
      resp.headers.forEach((v, k) => { respHeaders[k] = v; });
      const respText = await resp.text();
      const truncated = respText.length > 2000 ? respText.slice(0, 2000) + '\n... (truncated)' : respText;

      result.innerHTML = `
        <div class="rep-status-bar">
          <span class="rep-status-code ${resp.ok ? 'rep-ok' : resp.status >= 400 ? 'rep-err' : 'rep-warn'}">${resp.status} ${resp.statusText}</span>
          <span class="rep-meta">⏱ ${elapsed}s | 📦 ${escapeHtml(String(respText.length))} bytes</span>
        </div>
        <div class="rep-section">
          <div class="rep-section-title">Response Headers</div>
          <pre class="rep-pre">${escapeHtml(JSON.stringify(respHeaders, null, 2))}</pre>
        </div>
        <div class="rep-section">
          <div class="rep-section-title">Response Body</div>
          <pre class="rep-pre">${escapeHtml(truncated)}</pre>
        </div>`;
    } catch {
      result.innerHTML = '<p class="text-warning">⚠️ Request failed. The target may block CORS or the URL is unreachable.</p>';
    }
    btn.disabled = false;
    btn.textContent = 'Send Request';
  });
}
