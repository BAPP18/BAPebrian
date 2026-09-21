import { escapeHtml, NVD_API, CORS_PROXY } from './shared.js?v=1';

const SEV_COLOR = {
  CRITICAL: '#fb7185',
  HIGH: '#fb923c',
  MEDIUM: '#fbbf24',
  LOW: '#a3e635',
};

function severityClass(sev) {
  return sev ? sev.toLowerCase() : 'unknown';
}

export function initVulnScanner() {
  const input = document.getElementById('vuln-input');
  const btn = document.getElementById('vuln-search');
  const result = document.getElementById('vuln-result');
  if (!input || !btn || !result) return;

  btn.addEventListener('click', async () => {
    const keyword = input.value.trim();
    if (!keyword) { result.innerHTML = '<p class="text-warning">Keyword tidak boleh kosong.</p>'; return; }

    result.innerHTML = '<p class="text-muted">Mencari CVE untuk <b>' + escapeHtml(keyword) + '</b> di NVD API...</p>';

    const url = `${NVD_API}?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=10`;
    try {
      const resp = await fetch(CORS_PROXY + encodeURIComponent(url));
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();

      const vulnerabilities = data.vulnerabilities || [];
      const total = data.totalResults || 0;
      if (!vulnerabilities.length) {
        result.innerHTML = `<p class="text-muted">Tidak ada CVE ditemukan untuk keyword "${escapeHtml(keyword)}".</p>`;
        return;
      }

      result.innerHTML = `
        <p class="dns-header" style="margin-bottom:0.5rem">Ditemukan ${total} CVE untuk "${escapeHtml(keyword)}" — menampilkan ${vulnerabilities.length} teratas</p>
        <div class="hdr-list">
          ${vulnerabilities.map((item) => {
            const cve = item.cve || {};
            const cveId = cve.id || 'N/A';
            const desc = (cve.descriptions || []).find((d) => d.lang === 'en');
            const descText = desc ? desc.value : 'No description';
            const metrics = cve.metrics || {};
            let severity = 'N/A';
            let score = 'N/A';
            if (metrics.cvssMetricV31 && metrics.cvssMetricV31[0]) {
              const cvss = metrics.cvssMetricV31[0].cvssData;
              severity = cvss.baseSeverity || 'N/A';
              score = cvss.baseScore !== undefined ? cvss.baseScore : 'N/A';
            } else if (metrics.cvssMetricV2 && metrics.cvssMetricV2[0]) {
              const cvss = metrics.cvssMetricV2[0].cvssData;
              score = cvss.baseScore !== undefined ? cvss.baseScore : 'N/A';
            }
            const color = SEV_COLOR[severity] || 'var(--text-muted)';
            return `
              <div class="hdr-row" style="align-items:flex-start;padding:0.5rem 0">
                <span class="hdr-name" style="min-width:150px">${escapeHtml(cveId)}</span>
                <div style="flex:1;min-width:0">
                  <div class="hdr-val" style="color:var(--text-muted);margin-bottom:0.2rem">
                    Severity: <span style="color:${color};font-weight:700">${escapeHtml(severity)}</span>
                    Score: <b>${score}</b>
                  </div>
                  <div class="hdr-val" style="font-size:0.75rem">${escapeHtml(descText.slice(0, 200))}${descText.length > 200 ? '...' : ''}</div>
                </div>
              </div>`;
          }).join('')}
        </div>
        <p class="hdr-recommend" style="margin-top:0.5rem">📡 Data dari NVD. Severity per CVSS v3.1 (fallback v2).</p>`;
    } catch (e) {
      result.innerHTML = `<p class="text-warning">Gagal mengambil data dari NVD: ${escapeHtml(e.message)}. API mungkin sedang menurun atau koneksi diblokir. Coba lagi beberapa saat.</p>`;
    }
  });
}