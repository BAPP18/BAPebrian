import { normHeader, toISO, strVal, parseProgress, parseStatus, parsePriority, parseNumber, safeText } from './parse-util.js?v=1';

const TASK_NAME = ['taskname', 'task', 'activity', 'activityname', 'workitem', 'workpackage', 'deliverable', 'item', 'tugas', 'aktivitas', 'pekerjaan', 'namatugas'];
const TASK_OWNER = ['pic', 'owner', 'assignee', 'responsible', 'resource', 'team', 'penanggungjawab', 'pemilik', 'responsibleperson', 'picowner'];
const TASK_START = ['startdate', 'plannedstart', 'start', 'begin', 'mulai', 'tanggalmulai', 'earlystart'];
const TASK_END = ['enddate', 'plannedend', 'end', 'finish', 'duedate', 'deadline', 'targetend', 'tanggalakhir', 'selesai'];
const TASK_DURATION = ['duration', 'days', 'effort', 'durasi', 'waktu'];
const TASK_STATUS = ['status', 'taskstatus', 'state', 'kondisi'];
const TASK_PROGRESS = ['progress', 'percentcomplete', 'pctcomplete', 'complete', 'completion', 'kemajuan', 'persen', 'progresspct'];
const TASK_PRIORITY = ['priority', 'prioritas', 'level', 'severity', 'urgensi'];
const TASK_DEP = ['dependency', 'dependencies', 'predecessor', 'dependensi', 'prerequisite', 'linkedto'];
const TASK_MST = ['milestone', 'keydate', 'mst', 'phase', 'group'];
const TASK_BUDGET = ['budget', 'cost', 'estimate', 'plannedcost', 'nilai', 'anggaran', 'amount'];
const TASK_PROGRESS_PLAN = ['plannedprogress', 'plan', 'baseline', 'planned', 'targetprogress', 'planprogress'];

const RISK_DESC = ['risk', 'riskdesc', 'riskdescription', 'risiko', 'hazard', 'threat'];
const RISK_PROB = ['probability', 'likelihood', 'prob', 'kemungkinan', 'peluang'];
const RISK_IMPACT = ['impact', 'dampak', 'severity'];
const RISK_CAT = ['category', 'kategori', 'type'];
const RISK_MIT = ['mitigation', 'mitigationplan', 'mitigasi', 'countermeasure'];
const RISK_OWNER = ['riskowner', 'owner', 'pic', 'responsible', 'penanggungjawab'];
const RISK_RESPONSE = ['response', 'strategy', 'respon'];
const RISK_STATUS = ['riskstatus', 'status'];

function pick(cols, dict) {
  for (const c of cols) {
    const key = normHeader(c);
    if (key && dict.includes(key)) return c;
  }
  return null;
}

function emptyExtraction() {
  return { name: null, objective: null, description: null, startDate: null, endDate: null, budget: null, status: null, progress: null, plannedProgress: null, tasks: [], risks: [], milestones: [], stakeholders: [], issues: [], resources: [], notes: [], warnings: [], scanned: false };
}

export function parseExcelArrayBuffer(arrayBuffer, fileMeta) {
  const ext = emptyExtraction();
  const XLSX = window.XLSX;
  let wb;
  try {
    wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  } catch (err) {
    ext.warnings.push(`Invalid Excel: ${fileMeta && fileMeta.name ? fileMeta.name : 'file'} could not be read.`);
    return ext;
  }
  if (!wb.SheetNames.length) {
    ext.warnings.push('Excel file has no worksheets.');
    return ext;
  }

  const sheetData = wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: false }),
  }));

  scanMetaSheets(sheetData, ext);
  const taskInfo = scanTaskSheet(sheetData, ext);
  const riskInfo = scanRiskSheet(sheetData, ext);
  if (taskInfo.sheet === null) {
    ext.warnings.push('No worksheet with a Task or Activity column was found. Add a header row containing e.g. "Task" / "Start Date" / "Owner".');
  }
  if (riskInfo.sheet === null) {
    ext.warnings.push('No risk sheet detected. Risks are only imported when a worksheet has a "Risk" column.');
  }
  ext.notes.push(`Parsed ${wb.SheetNames.length} worksheet(s).`);
  return ext;
}

