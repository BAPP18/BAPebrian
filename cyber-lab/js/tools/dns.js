import { escapeHtml, DNS_API } from './shared.js?v=1';

export function initDNSLookup() {
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