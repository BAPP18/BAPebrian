export function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

export function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
}

export const NVD_API = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
export const CORS_PROXY = 'https://api.cors.syrins.tech/?url=';