function scanMetaSheets(sheetData, ext) {
  const keys = [
    ['project', 'name'], ['projectname', 'name'], ['projectid', 'name'],
    ['objective', 'objective'], ['goal', 'objective'], ['tujuan', 'objective'],
    ['scope', 'description'], ['description', 'description'], ['deskripsi', 'description'],
    ['startdate', 'startDate'], ['start', 'startDate'], ['projectstart', 'startDate'],
    ['enddate', 'endDate'], ['end', 'endDate'], ['projectend', 'endDate'], ['finishdate', 'endDate'],
    ['duration', 'duration'], ['durasi', 'duration'],
    ['budget', 'budget'], ['totalbudget', 'budget'], ['value', 'budget'], ['nilai', 'budget'], ['anggaran', 'budget'],
    ['status', 'status'], ['projectstatus', 'status'],
    ['progress', 'progress'], ['plannedprogress', 'plannedProgress'],
  ];
  for (const sheet of sheetData) {
    for (const row of sheet.rows) {
      if (!Array.isArray(row) || row.length < 2) continue;
      let keyTok = null, val = null;
      for (let i = 0; i < row.length; i++) {
        const t = normHeader(row[i]);
        if (!t) continue;
        if (keys.some((k) => k[0] === t)) { keyTok = t; val = row[i + 1]; break; }
      }
      if (!keyTok) continue;
      const map = keys.find((k) => k[0] === keyTok);
      const field = map[1];
      if (field === 'budget') {
        const n = parseNumber(val);
        if (n != null && ext.budget == null) ext.budget = n;
        continue;
      }
      if (field === 'startDate' || field === 'endDate') {
        const iso = toISO(val);
        if (iso && ext[field] == null) ext[field] = iso;
        continue;
      }
      if (field === 'progress' || field === 'plannedProgress') {
        const p = parseProgress(val);
        if (p != null && ext[field] == null) ext[field] = p;
        continue;
      }
      if ((field === 'name' || field === 'objective' || field === 'description' || field === 'status') && ext[field] == null) {
        ext[field] = safeText(val);
      }
    }
  }
}

function scanTaskSheet(sheetData, ext) {
  let best = { sheet: null, score: -1, header: [] };
  for (const sheet of sheetData) {
    const header = findHeaderRow(sheet.rows);
    if (header === null) continue;
    let hits = 0;
    for (const h of header) {
      const tok = normHeader(h);
      if (TASK_NAME.includes(tok) || TASK_START.includes(tok) || TASK_END.includes(tok)) hits++;
    }
    if (hits > best.score) { best = { sheet: sheet.name, score: hits, header }; }
  }
  if (best.sheet === null) return best;

  const sheet = sheetData.find((s) => s.name === best.sheet);
  const header = best.header;
  const col = {};
  col.name = pick(header, TASK_NAME);
  col.owner = pick(header, TASK_OWNER);
  col.start = pick(header, TASK_START);
  col.end = pick(header, TASK_END);
  col.duration = pick(header, TASK_DURATION);
  col.status = pick(header, TASK_STATUS);
  col.progress = pick(header, TASK_PROGRESS);
  col.priority = pick(header, TASK_PRIORITY);
  col.dep = pick(header, TASK_DEP);
  col.mst = pick(header, TASK_MST);
  col.budget = pick(header, TASK_BUDGET);
  col.planned = pick(header, TASK_PROGRESS_PLAN);

  if (!col.name) {
    ext.warnings.push('Task sheet detected but no unambiguous Task/Activity column was found.');
    return best;
  }
  const start = sheet.rows.findIndex((r) => shallowEq(r, header));
  const rows = sheet.rows.slice(start + 1);
  let id = 0;
  for (const row of rows) {
    if (!Array.isArray(row) || row.length === 0) continue;
    const get = (c) => row[header.indexOf(c)];
    const name = safeText(get(col.name));
    if (!name) continue;
    id++;
    const startIso = toISO(get(col.start));
    const endIso = toISO(get(col.end));
    const progress = parseProgress(get(col.progress), get(col.status));
    const status = parseStatus(get(col.status), progress);
    const mstFlag = safeText(get(col.mst));
    const dur = parseNumber(get(col.duration));
    ext.tasks.push({
      id: `t${id}`,
      name: stripLabel(name),
      description: '',
      owner: safeText(get(col.owner)),
      status,
      priority: parsePriority(get(col.priority)),
      startDate: startIso,
      endDate: endIso,
      duration: dur != null && dur > 0 && dur < 100000 ? dur : (startIso && endIso ? null : null),
      progress: progress != null ? progress : (status === 'Completed' ? 100 : 0),
      dependency: safeText(get(col.dep)),
      milestone: mstFlag !== '',
    });
    if (mstFlag !== '' && endIso) {
      ext.milestones.push({ id: `pm-m${ext.milestones.length + 1}`, name: mstFlag, dueDate: endIso, status: status === 'Completed' ? 'Completed' : 'Upcoming' });
    }
    const b = parseNumber(get(col.budget));
    if (b != null) { if (ext.budget == null) ext.budget = 0; ext.budget += b; }
    if (status === 'Overdue') ext.warnings.push(`Overdue task detected: "${name}".`);
  }
  ext.notes.push(`Task sheet "${best.sheet}": ${ext.tasks.length} task(s) imported.`);
  return best;
}

