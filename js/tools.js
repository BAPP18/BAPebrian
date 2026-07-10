export function initAllTools() {
  initTabs('cyber-tabs');
  initDNSLookup();
  initSecurityHeaders();
  initJWTHashInspector();
  initEnumeration();
  initHTTPRepeater();
  initAttackSurface();
  initCSRFGen();
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

// ===== 5. HTTP Repeater + IDOR Fuzzer =====
function initHTTPRepeater() {
  initRepSubTabs();
  initRequestBuilder();
  initIDORFuzzer();
}

function initRepSubTabs() {
  const container = document.getElementById('repeater-tool');
  if (!container) return;
  const tabs = container.querySelectorAll('.rep-sub-tab');
  const contents = container.querySelectorAll('.rep-sub-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById(tab.dataset.repsub);
      if (content) content.classList.add('active');
    });
  });
}

function initRequestBuilder() {
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

function initIDORFuzzer() {
  const input = document.getElementById('idor-url');
  const startInput = document.getElementById('idor-start');
  const endInput = document.getElementById('idor-end');
  const btn = document.getElementById('idor-fuzz');
  const result = document.getElementById('idor-result');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    let template = input.value.trim();
    if (!template || !template.includes('{id}')) {
      result.innerHTML = '<p class="text-muted">Enter a URL with <code>{id}</code> placeholder</p>'; return;
    }
    if (!template.startsWith('http')) template = 'https://' + template;
    try { new URL(template.replace('{id}','1')); } catch { result.innerHTML = '<p class="text-warning">⚠️ Invalid URL</p>'; return; }

    const start = parseInt(startInput.value) || 1;
    const end = parseInt(endInput.value) || 20;
    if (start > end) { result.innerHTML = '<p class="text-warning">⚠️ Start must be <= End</p>'; return; }
    const total = end - start + 1;

    btn.disabled = true;
    btn.textContent = 'Fuzzing...';
    result.innerHTML = `<div class="enum-progress"><div class="enum-progress-bar" style="width:0%"></div></div><p class="text-muted enum-status">Fuzzing IDs ${start}-${end}...</p>`;

    let rows = '';
    let statusMap = {};
    let lengthMap = {};

    for (let id = start; id <= end; id++) {
      const url = template.replace('{id}', id);
      const progress = Math.round(((id - start + 1) / total) * 100);
      try {
        const resp = await fetch(CORS_PROXY + encodeURIComponent(url));
        const text = await resp.text();
        const len = text.length;
        const status = resp.status;
        statusMap[status] = (statusMap[status] || 0) + 1;
        const lenKey = len < 100 ? 'small' : len < 1000 ? 'medium' : 'large';
        lengthMap[lenKey] = (lengthMap[lenKey] || 0) + 1;

        const majorityStatus = Object.entries(statusMap).sort((a,b) => b[1]-a[1])[0];
        const isAnomaly = majorityStatus && status !== parseInt(majorityStatus[0]) && majorityStatus[1] > total * 0.3;
        const icon = isAnomaly ? '🚩' : (status >= 200 && status < 300 ? '✅' : status >= 400 ? '❌' : '🔀');
        const cls = isAnomaly ? 'idor-anomaly' : (status >= 200 && status < 300 ? 'idor-ok' : 'idor-err');

        rows += `<div class="idor-row ${cls}"><span class="idor-icon">${icon}</span><span class="idor-id">${id}</span><span class="idor-status">${status}</span><span class="idor-len">${escapeHtml(String(len))}B</span><span class="idor-preview">${escapeHtml(text.slice(0, 80).replace(/\s+/g, ' '))}</span></div>`;
      } catch {
        rows += `<div class="idor-row idor-err"><span class="idor-icon">⚠️</span><span class="idor-id">${id}</span><span class="idor-status">ERR</span><span class="idor-len">-</span><span class="idor-preview">Connection failed</span></div>`;
      }
      result.innerHTML = `<div class="enum-progress"><div class="enum-progress-bar" style="width:${progress}%"></div></div><p class="text-muted enum-status">Fuzzed ${id - start + 1}/${total}</p><div class="idor-list">${rows}</div>`;
    }

    const countAnomaly = (result.innerHTML.match(/🚩/g) || []).length;
    const summaryAnomaly = countAnomaly > 0 ? `<div class="idor-summary idor-summary-anomaly">🚩 ${countAnomaly} potential IDOR(s) detected — different status/length from majority</div>` : '<div class="idor-summary">✅ No anomalies detected (all responses similar)</div>';
    result.innerHTML = summaryAnomaly + `<div class="enum-progress"><div class="enum-progress-bar" style="width:100%"></div></div><p class="text-muted enum-status">Done — ${total} requests</p><div class="idor-list">${rows}</div><p class="text-muted enum-disclaimer">⚠️ For educational purposes only. Test only websites you own.</p>`;
    btn.disabled = false;
    btn.textContent = 'Start Fuzz';
  });
}

