import { normToken, toISO, parseNumber } from '../parser/parse-util.js?v=1';

export function mergeExtractions(extractions) {
  const project = {
    id: null,
    name: null,
    description: null,
    objective: null,
    startDate: null,
    endDate: null,
    duration: null,
    status: null,
    progress: null,
    plannedProgress: null,
    budget: null,
    actualCost: null,
    tasks: [],
    milestones: [],
    risks: [],
    issues: [],
    resources: [],
    stakeholders: [],
    documents: [],
    assumptions: [],
    source: 'upload',
    warnings: [],
  };

  const tasksByName = new Map();
  const PRIO = { xlsx: 0, xls: 0, csv: 0, docx: 1, txt: 2, text: 2, pdf: 2 };
  const items = extractions.filter((e) => e && e.ext)
    .sort((a, b) => (PRIO[a.meta.type] ?? 3) - (PRIO[b.meta.type] ?? 3));
  for (const { meta, ext } of items) {
    if (ext.name && !project.name) project.name = ext.name;
    if (ext.objective && !project.objective) project.objective = ext.objective;
    if (ext.description && !project.description) project.description = ext.description;
    if (ext.status && !project.status) project.status = ext.status;
    if (ext.budget && !project.budget) project.budget = ext.budget;
    if (ext.progress != null && project.progress == null) project.progress = Math.round(ext.progress);
    if (ext.plannedProgress != null && project.plannedProgress == null) project.plannedProgress = Math.round(ext.plannedProgress);
    if (ext.warnings) project.warnings.push(...ext.warnings.map((w) => `${meta.name}: ${w}`));
    project.documents.push({ name: meta.name, size: meta.size, type: meta.type, status: 'parsed' });

    for (const t of ext.tasks) {
      if (!t.name) continue;
      const key = normToken(t.name);
      if (!tasksByName.has(key)) tasksByName.set(key, t);
    }
    project.milestones = mergeById(project.milestones, ext.milestones || []);
    for (const r of ext.risks || []) {
      if (r.description && !project.risks.some((x) => normToken(x.description) === normToken(r.description))) project.risks.push(r);
    }
    project.resources = mergeByName(project.resources, ext.resources || []);
    project.stakeholders = mergeByName(project.stakeholders, ext.stakeholders || []);
  }

  project.tasks = Array.from(tasksByName.values());
  const dates = project.tasks.map((t) => t.startDate).filter(Boolean);
  const endDates = project.tasks.map((t) => t.endDate).filter(Boolean);
  if (!project.startDate && dates.length) project.startDate = minStr(dates);
  if (!project.endDate && endDates.length) project.endDate = maxStr(endDates);
  if (!project.name && project.tasks.length) {
    project.name = null;
  }
  if (project.startDate && project.endDate) {
    const diff = (new Date(project.endDate) - new Date(project.startDate)) / 86400000;
    project.duration = Math.max(1, Math.round(diff + 1));
  }
  return project;
}

export function computeConfidence(extractions, project) {
  const srcs = extractions.map((e) => e.meta.type);
  const hasXlsx = srcs.includes('xlsx') || srcs.includes('xls');
  const hasText = srcs.includes('text') || srcs.includes('pdf') || srcs.includes('docx') || srcs.includes('txt') || srcs.includes('csv');
  const fields = {
    name: project.name ? (hasXlsx ? 'High' : 'Medium') : 'Not found',
    duration: project.startDate && project.endDate ? (hasXlsx ? 'High' : 'Medium') : 'Not found',
    budget: (project.budget != null && project.budget > 0) ? (hasXlsx ? 'High' : 'Medium') : 'Not found',
    risks: project.risks.length ? (hasXlsx ? 'High' : 'Medium') : 'Not found',
    tasks: project.tasks.length ? (hasXlsx ? 'High' : 'Medium') : 'Not found',
  };
  if (project.name === null || project.name === '') fields.name = 'Not found';
  return fields;
}

