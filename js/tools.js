export function initAllTools() {
  initTabs('cyber-tabs');
  initDNSLookup();
  initSecurityHeaders();
  initJWTHashInspector();
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

// ===== 1. Network Recon — DNS Lookup =====
const DNS_API = 'https://dns.google/resolve';

const DNS_TYPES = [
  { type: 'A', label: 'A (IPv4)' },
  { type: 'AAAA', label: 'AAAA (IPv6)' },
  { type: 'MX', label: 'MX (Mail)' },
  { type: 'NS', label: 'NS (Nameserver)' },
  { type: 'TXT', label: 'TXT (Text)' },
  { type: 'CNAME', label: 'CNAME (Alias)' },
  { type: 'SOA', label: 'SOA (Authority)' },
];

function initDNSLookup() {
  const input = document.getElementById('dns-input');
  const result = document.getElementById('dns-result');
  const btns = document.querySelectorAll('.dns-btn');
  if (!input) return;

  function getHostname(str) {
    try {
      const url = str.startsWith('http') ? new URL(str) : new URL('http://' + str);
      return url.hostname;
    } catch { return str.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]; }
  }

  btns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const hostname = getHostname(input.value.trim());
      if (!hostname) { result.innerHTML = '<p class="text-muted">Enter a domain first</p>'; return; }
      const type = btn.dataset.dns;
      const label = btn.textContent.trim();
      btn.disabled = true;
      btn.textContent = '...';
      try {
        const resp = await fetch(`${DNS_API}?name=${encodeURIComponent(hostname)}&type=${type}`);
        const data = await resp.json();
        renderDNSResult(result, hostname, type, label, data);
      } catch {
        result.innerHTML = `<p class="text-warning">⚠️ Query failed for ${hostname}</p>`;
      }
      btn.disabled = false;
      btn.textContent = label;
    });
  });
}

function renderDNSResult(el, hostname, type, label, data) {
  if (data.Status !== 0 || !data.Answer) {
    el.innerHTML = `<p class="text-muted">No ${label} records found for ${hostname}</p>`;
    return;
  }
  let rows = '';
  data.Answer.forEach(r => {
    const val = type === 'MX' ? r.data : r.data;
    rows += `<div class="dns-row"><span class="dns-type">${type}</span><span class="dns-val">${val}</span><span class="dns-ttl">TTL: ${r.TTL}s</span></div>`;
  });
  el.innerHTML = `
    <div class="dns-header">${hostname} — ${label} (${data.Answer.length} records)</div>
    ${rows}
  `;
}

// ===== 2. Web App Security — Security Headers Analyzer =====
const HEADERS_API = 'https://u2l.ai/api/tools/http-headers';

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

  btn.addEventListener('click', async () => {
    let url = input.value.trim();
    if (!url) { result.innerHTML = '<p class="text-muted">Enter a URL first</p>'; return; }
    if (!url.startsWith('http')) url = 'https://' + url;
    btn.disabled = true;
    btn.textContent = 'Scanning...';
    try {
      const resp = await fetch(`${HEADERS_API}?url=${encodeURIComponent(url)}`);
      const data = await resp.json();
      renderHeadersResult(result, data);
    } catch {
      result.innerHTML = `<p class="text-warning">⚠️ Could not analyze ${url}. The site may block requests.</p>`;
    }
    btn.disabled = false;
    btn.textContent = 'Check Headers';
  });
}

function renderHeadersResult(el, data) {
  const headers = (data.headers || {});
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
      ${present < total ? `<p>⚠️ Missing ${total - present} security header(s). Consider adding them to improve your security posture.</p>` : '<p>✅ Good security header configuration!</p>'}
    </div>`;
}

// ===== 3. JWT & Hash Inspector =====
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  try { return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')); }
  catch { try { return atob(str); } catch { return '[Invalid Base64]'; } }
}

function initJWTHashInspector() {
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
      const header = JSON.parse(base64UrlDecode(parts[0]));
      const payload = JSON.parse(base64UrlDecode(parts[1]));
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
          ${i === 0 ? '⭐ ' : ''}${m}
          ${i === 0 ? '<span class="hash-badge">Most likely</span>' : ''}
        </div>
      `).join('')}
      <p class="text-muted" style="font-size:0.75rem;margin-top:0.75rem">
        ℹ️ Only length & format-based detection. Verify with actual decryption.
      </p>`;
  }

  input.addEventListener('input', update);
}