// ===== 6. Attack Surface Analyzer =====
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
    actions.push('Cek SSL/TLS cipher dan sertifikat');
    actions.push('Tes Heartbleed jika versi SSL lawas');
    actions.push('Cari endpoint API di /api, /v1, /graphql');
    mitigations.push('Gunakan HSTS preload');
    mitigations.push('Sembunyikan versi server di response headers');
  }
  if (port === 80) {
    actions.push('Cek HTTP → HTTPS redirect (rentan SSLStrip)');
    mitigations.push('Enable HSTS, redirect 301 ke HTTPS');
  }
  if (port === 8080 || port === 8000 || port === 3000 || port === 5000 || port === 4000 || port === 4173) {
    actions.push('Coba path umum: /admin, /api, /.env, /config');
    actions.push('Cek panel login default (admin:admin)');
    actions.push('Tes IDOR di endpoint API yang ditemukan');
    mitigations.push('Jangan expose dev server ke publik');
    mitigations.push('Gunakan reverse proxy (nginx/caddy) dengan auth');
  }
  if (port === 8888) {
    actions.push('Cek akses ke Jupyter Notebook tanpa token');
    actions.push('Coba proxy request via SSRF');
    mitigations.push('Gunakan auth token dan network restriction');
  }
  if (port === 9090) {
    actions.push('Cek panel admin, coba default credentials');
    mitigations.push('Gunakan VPN/firewall, jangan expose ke publik');
  }
  if (techs.length > 0) {
    techs.forEach(t => {
      if (t.toLowerCase().includes('nginx')) { actions.push('Cek misconfig nginx (path traversal, alias)'); mitigations.push('Update nginx, disable server_tokens'); }
      if (t.toLowerCase().includes('apache')) { actions.push('Cek directory listing, .htaccess bypass'); mitigations.push('Disable directory listing, update Apache'); }
      if (t.toLowerCase().includes('iis')) { actions.push('Cek HTTP methods, WebDAV'); mitigations.push('Disable WebDAV, limit HTTP methods'); }
      if (t.toLowerCase().includes('php')) { actions.push('Cek PHP info leak, LFI/RFI'); mitigations.push('Disable expose_php, harden file upload'); }
      if (t.toLowerCase().includes('express') || t.toLowerCase().includes('node')) { actions.push('Cek error stack trace, debug mode'); mitigations.push('Set NODE_ENV=production, disable x-powered-by'); }
      if (t.toLowerCase().includes('python') || t.toLowerCase().includes('flask') || t.toLowerCase().includes('django')) { actions.push('Cek debug mode, /admin, CSRF protection'); mitigations.push('Disable debug di production, gunakan secret key kuat'); }
    });
  }
  actions.push('Lanjut ke 🔎 Enumeration → directory scan di port ini');
  if (mitigations.length === 0) mitigations.push('Review security headers, gunakan WAF');
  return { actions: actions.slice(0, 5), mitigations: mitigations.slice(0, 3) };
}