export function uid(prefix) {
  return `${prefix || 'p'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getTemplates() {
  return TEMPLATES.map((t) => ({ key: t.key, label: t.label }));
}

export function createPlannedProject(input) {
  const tmpl = TEMPLATES.find((t) => t.key === input.type) || TEMPLATES[0];
  const duration = clamp(Math.max(1, Math.round(input.duration || 30)), 1, 1825);
  const team = splitTeam(input.team) || tmpl.teamRoles;
  const budget = parseNumber(input.budget);
  const startIso = toISO(input.startDate) || isoDaysFromNow(7);
  const tasks = [];
  const milestones = [];
  let dayCursor = 0;
  let idx = 0;
  for (const phase of tmpl.phases) {
    const phaseStart = dayCursor;
    const phaseEffort = Math.max(1, Math.round((phase.share / 100) * duration));
    for (const item of phase.items) {
      const eff = Math.max(1, Math.round(item.effort));
      if (dayCursor >= duration) break;
      const s = addDays(startIso, dayCursor);
      const e = addDays(s, eff - 1);
      tasks.push({
        id: `t${++idx}`,
        name: item.name,
        description: '',
        owner: team[idx % team.length],
        status: 'Not Started',
        priority: idx % 3 === 0 ? 'High' : idx % 3 === 1 ? 'Medium' : 'Low',
        startDate: s,
        endDate: e,
        duration: eff,
        progress: 0,
        dependency: idx > 1 ? `t${idx - 1}` : '',
        milestone: item.milestone,
      });
      dayCursor += eff;
    }
    const mDate = addDays(startIso, Math.min(phaseStart + phaseEffort, duration - 1));
    if (phase.deliverable) {
      const mStatus = isPastStr(mDate) ? 'Completed' : 'Upcoming';
      milestones.push({ id: `m${milestones.length + 1}`, name: phase.deliverable, dueDate: mDate, status: mStatus });
    }
  }
  const risks = tmpl.risks.map((r, i) => ({ id: `r${i + 1}`, description: r.desc, probability: r.p, impact: r.i, score: r.p * r.i, category: r.cat, owner: team[i % team.length], mitigation: r.mit, response: 'Mitigate', status: 'Open' }));
  return {
    id: input.id || uid('plan'),
    name: input.name || 'Planned Project',
    objective: input.objective || null,
    description: input.scope || null,
    startDate: startIso,
    endDate: addDays(startIso, duration - 1),
    duration,
    status: 'Planning',
    progress: 0,
    plannedProgress: 0,
    budget: budget != null ? budget : null,
    actualCost: 0,
    tasks,
    milestones,
    risks,
    issues: [],
    resources: team.map((r, i) => ({ name: r, role: tmpl.teamRoles[i] || r, workload: 100 })),
    stakeholders: tmpl.stakeholders || [],
    documents: [],
    assumptions: tmpl.assumptions || [],
    source: 'planner',
    warnings: [],
  };
}

const TEMPLATES = [
  {
    key: 'network-upgrade', label: 'Network Upgrade', teamRoles: ['Project Coordinator', 'Network Engineer 1', 'Network Engineer 2', 'System Engineer', 'Vendor Engineer'],
    assumptions: ['Maintenance window approved for cutover.'],
    stakeholders: [{ name: 'CTO', role: 'Sponsor' }, { name: 'IT Operations Head', role: 'Operations Owner' }],
    phases: [
      { name: 'Initiation', share: 5, deliverable: 'Initiation complete', items: [{ name: 'Kick-off & stakeholder alignment', effort: 1 }, { name: 'Scope confirmation (sites & devices)', effort: 1 }] },
      { name: 'Planning', share: 12, deliverable: 'BOM approved', items: [{ name: 'Site survey & bandwidth analysis', effort: 2 }, { name: 'Switch model & BOM finalization', effort: 1 }, { name: 'Cutover & rollback plan', effort: 2 }, { name: 'Purchase order to vendor', effort: 1 }] },
      { name: 'Preparation', share: 18, deliverable: 'Switches staged & configured', items: [{ name: 'Delivery & receiving inspection', effort: 2 }, { name: 'Staging + baseline configuration', effort: 3 }, { name: 'Cable & patch panel audit', effort: 2 }, { name: 'Create config change request', effort: 1 }] },
      { name: 'Implementation', share: 35, deliverable: 'All switches replaced', items: [{ name: 'Rollout floor 1-2', effort: 2 }, { name: 'Rollout floor 3-4', effort: 2 }, { name: 'Rollout floor 5-6', effort: 2 }, { name: 'VLAN/ACL provisioning', effort: 2 }, { name: 'WiFi controller integration', effort: 2 }, { name: 'Uplink aggregation config', effort: 2 }] },
      { name: 'Testing', share: 15, deliverable: 'Performance baseline captured', items: [{ name: 'Link & redundancy tests', effort: 2 }, { name: 'Monitoring/SNMP/Syslog integration', effort: 2 }, { name: 'Performance baseline', effort: 1 }] },
      { name: 'UAT', share: 7, deliverable: 'UAT complete', items: [{ name: 'UAT with business users', effort: 2 }] },
      { name: 'Handover', share: 5, deliverable: 'Documentation handed over', items: [{ name: 'Training for IT ops', effort: 1 }, { name: 'Handover documentation pack', effort: 1 }] },
      { name: 'Closure', share: 3, deliverable: 'Project closed', items: [{ name: 'Lessons learned', effort: 0.5 }, { name: 'Final acceptance sign-off', effort: 0.5 }] },
    ],
    risks: [
      { desc: 'Vendor delivery delayed', p: 4, i: 4, cat: 'Vendor', mit: 'Track daily; expedite batch deliveries.' },
      { desc: 'Config errors during cutover', p: 4, i: 3, cat: 'Technical', mit: 'Double staging & review checklist.' },
      { desc: 'Unplanned outage during replacement', p: 3, i: 4, cat: 'Operational', mit: 'Maintenance window + redundant uplinks.' },
    ],
  },
  {
    key: 'server-migration', label: 'Server Migration', teamRoles: ['Project Coordinator', 'System Engineer', 'DB Administrator', 'Network Engineer', 'Vendor Engineer'],
    assumptions: ['Application owners available during migration window.'],
    stakeholders: [{ name: 'Head of IT', role: 'Sponsor' }, { name: 'App Owners', role: 'Business' }],
    phases: [
      { name: 'Initiation', share: 5, deliverable: 'Migration charter', items: [{ name: 'Kick-off & roles', effort: 1 }, { name: 'Application inventory', effort: 1 }] },
      { name: 'Planning', share: 15, deliverable: 'Migration plan approved', items: [{ name: 'Gap analysis (source vs target)', effort: 2 }, { name: 'Migration runbook', effort: 2 }, { name: 'Rollback strategy', effort: 1 }] },
      { name: 'Preparation', share: 20, deliverable: 'Target environment ready', items: [{ name: 'Build target VMs/OS', effort: 2 }, { name: 'Storage & backup provisioning', effort: 2 }, { name: 'Staging data sync', effort: 3 }] },
      { name: 'Implementation', share: 30, deliverable: 'Migration executed', items: [{ name: 'Copy data & verify', effort: 3 }, { name: 'Switchover application groups', effort: 2 }, { name: 'DNS/routing cutover', effort: 1 }] },
      { name: 'Testing', share: 15, deliverable: 'Functional tests pass', items: [{ name: 'Functional regression tests', effort: 2 }, { name: 'Performance & load tests', effort: 2 }] },
      { name: 'UAT', share: 6, deliverable: 'UAT complete', items: [{ name: 'Business UAT', effort: 1 }] },
      { name: 'Handover', share: 5, deliverable: 'Docs handed over', items: [{ name: 'Operations handover', effort: 1 }] },
      { name: 'Closure', share: 4, deliverable: 'Project closed', items: [{ name: 'Decommission source', effort: 1 }, { name: 'Lessons learned', effort: 0.5 }] },
    ],
    risks: [
      { desc: 'Data loss during sync', p: 3, i: 5, cat: 'Technical', mit: 'Full backup + checksum verification.' },
      { desc: 'Application incompatibility', p: 4, i: 3, cat: 'Technical', mit: 'Catalog dependencies early.' },
      { desc: 'Prolonged downtime', p: 3, i: 4, cat: 'Schedule', mit: 'Nightly batch cutover with rollback.' },
    ],
  },
  {
    key: 'hardware-refresh', label: 'Hardware Refresh', teamRoles: ['Project Coordinator', 'Desktop Engineer', 'Procurement', 'Asset Officer', 'Helpdesk'],
    assumptions: ['Users can schedule replacement slots.'],
    stakeholders: [{ name: 'Procurement', role: 'Supply' }, { name: 'Finance', role: 'Budget' }],
    phases: [
      { name: 'Initiation', share: 5, deliverable: 'Scope agreed', items: [{ name: 'Inventory & scope', effort: 1 }, { name: 'Kick-off', effort: 1 }] },
      { name: 'Planning', share: 15, deliverable: 'Order placed', items: [{ name: 'Baseline specs', effort: 1 }, { name: 'Order hardware', effort: 2 }, { name: 'Deployment schedule', effort: 1 }] },
      { name: 'Preparation', share: 15, deliverable: 'Units imaged', items: [{ name: 'Image & configure units', effort: 3 }, { name: 'Asset tagging', effort: 1 }] },
      { name: 'Implementation', share: 35, deliverable: 'Units deployed', items: [{ name: 'Rollout per department', effort: 4 }, { name: 'Scheduled user swaps', effort: 3 }] },
      { name: 'Testing', share: 10, deliverable: 'Units verified', items: [{ name: 'Post-deploy verification', effort: 2 }] },
      { name: 'UAT', share: 6, deliverable: 'User sign-off', items: [{ name: 'User acceptance', effort: 1 }] },
      { name: 'Handover', share: 5, deliverable: 'Assets recorded', items: [{ name: 'Handover & warranty record', effort: 1 }] },
      { name: 'Closure', share: 4, deliverable: 'Project closed', items: [{ name: 'Retire old units', effort: 1 }, { name: 'Closure report', effort: 0.5 }] },
    ],
    risks: [
      { desc: 'Hardware delivery delay', p: 4, i: 3, cat: 'Vendor', mit: 'Buffer stock for critical users.' },
      { desc: 'Image/app compatibility', p: 3, i: 3, cat: 'Technical', mit: 'Pilot deployment first.' },
    ],
  },
  {
    key: 'cve-patching', label: 'CVE Patching', teamRoles: ['Project Coordinator', 'Security Engineer', 'System Admin', 'Patch Mgmt'],
    assumptions: ['Vendors publish verified patches.'],
    stakeholders: [{ name: 'CISO', role: 'Sponsor' }, { name: 'Operations', role: 'Executor' }],
    phases: [
      { name: 'Initiation', share: 5, deliverable: 'Patch scope defined', items: [{ name: 'CVSS triage & scope', effort: 1 }] },
      { name: 'Planning', share: 15, deliverable: 'Patch plan approved', items: [{ name: 'Patch window scheduling', effort: 2 }, { name: 'Rollback plan', effort: 1 }] },
      { name: 'Preparation', share: 20, deliverable: 'Patches staged', items: [{ name: 'Test in staging', effort: 3 }, { name: 'Vulnerability rescan', effort: 2 }] },
      { name: 'Implementation', share: 30, deliverable: 'Patches applied', items: [{ name: 'Apply patch wave 1', effort: 2 }, { name: 'Apply patch wave 2', effort: 2 }] },
      { name: 'Testing', share: 15, deliverable: 'Verification done', items: [{ name: 'Post-patch regression', effort: 2 }, { name: 'Rescan & sign-off', effort: 1 }] },
      { name: 'Handover', share: 5, deliverable: 'Report issued', items: [{ name: 'Compliance report', effort: 1 }] },
      { name: 'Closure', share: 5, deliverable: 'Project closed', items: [{ name: 'Lessons learned', effort: 0.5 }] },
    ],
    risks: [
      { desc: 'Patch breaks application', p: 3, i: 4, cat: 'Operational', mit: 'Staging test first.' },
      { desc: 'No maintenance window', p: 3, i: 3, cat: 'Schedule', mit: 'Negotiate with business.' },
    ],
  },
  {
    key: 'app-deployment', label: 'Application Deployment', teamRoles: ['Project Coordinator', 'DevOps Engineer', 'QA Engineer', 'Developer'],
    assumptions: ['Deployment runbook exists.'],
    stakeholders: [{ name: 'Business Owner', role: 'Sponsor' }],
    phases: [
      { name: 'Initiation', share: 5, deliverable: 'Deployment planned', items: [{ name: 'Release scope & artifacts', effort: 1 }] },
      { name: 'Planning', share: 12, deliverable: 'Runbook approved', items: [{ name: 'Deployment runbook', effort: 2 }, { name: 'Environment readiness', effort: 1 }] },
      { name: 'Preparation', share: 20, deliverable: 'Release built', items: [{ name: 'Build & package', effort: 2 }, { name: 'Config & secrets setup', effort: 2 }] },
      { name: 'Implementation', share: 30, deliverable: 'Deployed to prod', items: [{ name: 'Staging deploy', effort: 2 }, { name: 'Production deploy', effort: 3 }] },
      { name: 'Testing', share: 18, deliverable: 'Tests pass', items: [{ name: 'Smoke & SIT', effort: 2 }, { name: 'Regression', effort: 2 }] },
      { name: 'UAT', share: 7, deliverable: 'UAT complete', items: [{ name: 'UAT sign-off', effort: 1 }] },
      { name: 'Handover', share: 5, deliverable: 'Docs in place', items: [{ name: 'Ops handover & training', effort: 1 }] },
      { name: 'Closure', share: 3, deliverable: 'Go-live review', items: [{ name: 'Go-live review', effort: 0.5 }] },
    ],
    risks: [
      { desc: 'Deployment fails blocking prod', p: 3, i: 5, cat: 'Operational', mit: 'Blue/green + instant rollback.' },
      { desc: 'Config drift', p: 3, i: 3, cat: 'Technical', mit: 'IaC + config validation.' },
    ],
  },
  {
    key: 'dc-maintenance', label: 'Data Center Maintenance', teamRoles: ['Project Coordinator', 'Facility Engineer', 'Electrical Engineer', 'NOC', 'Vendor'],
    assumptions: ['Maintenance window granted by DC provider.'],
    stakeholders: [{ name: 'DC Provider', role: 'Vendor' }, { name: 'IT Operations', role: 'Owner' }],
    phases: [
      { name: 'Initiation', share: 5, deliverable: 'MTP defined', items: [{ name: 'Define maintenance types', effort: 1 }] },
      { name: 'Planning', share: 15, deliverable: 'Plan approved', items: [{ name: 'Schedule window & checklist', effort: 2 }, { name: 'Risk assessment MTP', effort: 2 }] },
      { name: 'Preparation', share: 20, deliverable: 'Pre-maintenance checks', items: [{ name: 'Backup & snapshot prep', effort: 3 }, { name: 'Preventive checklist', effort: 1 }] },
      { name: 'Implementation', share: 30, deliverable: 'Maintenance executed', items: [{ name: 'Execute MTP tasks', effort: 3 }, { name: 'On-site monitoring', effort: 2 }] },
      { name: 'Testing', share: 12, deliverable: 'System verified', items: [{ name: 'Failover drills', effort: 2 }] },
      { name: 'Handover', share: 8, deliverable: 'Report submitted', items: [{ name: 'Maintenance report', effort: 1 }] },
      { name: 'Closure', share: 5, deliverable: 'Project closed', items: [{ name: 'Review & lessons', effort: 0.5 }] },
    ],
    risks: [
      { desc: 'Power/cooling incident during MTP', p: 2, i: 5, cat: 'Operational', mit: 'Redundant PDU + drill.' },
      { desc: 'Window overrun', p: 3, i: 3, cat: 'Schedule', mit: 'Strict timeline with contingency.' },
    ],
  },
  {
    key: 'asset-decommission', label: 'IT Asset Decommission', teamRoles: ['Project Coordinator', 'Asset Officer', 'Security Engineer', 'Data Wipe'],
    assumptions: ['Assets have been verified against CMDB.'],
    stakeholders: [{ name: 'Compliance', role: 'Audit' }],
    phases: [
      { name: 'Initiation', share: 8, deliverable: 'Asset list approved', items: [{ name: 'Collect asset list from CMDB', effort: 2 }] },
      { name: 'Planning', share: 15, deliverable: 'Plan approved', items: [{ name: 'Data sanitization plan', effort: 2 }, { name: 'Disposal compliance check', effort: 1 }] },
      { name: 'Preparation', share: 15, deliverable: 'Assets tagged', items: [{ name: 'Inventory & label', effort: 2 }] },
      { name: 'Implementation', share: 35, deliverable: 'Assets decommissioned', items: [{ name: 'Wipe & degauss', effort: 4 }, { name: 'Remove from service', effort: 3 }] },
      { name: 'Handover', share: 12, deliverable: 'Certificates issued', items: [{ name: 'Disposal certificates', effort: 2 }] },
      { name: 'Closure', share: 5, deliverable: 'Project closed', items: [{ name: 'Audit & closure', effort: 1 }] },
    ],
    risks: [
      { desc: 'Residual data on media', p: 2, i: 5, cat: 'Security', mit: 'Degauss + certificate.' },
      { desc: 'Asset missing from CMDB', p: 3, i: 3, cat: 'Operational', mit: 'Floor walk-down.' },
    ],
  },
  {
    key: 'software-implementation', label: 'Software Implementation', teamRoles: ['Project Coordinator', 'Analyst', 'Developer', 'QA', 'Trainer'],
    assumptions: ['Business process owners participate.'],
    stakeholders: [{ name: 'Business Process Owner', role: 'Sponsor' }],
    phases: [
      { name: 'Initiation', share: 6, deliverable: 'Charter signed', items: [{ name: 'Project charter & goals', effort: 1 }, { name: 'Stakeholder list', effort: 1 }] },
      { name: 'Planning', share: 18, deliverable: 'Plan approved', items: [{ name: 'Requirements workshop', effort: 3 }, { name: 'Solution blueprint', effort: 2 }, { name: 'Implementation plan', effort: 1 }] },
      { name: 'Preparation', share: 20, deliverable: 'System configured', items: [{ name: 'Environment setup', effort: 2 }, { name: 'Configuration & master data', effort: 3 }] },
      { name: 'Implementation', share: 25, deliverable: 'Build complete', items: [{ name: 'Build & integration', effort: 4 }, { name: 'Coding changes', effort: 3 }] },
      { name: 'Testing', share: 15, deliverable: 'Tests pass', items: [{ name: 'SIT scripted tests', effort: 3 }] },
      { name: 'UAT', share: 8, deliverable: 'UAT complete', items: [{ name: 'Business UAT', effort: 2 }] },
      { name: 'Handover', share: 5, deliverable: 'Training done', items: [{ name: 'Training & rollout', effort: 2 }] },
      { name: 'Closure', share: 3, deliverable: 'Project closed', items: [{ name: 'Closure & lessons', effort: 0.5 }] },
    ],
    risks: [
      { desc: 'Requirements change (scope creep)', p: 4, i: 3, cat: 'Scope', mit: 'Change request control.' },
      { desc: 'User adoption low', p: 3, i: 3, cat: 'Stakeholder', mit: 'Champions + training.' },
    ],
  },
];

function splitTeam(team) {
  if (!team) return null;
  const arr = String(team).split(/[,;|\n]+/).map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : null;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function isoDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isPastStr(iso) {
  return new Date(iso + 'T00:00:00') < new Date(new Date().toDateString());
}

function minStr(arr) { return arr.slice().sort()[0]; }
function maxStr(arr) { return arr.slice().sort().pop(); }

function mergeById(a, b) {
  const map = new Map();
  a.forEach((x) => map.set((x.id || x.name), x));
  for (const x of b || []) {
    const k = x.id || x.name || (x.dueDate + x.name);
    if (k && !map.has(k)) map.set(k, x);
  }
  return Array.from(map.values());
}

function mergeByName(a, b) {
  const map = new Map();
  a.forEach((x) => map.set(normToken(x.name || x.role || ''), x));
  for (const x of b || []) {
    const k = normToken(x.name || x.role || '');
    if (k && !map.has(k)) map.set(k, x);
  }
  return Array.from(map.values());
}