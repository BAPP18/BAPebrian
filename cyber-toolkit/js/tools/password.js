import { escapeHtml } from './shared.js?v=1';

const COMMON_PATTERNS = ['123456', 'password', 'qwerty', 'letmein', 'admin', 'abc123'];

function generatePassword(length, useSymbols) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' + (useSymbols ? '!@#$%^&*()-_=+' : '');
  let out = '';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) out += chars[arr[i] % chars.length];
  return out;
}

function strengthReport(password) {
  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  let pool = 0;
  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSymbol) pool += 32;

  const entropy = pool ? length * Math.log2(pool) : 0;

  let score = 0;
  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (hasLower && hasUpper) score += 1;
  if (hasDigit) score += 1;
  if (hasSymbol) score += 1;

  const isCommon = COMMON_PATTERNS.includes(password.toLowerCase());
  let rating;
  if (isCommon) rating = 'SANGAT LEMAH (password umum/mudah ditebak)';
  else if (score <= 2) rating = 'LEMAH';
  else if (score === 3) rating = 'SEDANG';
  else if (score === 4) rating = 'KUAT';
  else rating = 'SANGAT KUAT';

  const suggestions = [];
  if (length < 12) suggestions.push('gunakan minimal 12 karakter.');
  if (!hasSymbol) suggestions.push('tambahkan simbol seperti ! @ # $ %.');

  return { length, hasLower, hasUpper, hasDigit, hasSymbol, entropy, score, rating, isCommon, suggestions };
}

export function initPasswordTool() {
  const input = document.getElementById('pw-input');
  const checkBtn = document.getElementById('pw-check');
  const result = document.getElementById('pw-result');
  if (!input || !checkBtn || !result) return;

  checkBtn.addEventListener('click', () => {
    const password = input.value;
    if (!password) { result.innerHTML = '<p class="text-warning">Masukkan password terlebih dahulu.</p>'; return; }

    const r = strengthReport(password);
    const cls = r.isCommon || r.score <= 2 ? 'pw-weak' : r.score === 3 ? 'pw-medium' : r.score === 4 ? 'pw-strong' : 'pw-very-strong';
    const label = r.isCommon || r.score <= 2 ? 'Rendah' : r.score === 3 ? 'Sedang' : r.score === 4 ? 'Kuat' : 'Sangat Kuat';

    result.innerHTML = `
      <div class="pw-scorebar"><div class="pw-scorebar-fill"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem">
        <span class="text-muted" style="font-size:0.8rem">Panjang: <b>${r.length}</b> karakter</span>
        <span class="${cls}" style="font-weight:700">${escapeHtml(r.rating)}</span>
      </div>
      <div class="dns-row"><span class="dns-type">Huruf kecil</span><span class="dns-val">${r.hasLower ? 'Ya' : 'Tidak'}</span></div>
      <div class="dns-row"><span class="dns-type">Huruf besar</span><span class="dns-val">${r.hasUpper ? 'Ya' : 'Tidak'}</span></div>
      <div class="dns-row"><span class="dns-type">Angka</span><span class="dns-val">${r.hasDigit ? 'Ya' : 'Tidak'}</span></div>
      <div class="dns-row"><span class="dns-type">Simbol</span><span class="dns-val">${r.hasSymbol ? 'Ya' : 'Tidak'}</span></div>
      <div class="dns-row"><span class="dns-type">Entropy</span><span class="dns-val">~${r.entropy.toFixed(1)} bits</span></div>
      ${r.suggestions.length ? `<div class="hdr-recommend" style="margin-top:0.75rem">💡 Saran: ${escapeHtml(r.suggestions.join(' '))}</div>` : ''}`;
    const fill = result.querySelector('.pw-scorebar-fill');
    fill.style.width = (r.isCommon || r.score <= 1 ? 15 : r.score === 2 ? 35 : r.score === 3 ? 55 : r.score === 4 ? 80 : 100) + '%';
    fill.style.background = r.isCommon || r.score <= 2 ? '#fb7185' : r.score === 3 ? '#fbbf24' : r.score === 4 ? '#a3e635' : '#4ade80';
  });

  const genBtn = document.getElementById('pw-generate');
  const genInput = document.getElementById('pw-length');
  const symbolsCb = document.getElementById('pw-symbols');
  const genResult = document.getElementById('pw-gen-result');
  if (!genBtn || !genInput || !symbolsCb || !genResult) return;

  genBtn.addEventListener('click', () => {
    let length = parseInt(genInput.value, 10);
    if (isNaN(length) || length < 8) length = 16;
    if (length > 64) length = 64;
    const pwd = generatePassword(length, symbolsCb.checked);
    const r = strengthReport(pwd);
    const cls = r.isCommon || r.score <= 2 ? 'pw-weak' : r.score === 3 ? 'pw-medium' : r.score === 4 ? 'pw-strong' : 'pw-very-strong';
    genResult.innerHTML = `
      <p class="dns-header">Password baru</p>
      <div class="jwt-json" style="font-size:1rem;user-select:all">${escapeHtml(pwd)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-top:0.5rem">
        <span class="text-muted" style="font-size:0.8rem">${r.length} karakter · entropy ~${r.entropy.toFixed(1)} bits</span>
        <span class="${cls}" style="font-weight:700">${escapeHtml(r.rating)}</span>
      </div>
      <button class="btn btn-sm btn-primary" id="pw-copy" style="margin-top:0.75rem">📋 Salin</button>`;
    const copyBtn = genResult.querySelector('#pw-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(pwd).then(() => {
          copyBtn.textContent = '✓ Tersalin';
        }).catch(() => {
          copyBtn.textContent = 'Gagal menyalin';
        });
      });
    }
  });
}