function initAttackSurface() {
  const input = document.getElementById('as-domain');
  const btn = document.getElementById('as-scan');
  const result = document.getElementById('as-result');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    let domain = input.value.trim();
    if (!domain) { result.innerHTML = '<p class="text-muted">Enter a domain first</p>'; return; }
    if (domain.startsWith('http')) { try { domain = new URL(domain).hostname; } catch {} }

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
      const techText = techs.length > 0 ? escapeHtml(techs.join('<br>')) : '<span class="text-muted">None detected</span>';
      const next = open ? getNextActions(p.port, status, techs) : null;
      let nextHtml = '';
      if (next) {
        nextHtml = `<div class="as-next"><div class="as-next-title">🔧 Next Actions</div><ul>${next.actions.map(a => '<li>' + escapeHtml(a) + '</li>').join('')}</ul><div class="as-next-title">🛡️ Mitigasi</div><ul>${next.mitigations.map(m => '<li>' + escapeHtml(m) + '</li>').join('')}</ul></div>`;
      }
      rows += `<div class="as-row ${cls}"><div class="as-row-main"><span class="as-icon">${icon}</span><span class="as-port">${p.port}</span><span class="as-proto">${p.proto.toUpperCase()}</span><span class="as-name">${escapeHtml(p.name)}</span><span class="as-status">${statusText}</span></div><div class="as-detail"><div class="as-tech"><span class="as-tech-title">Detected:</span> ${techText}</div>${nextHtml}</div></div>`;
      result.innerHTML = `<div class="enum-progress"><div class="enum-progress-bar" style="width:${progress}%"></div></div><p class="text-muted enum-status">Port ${p.port}... (${i + 1}/${SCAN_PORTS.length})</p><div class="as-list">${rows}</div>`;
    }
    result.innerHTML = `<div class="as-summary">✅ ${openCount} open | ❌ ${SCAN_PORTS.length - openCount} closed</div><div class="as-list">${rows}</div><p class="text-muted enum-disclaimer">⚠️ Only HTTP/HTTPS ports can be scanned from the browser. For full port scan, use nmap.</p>`;
    btn.disabled = false;
    btn.textContent = 'Start Scan';
  });
}

// ===== 7. CSRF PoC Generator =====
function initCSRFGen() {
  const urlInput = document.getElementById('csrf-url');
  const methodSelect = document.getElementById('csrf-method');
  const paramsArea = document.getElementById('csrf-params');
  const btn = document.getElementById('csrf-gen');
  const result = document.getElementById('csrf-result');
  if (!btn) return;

  function parseParams(str) {
    const lines = str.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const idx = line.indexOf(':');
      if (idx > 0) return { key: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      return { key: line.trim(), value: '' };
    });
  }

  btn.addEventListener('click', () => {
    let url = urlInput.value.trim();
    if (!url) { result.innerHTML = '<p class="text-muted">Enter a URL first</p>'; return; }
    if (!url.startsWith('http')) url = 'https://' + url;
    try { new URL(url); } catch { result.innerHTML = '<p class="text-warning">⚠️ Invalid URL</p>'; return; }

    const method = methodSelect.value;
    const params = parseParams(paramsArea.value.trim());
    const paramFields = params.map(p => `      <input type="hidden" name="${escapeAttr(p.key)}" value="${escapeAttr(p.value)}">`).join('\n');

    const html = `<!DOCTYPE html>
<html>
<head><title>CSRF PoC</title></head>
<body>
  <h3>CSRF Proof of Concept</h3>
  <form id="csrf-form" action="${escapeAttr(url)}" method="${method}">
${paramFields}
  </form>
  <script>
    document.getElementById('csrf-form').submit();
  <\/script>
</body>
</html>`;

    result.innerHTML = `
      <div class="csrf-header">📋 CSRF PoC Generated</div>
      <p class="text-muted" style="font-size:0.75rem;margin-bottom:0.5rem">Copy HTML di bawah ke file <code>.html</code>, buka di browser untuk test.</p>
      <div class="csrf-info">
        <span>🔗 URL: ${escapeHtml(url)}</span>
        <span>📤 Method: ${escapeHtml(method)}</span>
        <span>📦 Parameters: ${escapeHtml(String(params.length))}</span>
      </div>
      <div class="csrf-poc-box">
        <button class="btn btn-sm btn-primary" id="csrf-copy" style="float:right;margin-bottom:0.5rem">📋 Copy</button>
        <pre class="csrf-pre" id="csrf-code">${escapeHtml(html)}</pre>
      </div>
      <div class="csrf-test-steps">
        <div class="csrf-step-title">🧪 Cara Test</div>
        <ol>
          <li>Copy HTML code di atas</li>
          <li>Simpan sebagai <code>poc.html</code></li>
          <li>Buka di browser (bisa langsung drag ke tab)</li>
          <li>Form akan auto-submit — lihat apakah request berhasil tanpa token CSRF</li>
          <li>Jika berhasil → 🔴 Rentan CSRF! Tambahkan CSRF token di backend.</li>
        </ol>
      </div>`;

    document.getElementById('csrf-copy')?.addEventListener('click', () => {
      const code = document.getElementById('csrf-code');
      if (code) {
        navigator.clipboard?.writeText(html).then(() => {
          const btn = document.getElementById('csrf-copy');
          if (btn) btn.textContent = '✅ Copied!';
        }).catch(() => {
          const range = document.createRange();
          range.selectNodeContents(code);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        });
      }
    });
  });
}
