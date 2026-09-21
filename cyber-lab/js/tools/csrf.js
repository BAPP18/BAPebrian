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