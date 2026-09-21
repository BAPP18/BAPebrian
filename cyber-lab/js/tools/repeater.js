import { escapeHtml, guardPublicUrl, CORS_PROXY } from './shared.js?v=1';

export function initHTTPRepeater() {
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
    const guardErr = guardPublicUrl(url);
    if (guardErr) { result.innerHTML = `<p class="text-warning">${guardErr}</p>`; return; }

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
    const guardErr = guardPublicUrl(template.replace('{id}','1'));
    if (guardErr) { result.innerHTML = `<p class="text-warning">${guardErr}</p>`; return; }

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