function scanRiskSheet(sheetData, ext) {
  let best = { sheet: null, score: -1, header: [] };
  for (const sheet of sheetData) {
    const header = findHeaderRow(sheet.rows);
    if (header === null) continue;
    const tokens = header.map(normHeader);
    if (tokens.some((t) => RISK_DESC.includes(t))) {
      const hits = tokens.filter((t) => RISK_DESC.includes(t) || RISK_PROB.includes(t) || RISK_IMPACT.includes(t)).length;
      if (hits > best.score) { best = { sheet: sheet.name, score: hits, header }; }
    }
  }
  if (best.sheet === null) return best;
  const sheet = sheetData.find((s) => s.name === best.sheet);
  const header = best.header;
  const col = {
    desc: pick(header, RISK_DESC),
    prob: pick(header, RISK_PROB),
    impact: pick(header, RISK_IMPACT),
    cat: pick(header, RISK_CAT),
    mit: pick(header, RISK_MIT),
    owner: pick(header, RISK_OWNER),
    response: pick(header, RISK_RESPONSE),
    status: pick(header, RISK_STATUS),
  };
  if (!col.desc) return best;
  const start = sheet.rows.findIndex((r) => shallowEq(r, header));
  let id = 0;
  for (const row of sheet.rows.slice(start + 1)) {
    if (!Array.isArray(row)) continue;
    const get = (c) => row[header.indexOf(c)];
    const desc = safeText(get(col.desc));
    if (!desc) continue;
    id++;
    const prob = Math.max(1, Math.min(5, Math.round(parseNumber(get(col.prob)) || 1)));
    const impact = Math.max(1, Math.min(5, Math.round(parseNumber(get(col.impact)) || 1)));
    ext.risks.push({
      id: `r${id}`,
      description: stripLabel(desc),
      probability: prob,
      impact,
      score: prob * impact,
      category: safeText(get(col.cat)) || 'General',
      owner: safeText(get(col.owner)),
      mitigation: safeText(get(col.mit)),
      response: safeText(get(col.response)) || 'Mitigate',
      status: safeText(get(col.status)) || 'Open',
    });
  }
  ext.notes.push(`Risk sheet "${best.sheet}": ${ext.risks.length} risk(s) imported.`);
  return best;
}

function findHeaderRow(rows) {
  let best = { idx: -1, score: 0, header: null };
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const texts = row.map((c) => safeText(c)).filter(Boolean);
    if (texts.length < 2) continue;
    const toks = texts.map(normHeader);
    let score = 0;
    const all = TASK_NAME.concat(TASK_OWNER, TASK_START, TASK_END, TASK_PROGRESS, TASK_STATUS, RISK_DESC, RISK_PROB, RISK_IMPACT);
    for (const t of toks) if (all.includes(t)) score++;
    if (score > best.score) { best = { idx: i, score, header: texts }; }
  }
  return best.score >= 2 ? best.header : null;
}

function shallowEq(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (safeText(a[i]) !== safeText(b[i])) return false;
  return true;
}

function stripLabel(s) {
  const m = s.match(/^[\d.]+[)]?\s*[-:.\s]*(.+)$/);
  return m ? m[1].trim() : s;
}