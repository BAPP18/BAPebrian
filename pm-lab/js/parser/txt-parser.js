import { normToken, toISO, parseNumber, parseProgress, parseStatus, parsePriority, safeText } from './parse-util.js?v=1';

export function parseTextExtraction(text, sourceName) {
  const ext = { name: null, objective: null, description: null, startDate: null, endDate: null, budget: null, status: null, progress: null, plannedProgress: null, tasks: [], risks: [], milestones: [], stakeholders: [], issues: [], resources: [], notes: [], warnings: [], scanned: false };
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const headerMap = {};
  const kv = lines.filter((l) => /^[A-Za-z][A-Za-z0-9 /()._-]{2,}\s*[:\-]\s*\S/.test(l));
  for (const line of kv) {
    const idx = line.indexOf(':') === -1 ? line.indexOf('-') : line.indexOf(':');
    const key = normToken(line.slice(0, idx));
    const val = safeText(line.slice(idx + 1));
    if (!key || !val) continue;
    headerMap[key] = val;
  }
  mapMeta(headerMap, ext);
  ext.resources = parseRoles(lines, ext);
  ext.stakeholders = parseStakeholders(headerMap, lines);
  ext.tasks = parseTaskLines(lines, ext);
  ext.risks = parseRiskLines(lines);
  ext.notes.push(`Text source "${sourceName}": ${lines.length} line(s) scanned, ${ext.tasks.length} task(s) and ${ext.risks.length} risk(s) detected.`);
  return ext;
}

function mapMeta(map, ext) {
  const get = (arr) => arr.map((k) => map[k]).find((v) => v);
  ext.name = get(['project', 'projectname', 'projectid', 'nama'] );
  ext.objective = get(['objective', 'goal', 'tujuan']);
  ext.description = get(['scope', 'description', 'deskripsi']);
  ext.status = get(['status', 'projectstatus']);
  const s = toISO(get(['startdate', 'start', 'plannedstart', 'projectstart', 'tanggalmulai']));
  if (s) ext.startDate = s;
  const e = toISO(get(['enddate', 'end', 'plannedend', 'projectend', 'selesai', 'duedate']));
  if (e) ext.endDate = e;
  const b = parseNumber(get(['budget', 'totalbudget', 'value', 'nilai', 'anggaran']));
  if (b != null) ext.budget = b;
  const p = parseProgress(get(['progress', 'projectprogress']));
  if (p != null) ext.progress = p;
  const pp = parseProgress(get(['plannedprogress', 'plan', 'baseline', 'planned']));
  if (pp != null) ext.plannedProgress = pp;
}

function parseRoles(lines, ext) {
  const out = [];
  const match = lines.find((l) => /team|resources?|tim|anggota/i.test(l));
  if (match) {
    const val = match.replace(/^[^:]*[:]\s*/, '');
    val.split(/[,;|\n]+/).map((s) => s.trim()).filter((s) => s).slice(0, 12).forEach((role) => out.push({ name: role, role, workload: null }));
  }
  return out;
}

function parseStakeholders(map, lines) {
  const out = [];
  const val = map['stakeholders'] || map['stakeholder'];
  if (val) {
    val.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).slice(0, 12).forEach((name) => out.push({ name, role: 'Stakeholder', power: null, interest: null }));
  }
  return out;
}

const DATE_PAT = /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/;

function parseTaskLines(lines, ext) {
  const tasks = [];
  const seen = new Set();
  for (const line of lines) {
    if (/^[A-Za-z].*\s[:)\d]/.test(line) || DATE_PAT.test(line)) {
      const dates = line.match(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g) || [];
      let label = line.split(/\s{2,}|;|:/)[0].trim().replace(/^[\d.]+[)\s]*/, '');
      label = label.replace(/\s+\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}.*$/, '').trim();
      if (!label || label.length > 80 || seen.has(label) || !dates.length) continue;
      const start = toISO(dates[0]);
      const end = toISO(dates[1]) || toISO(dates[0]);
      if (!start) continue;
      seen.add(label);
      const statusLine = /overdue|late|terlambat/i.test(line) ? 'Overdue' : null;
      tasks.push({ id: `t${tasks.length + 1}`, name: label, description: '', owner: '', status: statusLine || 'In Progress', priority: 'Medium', startDate: start, endDate: end, duration: null, progress: 0, dependency: '', milestone: /milestone|keydate/i.test(line) });
      if (/milestone|keydate/i.test(line)) ext.milestones.push({ id: `m${ext.milestones.length + 1}`, name: label, dueDate: end, status: 'Upcoming' });
    }
  }
  return tasks;
}

function parseRiskLines(lines) {
  const risks = [];
  for (const line of lines) {
    const base = /risk|risiko|hazard|threat/i.test(line);
    if (!base) continue;
    const p = (line.match(/[Pp]:?\s*([1-5])/) || [])[1];
    const i = (line.match(/[Ii]:?\s*([1-5])/) || [])[1];
    let desc = line.replace(/^[^:]*[:]\s*/, '').trim();
    desc = desc.replace(/\s*\(?([Pp]:?\s*[1-5].*)$/, '').trim();
    if (!desc || desc.length > 120 || risks.length >= 20) continue;
    const prob = p ? +p : 3;
    const impact = i ? +i : 3;
    risks.push({ id: `r${risks.length + 1}`, description: desc, probability: prob, impact, score: prob * impact, category: 'General', owner: '', mitigation: '', response: 'Mitigate', status: 'Open' });
  }
  return risks;
}