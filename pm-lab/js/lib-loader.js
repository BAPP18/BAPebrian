const SCRIPT_LIBS = {
  xlsx: { url: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', global: 'XLSX' },
  pdfjs: { url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', global: 'pdfjsLib' },
  docx: { url: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', global: 'mammoth' },
  chart: { url: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js', global: 'Chart' },
};

const cache = {};

export function isLibLoaded(name) {
  const def = SCRIPT_LIBS[name];
  return def ? !!window[def.global] : true;
}

export function loadLib(name) {
  const def = SCRIPT_LIBS[name];
  if (!def) return Promise.resolve();
  if (window[def.global]) return Promise.resolve();
  if (cache[name]) return cache[name];
  cache[name] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = def.url;
    s.crossOrigin = 'anonymous';
    s.referrerPolicy = 'no-referrer';
    s.onload = () => {
      if (name === 'pdfjs') {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        } catch (e) { /* worker fallback handled by parser */ }
      }
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load ' + name + ' library.'));
    document.head.appendChild(s);
  });
  return cache[name];
}

export function preloadLibs(only) {
  const keys = only || Object.keys(SCRIPT_LIBS);
  keys.forEach((k) => { if (SCRIPT_LIBS[k]) loadLib(k).catch(() => {}); });
}