export const HEALTH_CFG = {
  weights: { schedule: 0.25, budget: 0.2, scope: 0.15, risk: 0.2, resource: 0.1, quality: 0.1 },
  schedule: { varHigh: 20, varMed: 9, varHighPen: 22, varMedPen: 12, varLowPen: 5, overduePen: 3, overdueCap: 12, blockedPen: 2, blockedCap: 6, delayPen: 3, delayCap: 6 },
  budget: { overPen: 22, varHigh: 15, varMed: 6, varHighPen: 14, varMedPen: 8, exceedPen: 12 },
  scope: { issuePen: 3, issueCap: 12, blockedPen: 2, blockedCap: 10, noOwnerPen: 1, noOwnerCap: 8 },
  risk: { critical: 11, high: 5, medium: 3, low: 1, minScore: 25 },
  resource: { overduePen: 3, overdueCap: 12, blockedPen: 3, blockedCap: 15, noResourcePen: 15 },
  quality: { base: 82, completedBonusMax: 22, blockedPen: 3, blockedCap: 10, issuePen: 5, issueCap: 15 },
};

export function computeHealth(project) {
  const cfg = HEALTH_CFG;
  const tasks = project.tasks || [];
  const risks = project.risks || [];
  const issues = project.issues || [];
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const overdue = tasks.filter((t) => t.status === 'Overdue').length;
  const blocked = tasks.filter((t) => t.status === 'Blocked').length;
  const notStarted = tasks.filter((t) => t.status === 'Not Started').length;
  const openIssues = issues.filter((i) => (i.status || 'Open').toLowerCase() !== 'closed').length;
  const rationale = [];

  let schedule = 100 - varPenalty(project) - cap(overdue * cfg.schedule.overduePen, cfg.schedule.overdueCap) - cap(blocked * cfg.schedule.blockedPen, cfg.schedule.blockedCap) - cap(delayedMilestones(project).length * cfg.schedule.delayPen, cfg.schedule.delayCap);
  schedule = Math.max(0, Math.round(schedule));
  const varPct = variancePct(project);
  if (varPct > 0) rationale.push(`Schedule variance ${varPct.toFixed(1)}% (planned ${project.plannedProgress}% vs actual ${project.progress}%).`);
  if (overdue > 0) rationale.push(`${overdue} task(s) overdue.`);
  if (blocked > 0) rationale.push(`${blocked} task(s) blocked.`);
  const delayedMs = delayedMilestones(project);
  if (delayedMs.length) rationale.push(`Delayed milestone(s): ${delayedMs.map((m) => m.name).join(', ')}.`);

  let budget = 100;
  const earn = project.budget && project.progress != null ? (project.budget * project.progress) / 100 : null;
  if (project.budget && project.actualCost != null && project.progress != null) {
    const spendVar = project.actualCost - earn;
    const bVarPct = (spendVar / project.budget) * 100;
    let pen = 0;
    if (bVarPct > cfg.budget.varHigh) pen = cfg.budget.overPen;
    else if (bVarPct > cfg.budget.varMed) pen = cfg.budget.varHighPen;
    else if (bVarPct > 0) pen = cfg.budget.varMedPen;
    if (project.actualCost > project.budget) pen += cfg.budget.exceedPen;
    budget = Math.max(0, 100 - pen);
    if (bVarPct > 0) rationale.push(`Budget variance ${bVarPct.toFixed(1)}% (actual ${fmtRp(project.actualCost)} vs earned value ${fmtRp(Math.round(earn))}).`);
  }
  budget = Math.round(budget);

  let scope = 100 - cap(openIssues * cfg.scope.issuePen, cfg.scope.issueCap) - cap(blocked * cfg.scope.blockedPen, cfg.scope.blockedCap);
  if (tasks.length && project.tasks.some((t) => !t.owner)) {
    const n = project.tasks.filter((t) => !t.owner).length;
    scope -= Math.min(cfg.scope.noOwnerCap, n * cfg.scope.noOwnerPen);
  }
  scope = Math.max(0, Math.round(scope));
  if (openIssues > 0) rationale.push(`${openIssues} open issue(s).`);
  if (tasks.length && project.tasks.some((t) => !t.owner)) rationale.push('Some tasks have no assigned owner.');

  let risk = 100 - cap(sumRiskTier(risks), 100 - cfg.risk.minScore);
  risk = Math.max(cfg.risk.minScore, Math.round(risk));
  const criticalRisks = risks.filter((r) => r.score >= 15);
  const highRisks = risks.filter((r) => r.score >= 10 && r.score < 15);
  if (criticalRisks.length) rationale.push(`${criticalRisks.length} critical risk(s) (score >= 15).`);
  if (highRisks.length) rationale.push(`${highRisks.length} high risk(s) (score 10-14).`);
  if (!risks.length) rationale.push('No risk register detected.');

  let resource = 100 - cap(overdue * cfg.resource.overduePen, cfg.resource.overdueCap) - cap(blocked * cfg.resource.blockedPen, cfg.resource.blockedCap);
  if ((!project.resources || !project.resources.length) && tasks.length > 5) resource -= cfg.resource.noResourcePen;
  resource = Math.max(0, Math.round(resource));
  if ((!project.resources || !project.resources.length) && tasks.length > 5) rationale.push('No resource list found for a project with many tasks.');

  const frac = tasks.length > 0 ? completed / tasks.length : (project.progress || 0) / 100;
  let quality = cfg.quality.base + frac * cfg.quality.completedBonusMax - cap(blocked * cfg.quality.blockedPen, cfg.quality.blockedCap) - cap(openIssues * cfg.quality.issuePen, cfg.quality.issueCap);
  quality = Math.max(0, Math.min(100, Math.round(quality)));
  if (tasks.length) rationale.push(`Completion ratio ${completed}/${tasks.length} task(s).`);

  const dims = { schedule, budget, scope, risk, resource, quality };
  const overall = Math.round(Object.keys(dims).reduce((acc, k) => acc + dims[k] * cfg.weights[k], 0));
  const status = overall >= 80 ? 'GREEN' : overall >= 60 ? 'AMBER' : 'RED';

  const topRisks = risks.slice().sort((a, b) => b.score - a.score).slice(0, 3);
  const topIssues = issues.slice().filter((i) => (i.status || 'Open').toLowerCase() !== 'closed').sort((a, b) => prioNum(b.priority) - prioNum(a.priority)).slice(0, 3);
  const nextMilestone = (project.milestones || []).filter((m) => m.status !== 'Completed').sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];
  const behindDays = scheduleDaysBehind(project);

  const execSummary = {
    healthStatus: status,
    overall,
    progress: project.progress,
    planned: project.plannedProgress,
    scheduleNote: varPct > 0 ? `Behind plan by ${behindDays} day(s)` : 'On or ahead of plan',
    budgetNote: budgetNote(project, earn),
    topRisks: topRisks.map((r) => r.description),
    topIssues: topIssues.map((i) => i.title || i.description),
    nextMilestone: nextMilestone ? nextMilestone.name : null,
    nextMilestoneDate: nextMilestone ? nextMilestone.dueDate : null,
    recommendations: buildRecommendations({ project, dims, status, topRisks, topIssues, nextMilestone, behindDays, varPct }),
  };

  return { dimensions: dims, overall, status, rationale, execSummary, counts: { completed, inProgress, blocked, overdue, notStarted } };
}

