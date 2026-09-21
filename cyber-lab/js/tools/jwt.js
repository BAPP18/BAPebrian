import { escapeHtml } from './shared.js?v=1';

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

export function initJWTHashInspector() {
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