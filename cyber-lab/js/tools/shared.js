export function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

export function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
}

export function isInternalHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/\[|\]/g, '');
  const internal = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|169\.254\.)/;
  const v4mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const loopback6 = h === '::1' || h === '0:0:0:0:0:0:0:1';
  const private6 = /^(f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:)/.test(h) || h.startsWith('fe80:');
  return internal.test(h) || (v4mapped && internal.test(v4mapped[1])) || loopback6 || private6 || h.endsWith('.local') || h.endsWith('.internal') || h === 'metadata.google.internal';
}

export function isPublicUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return !isInternalHost(u.hostname);
  } catch {
    return false;
  }
}

export function guardPublicUrl(urlStr) {
  return isPublicUrl(urlStr) ? null : '⚠️ Internal/private addresses are not allowed. This tool must only target public URLs.';
}

export const DNS_API = 'https://dns.google/resolve';
export const CORS_PROXY = 'https://api.cors.syrins.tech/?url=';