function variancePct(project) {
  if (project.plannedProgress == null || project.plannedProgress === 0) return 0;
  return Math.max(0, ((project.plannedProgress - (project.progress || 0)) / project.plannedProgress) * 100);
}

function varPenalty(project) {
  const v = variancePct(project);
  const s = HEALTH_CFG.schedule;
  if (v > s.varHigh) return s.varHighPen;
  if (v > s.varMed) return s.varMedPen;
  if (v > 0) return s.varLowPen;
  return 0;
}

function scheduleDaysBehind(project) {
  const v = variancePct(project);
  const dur = project.duration || 1;
  return Math.max(0, Math.round((v / 100) * dur));
}

function budgetNote(project, earn) {
  if (project.budget == null || project.actualCost == null) return 'No budget data';
  const v = project.actualCost - (earn || 0);
  const pct = project.budget ? (v / project.budget) * 100 : 0;
  if (pct < -5) return 'Under spend';
  if (pct <= 5) return 'Within tolerance';
  if (pct <= 15) return 'Slightly over plan';
  return 'Over budget';
}

function buildRecommendations({ project, dims, status, topRisks, topIssues, nextMilestone, varPct }) {
  const recs = [];
  if (varPct > 0) recs.push('Review critical path and rebaseline the schedule.');
  if (topRisks.length) recs.push(`Confirm next actions on top risk: ${topRisks[0].description}.`);
  if (topIssues.length) recs.push(`Resolve top issue: ${topIssues[0].title || topIssues[0].description}.`);
  if (nextMilestone) recs.push(`Prepare for next milestone: ${nextMilestone.name} (${nextMilestone.dueDate}).`);
  if (dims.budget < 70) recs.push('Prepare a contingency budget request.');
  if (project.actualCost != null && project.budget != null && project.actualCost > project.budget) recs.push('Cost is over approved budget; escalate for funding approval.');
  if (dims.resource < 70) recs.push('Reallocate or add resources before next work wave.');
  if (!recs.length) recs.push('Maintain current control baseline and continue monitoring.');
  return recs.slice(0, 5);
}

function sumRiskTier(risks) {
  let sum = 0;
  for (const r of risks) {
    if (r.score >= 15) sum += HEALTH_CFG.risk.critical;
    else if (r.score >= 10) sum += HEALTH_CFG.risk.high;
    else if (r.score >= 5) sum += HEALTH_CFG.risk.medium;
    else sum += HEALTH_CFG.risk.low;
  }
  return sum;
}

function delayedMilestones(project) {
  return (project.milestones || []).filter((m) => m.status === 'Delayed');
}

function prioNum(p) {
  const s = String(p || '').toLowerCase();
  if (/high|critical/.test(s)) return 3;
  if (/med/.test(s)) return 2;
  return 1;
}

function cap(n, max) { return Math.min(max, Math.max(0, n)); }
function fmtRp(n) { return 'Rp' + Number(n || 0).toLocaleString('id-ID'); }

export function riskTier(score) {
  if (score >= 15) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

export function riskColor(score) {
  return score >= 15 ? '#fb7185' : score >= 10 ? '#fbbf24' : score >= 5 ? '#e879f9' : '#86efac';
}