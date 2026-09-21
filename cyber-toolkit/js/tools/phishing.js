import { escapeHtml } from './shared.js?v=1';

const SUSPICIOUS_KEYWORDS = [
  'login', 'verify', 'update', 'secure', 'account', 'banking',
  'confirm', 'signin', 'webscr', 'password', 'urgent',
];

const SHORTENER_DOMAINS = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd'];

function analyzeURL(url) {
  let score = 0;
  const reasons = [];

  let parsed;
  try {
    parsed = new URL(url.includes('://') ? url : 'http://' + url);
  } catch {
    return { score: 5, reasons: ['URL tidak valid / tidak bisa di-parse'], verdict: 'SEDANG - patut dicurigai' };
  }
  const domain = parsed.hostname;
  const path = parsed.pathname.toLowerCase();

  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
    score += 3;
    reasons.push('Domain menggunakan IP address langsung (mencurigakan)');
  }

  if (url.length > 75) {
    score += 1;
    reasons.push('URL sangat panjang');
  }

  if (domain.split('.').length > 4) {
    score += 2;
    reasons.push('Terlalu banyak subdomain');
  }

  if (url.includes('@')) {
    score += 3;
    reasons.push("Mengandung karakter '@' (teknik penyamaran redirect)");
  }

  if ((domain.match(/-/g) || []).length >= 2) {
    score += 1;
    reasons.push('Domain mengandung banyak tanda hubung (-)');
  }

  if (SHORTENER_DOMAINS.some((s) => domain.includes(s))) {
    score += 2;
    reasons.push('Menggunakan URL shortener (menyembunyikan tujuan asli)');
  }

  const found = SUSPICIOUS_KEYWORDS.filter((kw) => url.toLowerCase().includes(kw));
  if (found.length) {
    score += found.length;
    reasons.push(`Mengandung kata mencurigakan: ${found.join(', ')}`);
  }

  if (parsed.protocol !== 'https:') {
    score += 1;
    reasons.push('Tidak menggunakan HTTPS');
  }

  if (path.includes('//')) {
    score += 1;
    reasons.push("Path mengandung '//' (kemungkinan open redirect)");
  }

  let verdict;
  if (score >= 6) verdict = 'TINGGI - kemungkinan besar PHISHING';
  else if (score >= 3) verdict = 'SEDANG - patut dicurigai';
  else verdict = 'RENDAH - kemungkinan aman';

  return { score, reasons, verdict };
}

export function initPhishingDetector() {
  const input = document.getElementById('phish-input');
  const btn = document.getElementById('phish-analyze');
  const result = document.getElementById('phish-result');
  if (!input || !btn || !result) return;

  btn.addEventListener('click', () => {
    const url = input.value.trim();
    if (!url) { result.innerHTML = '<p class="text-warning">URL tidak boleh kosong.</p>'; return; }

    const r = analyzeURL(url);
    const tone = r.score >= 6 ? 'hdr-miss' : r.score >= 3 ? 'hdr-warn' : 'hdr-ok';
    const color = r.score >= 6 ? '#fb7185' : r.score >= 3 ? '#fbbf24' : '#86efac';

    result.innerHTML = `
      <div class="rep-status-bar" style="justify-content:space-between">
        <span class="text-muted" style="font-size:0.8rem;word-break:break-all">${escapeHtml(url)}</span>
        <span style="color:${color};font-weight:700;font-size:1.1rem;white-space:nowrap">Risk: ${r.score}/15</span>
      </div>
      <div class="${tone}" style="font-size:0.9rem;font-weight:700;margin-bottom:0.5rem">Verdict: ${escapeHtml(r.verdict)}</div>
      ${r.reasons.length ? `
        <p class="text-muted" style="margin:0 0 0.35rem">Alasan:</p>
        <div class="hdr-list">
          ${r.reasons.map((rs) => `
            <div class="hdr-row"><span class="hdr-icon">•</span><span class="hdr-val">${escapeHtml(rs)}</span></div>`).join('')}
        </div>` : '<p class="text-muted">Tidak ditemukan indikator mencurigakan.</p>'}`;
  });
}