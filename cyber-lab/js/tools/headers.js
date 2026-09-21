import { escapeHtml, CORS_PROXY } from './shared.js?v=1';

const SECURITY_HEADERS = {
  'strict-transport-security': { name: 'HSTS', severity: 'high', desc: 'Enforces HTTPS connections' },
  'content-security-policy': { name: 'CSP', severity: 'high', desc: 'Prevents XSS & data injection' },
  'x-frame-options': { name: 'X-Frame-Options', severity: 'high', desc: 'Prevents clickjacking' },
  'x-content-type-options': { name: 'X-Content-Type-Options', severity: 'medium', desc: 'Prevents MIME sniffing' },
  'referrer-policy': { name: 'Referrer-Policy', severity: 'medium', desc: 'Controls referrer info leakage' },
  'permissions-policy': { name: 'Permissions-Policy', severity: 'medium', desc: 'Restricts browser features' },
  'access-control-allow-origin': { name: 'CORS', severity: 'medium', desc: 'Cross-Origin Resource Sharing' },
};

export function initSecurityHeaders() {
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
    const resp = await fetch(CORS_PROXY + encodeURIComponent(url), { method: 'GET' });
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