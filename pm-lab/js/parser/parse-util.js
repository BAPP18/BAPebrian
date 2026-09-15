export function normToken(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').trim();
}

export function normHeader(s) {
  return normToken(s);
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, mei: 5, jun: 6, jul: 7, aug: 8, agu: 8, sep: 9, sept: 9, oct: 10, okt: 10, nov: 11, des: 12, dec: 12,
};

export function toISO(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return formatDate(value);
  const v = String(value).trim();
  if (/^-?\d+(\.\d+)?$/.test(v)) {
    const n = parseFloat(v);
    if (n > 25000 && n < 3000000) {
      const epoch = (n - 25569) * 86400 * 1000;
      return formatDate(new Date(epoch));
    }
    return null;
  }
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return pad(m[1], m[2], m[3]);
  m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let a = +m[1], b = +m[2], y = +m[3];
    if (y < 100) y += 2000;
    let dd, mm;
    if (a > 12 && b <= 12) { dd = a; mm = b; } else { dd = b; mm = a; }
    return pad(String(y), mm, dd);
  }
  m = v.match(/^(\d{1,2})\s*-\s*([A-Za-z]{3,9})\.?,?\s*(\d{2,4})/);
  if (m) { const mm = MONTHS[m[2].toLowerCase().slice(0, 3)]; if (mm) { let y = +m[3]; if (y < 100) y += 2000; return pad(String(y), mm, +m[1]); } }
  m = v.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{2,4})/);
  if (m) { const mm = MONTHS[m[1].toLowerCase().slice(0, 3)]; if (mm) { let y = +m[3]; if (y < 100) y += 2000; return pad(String(y), mm, +m[2]); } }
  return null;
}

function pad(y, m, d) {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

function formatDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function strVal(v) {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

export function parseProgress(value, status) {
  if (value == null || String(value).trim() === '') return null;
  const v = String(value).trim();
  let m = v.match(/^(\d+(?:[.,]\d+)?)\s*%/);
  if (m) return clampNum(parseFloat(m[1].replace(',', '.')), 0, 100);
  m = v.match(/^(\d+(?:[.,]\d+)?)$/);
  if (m) {
    const n = parseFloat(m[1].replace(',', '.'));
    if (n > 1) return clampNum(n, 0, 100);
    return clampNum(n * 100, 0, 100);
  }
  const s = normToken(status || '') + '|' + normToken(v);
  if (/selesai|complete|done|finish/.test(s)) return 100;
  if (/progress|berjalan|on.?going|in.?progress|active/.test(s)) return 50;
  if (/start|belum|not.?started|pending|planned/.test(s)) return 0;
  if (/blocked|stuck|terhambat/.test(s)) return 20;
  if (/overdue|late|telat|terlambat/.test(s)) return 30;
  return null;
}

export function parseStatus(value, progress) {
  if (progress != null && progress === 100) return 'Completed';
  const v = normToken(value || '');
  if (/selesai|done|complete|closed|finish|closedout/.test(v)) return 'Completed';
  if (/overdue|late|terlambat|telat/.test(v)) return 'Overdue';
  if (/blocked|stuck|terhambat|hold/.test(v)) return 'Blocked';
  if (/progress|berjalan|ongoing|active|in.?progress|started|work/.test(v)) return 'In Progress';
  if (/not.?started|belum|pending|planned|open|todo|new/.test(v)) return 'Not Started';
  return progress != null ? (progress > 0 ? 'In Progress' : 'Not Started') : 'Not Started';
}

export function parseNumber(value) {
  if (value == null) return null;
  const v = String(value).replace(/Rp\s?/i, '').replace(/[^0-9.,]/g, '');
  if (!v) return null;
  const cleaned = v.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parsePriority(value) {
  const v = normToken(value || '');
  if (/high|tinggi|critical|urgent|p1|immediate/.test(v)) return 'High';
  if (/med|sedang|normal|p2/.test(v)) return 'Medium';
  if (/low|rendah|p3|p4|backlog/.test(v)) return 'Low';
  return 'Medium';
}

export function clampNum(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function safeText(v) {
  return String(v == null ? '' : v).trim();
}