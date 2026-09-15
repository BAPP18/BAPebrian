export function getScenarioList() {
  return SCENARIOS.map((s) => ({ id: s.id, title: s.title, category: s.category, day: s.day, total: s.total, progress: s.progress, planned: s.planned, situation: s.situation }));
}

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) || null;
}

export function evaluateScenario(scenario, optionKey) {
  const opt = (scenario.options || []).find((o) => o.key === optionKey);
  if (!opt) return null;
  const impacts = ['schedule', 'cost', 'risk', 'quality', 'stakeholder'].map((k) => ({ key: k, label: labelOf(k), value: opt.impacts[k] }));
  const total = impacts.reduce((a, b) => a + b.value, 0);
  const best = (scenario.options || []).reduce((a, b) => Math.max(a, scoreOf(b)), 0);
  const rating = total >= 6 ? 'Recommended' : total >= 3 ? 'Acceptable' : 'High Risk';
  const balance = total >= best ? 'most balanced across the five dimensions for this scenario.' : 'a possible choice, but it trades off one or more dimensions.';
  return { option: opt, impacts, total, best, rating, balance, tradeOffs: opt.tradeOffs };
}

function scoreOf(o) {
  return Object.values(o.impacts || {}).reduce((a, b) => a + b, 0);
}

function labelOf(k) {
  return { schedule: 'Schedule Impact', cost: 'Cost Impact', risk: 'Risk Impact', quality: 'Quality Impact', stakeholder: 'Stakeholder Impact' }[k] || k;
}

const SCENARIOS = [
  {
    id: 's1', category: 'Schedule Delay', title: 'Network Upgrade — Day 18/30', day: 18, total: 30, progress: 58, planned: 72,
    situation: 'Vendor delivery is delayed by 5 days and two network engineers are unavailable during the next week. Project is falling behind the baseline.',
    options: [
      { key: 'A', label: 'Add temporary resources', impacts: { schedule: 2, cost: -1, risk: 1, quality: 1, stakeholder: 1 }, tradeOffs: 'Faster recovery but higher cost and ramp-up time for new people.' },
      { key: 'B', label: 'Extend the timeline', impacts: { schedule: 1, cost: 0, risk: 2, quality: 2, stakeholder: -1 }, tradeOffs: 'Protects quality and team continuity but pushes the target date.' },
      { key: 'C', label: 'Reduce scope for this wave', impacts: { schedule: 2, cost: 2, risk: 1, quality: -1, stakeholder: -2 }, tradeOffs: 'Meets schedule but cuts deliverables and may disappoint business users.' },
      { key: 'D', label: 'Escalate and rebaseline', impacts: { schedule: -1, cost: 1, risk: 3, quality: 2, stakeholder: 1 }, tradeOffs: 'Formal rebaseline clears expectations but appears as a schedule slip to sponsors.' },
    ],
  },
  {
    id: 's2', category: 'Vendor Delay', title: 'Hardware Refresh — Delivery Slip', day: 10, total: 30, progress: 20, planned: 33,
    situation: 'The main vendor moved the delivery date by 10 days. Staging and rollout order depend on hardware arrival.',
    options: [
      { key: 'A', label: 'Request partial delivery', impacts: { schedule: 2, cost: 1, risk: 2, quality: 1, stakeholder: 1 }, tradeOffs: 'Starts rollout sooner but adds logistics complexity.' },
      { key: 'B', label: 'Switch to approved backup vendor', impacts: { schedule: 1, cost: -1, risk: -1, quality: 0, stakeholder: 1 }, tradeOffs: 'Higher unit cost for schedule certainty.' },
      { key: 'C', label: 'Shift the rollout schedule', impacts: { schedule: -1, cost: 0, risk: 1, quality: 2, stakeholder: -1 }, tradeOffs: 'Lowest effort but delays user-facing value.' },
      { key: 'D', label: 'Accept delay and re-sequence', impacts: { schedule: -2, cost: 0, risk: 2, quality: 2, stakeholder: -1 }, tradeOffs: 'Accept the new date; adjust dependency order to keep staging useful.' },
    ],
  },
  {
    id: 's3', category: 'Resource Shortage', title: 'App Deployment — QA Burnout', day: 12, total: 30, progress: 40, planned: 40,
    situation: 'Two QA engineers resigned and the sprint backlog is growing. Testing is the critical path.',
    options: [
      { key: 'A', label: 'Reassign testers from another project', impacts: { schedule: 2, cost: 1, risk: 1, quality: 1, stakeholder: -1 }, tradeOffs: 'Fixes the critical path but creates conflict with the other project board.' },
      { key: 'B', label: 'Outsource test execution', impacts: { schedule: 2, cost: -1, risk: 2, quality: 1, stakeholder: 1 }, tradeOffs: 'Fast capacity but extra budget and handover overhead.' },
      { key: 'C', label: 'Reduce test coverage', impacts: { schedule: 2, cost: 2, risk: -2, quality: -2, stakeholder: -1 }, tradeOffs: 'Cheap and fast but increases defect risk — the cheapest option is not free.' },
      { key: 'D', label: 'Pull senior engineers into testing', impacts: { schedule: 2, cost: 1, risk: 1, quality: 1, stakeholder: 0 }, tradeOffs: 'Uses the strongest resources but reduces feature velocity.' },
    ],
  },
  {
    id: 's4', category: 'Critical Production Incident', title: 'Migration — Production Outage', day: 16, total: 30, progress: 55, planned: 53,
    situation: 'During a migration window a production service is down for 40 minutes. The incident is under investigation.',
    options: [
      { key: 'A', label: 'Roll back immediately', impacts: { schedule: -1, cost: 0, risk: 3, quality: 2, stakeholder: 2 }, tradeOffs: 'Restores service fast but consumes the rollback budget.' },
      { key: 'B', label: 'Fix forward on site', impacts: { schedule: 2, cost: 1, risk: -1, quality: 1, stakeholder: -1 }, tradeOffs: 'Keeps the migration going but extends downtime risk.' },
      { key: 'C', label: 'Investigate root cause first', impacts: { schedule: -1, cost: 0, risk: 1, quality: 1, stakeholder: 1 }, tradeOffs: 'Right answer long-term; slower short-term.' },
      { key: 'D', label: 'Declare incident and escalate', impacts: { schedule: 0, cost: 1, risk: 3, quality: 2, stakeholder: 2 }, tradeOffs: 'Formal incident process protects the business and the team.' },
    ],
  },
  {
    id: 's5', category: 'Scope Creep', title: 'Software Implementation — New Requests', day: 9, total: 30, progress: 30, planned: 30,
    situation: 'Business users keep adding requirements. Three new change requests arrived this week on top of the approved scope.',
    options: [
      { key: 'A', label: 'Accept all changes', impacts: { schedule: -2, cost: -2, risk: -1, quality: -1, stakeholder: 2 }, tradeOffs: 'Pleases users but blows the baseline.' },
      { key: 'B', label: 'Run formal change control', impacts: { schedule: 1, cost: 1, risk: 3, quality: 2, stakeholder: 1 }, tradeOffs: 'Structured, slower up-front, protects scope agreements.' },
      { key: 'C', label: 'Defer requests to phase 2', impacts: { schedule: 2, cost: 2, risk: 1, quality: 1, stakeholder: -1 }, tradeOffs: 'Keeps phase 1 on track; risk users feel unheard.' },
      { key: 'D', label: 'Add to budget and plan', impacts: { schedule: -1, cost: -1, risk: 2, quality: 1, stakeholder: 2 }, tradeOffs: 'Accommodates users with resource pressure.' },
    ],
  },
  {
    id: 's6', category: 'Budget Overrun', title: 'DC Maintenance — Cost Above Plan', day: 14, total: 25, progress: 56, planned: 56,
    situation: 'Overtime and materials pushed actual spend 18% above plan at 56% progress.',
    options: [
      { key: 'A', label: 'Request contingency budget', impacts: { schedule: 1, cost: -1, risk: 2, quality: 1, stakeholder: 1 }, tradeOffs: 'Formal approach; needs sponsor sign-off.' },
      { key: 'B', label: 'Reduce remaining scope', impacts: { schedule: 2, cost: 2, risk: 1, quality: -1, stakeholder: -2 }, tradeOffs: 'Controls cost but cuts value.' },
      { key: 'C', label: 'Optimize remaining activities', impacts: { schedule: 1, cost: 2, risk: 2, quality: 1, stakeholder: 1 }, tradeOffs: 'Best practice: replan the remaining work to recover variance.' },
      { key: 'D', label: 'Postpone non-critical work', impacts: { schedule: -1, cost: 2, risk: 1, quality: 1, stakeholder: 0 }, tradeOffs: 'Defers spend to next budget cycle.' },
    ],
  },
  {
    id: 's7', category: 'Failed UAT', title: 'Network Upgrade — UAT Rejected', day: 22, total: 30, progress: 74, planned: 73,
    situation: 'Business users rejected UAT results due to slow Wi-Fi throughput in two floors.',
    options: [
      { key: 'A', label: 'Investigate and fix perf issues', impacts: { schedule: -1, cost: 0, risk: 2, quality: 3, stakeholder: 2 }, tradeOffs: 'Delays sign-off but protects quality.' },
      { key: 'B', label: 'Schedule retest with users', impacts: { schedule: -1, cost: 0, risk: 2, quality: 2, stakeholder: 2 }, tradeOffs: 'Fresh evidence let, needs user time.' },
      { key: 'C', label: 'Caveat and accept', impacts: { schedule: 2, cost: 2, risk: -2, quality: -2, stakeholder: -2 }, tradeOffs: 'Delivers on schedule with unresolved issues.' },
      { key: 'D', label: 'Formal defect handling', impacts: { schedule: 0, cost: 1, risk: 3, quality: 2, stakeholder: 1 }, tradeOffs: 'Standard, transparent; slower closure.' },
    ],
  },
  {
    id: 's8', category: 'Hardware Delivery Delay', title: 'Hardware Refresh — Shipment Held', day: 8, total: 30, progress: 18, planned: 26,
    situation: 'Customs is holding the shipment; the confirmed delivery date slips by 7 days.',
    options: [
      { key: 'A', label: 'Use local buffer stock', impacts: { schedule: 2, cost: 1, risk: 1, quality: 1, stakeholder: 1 }, tradeOffs: 'Keeps momentum on critical seats.' },
      { key: 'B', label: 'Expedite customs clearance', impacts: { schedule: 2, cost: -1, risk: 2, quality: 1, stakeholder: 1 }, tradeOffs: 'Pays for priority clearance.' },
      { key: 'C', label: 'Reprioritize deployment order', impacts: { schedule: 1, cost: 1, risk: 2, quality: 1, stakeholder: 1 }, tradeOffs: 'Does valuable prep work while waiting.' },
      { key: 'D', label: 'Extend timeline formally', impacts: { schedule: -2, cost: 0, risk: 2, quality: 2, stakeholder: -1 }, tradeOffs: 'Clean plan but visible delay.' },
    ],
  },
  {
    id: 's9', category: 'Network Migration Failure', title: 'Migration — Cutover Failed', day: 20, total: 30, progress: 65, planned: 66,
    situation: 'First cutover attempt failed during VLAN sync; service was restored with rollback in 25 minutes.',
    options: [
      { key: 'A', label: 'Retry with corrected runbook', impacts: { schedule: 2, cost: 1, risk: 2, quality: 2, stakeholder: 1 }, tradeOffs: 'One more window; runbook improved.' },
      { key: 'B', label: 'Use parallel cutover', impacts: { schedule: 1, cost: -1, risk: 1, quality: 1, stakeholder: 2 }, tradeOffs: 'Breaks rollout into smaller pieces.' },
      { key: 'C', label: 'Stop and review plan', impacts: { schedule: -1, cost: 1, risk: 3, quality: 2, stakeholder: 1 }, tradeOffs: 'Conservative; delays cutover.' },
      { key: 'D', label: 'Escalate to architecture team', impacts: { schedule: 1, cost: 1, risk: 2, quality: 2, stakeholder: 0 }, tradeOffs: 'Brings expertise; adds dependencies.' },
    ],
  },
  {
    id: 's10', category: 'Stakeholder Conflict', title: 'Decommission — Inter-department Dispute', day: 11, total: 20, progress: 55, planned: 55,
    situation: 'IT Ops wants to decommission legacy servers now; audit wants to keep them until after the financial close.',
    options: [
      { key: 'A', label: 'Facilitate a joint decision', impacts: { schedule: 1, cost: 1, risk: 3, quality: 2, stakeholder: 3 }, tradeOffs: 'Best-practice stakeholder management; takes time.' },
      { key: 'B', label: 'Follow audit requirement', impacts: { schedule: -1, cost: 0, risk: 2, quality: 1, stakeholder: 1 }, tradeOffs: 'Compliance first; project delay.' },
      { key: 'C', label: 'Escalate to steering committee', impacts: { schedule: -1, cost: 0, risk: 2, quality: 1, stakeholder: 2 }, tradeOffs: 'Formal; adds waiting time.' },
      { key: 'D', label: 'Proceed with decommission', impacts: { schedule: 2, cost: 2, risk: -2, quality: -1, stakeholder: -3 }, tradeOffs: 'Fast but creates audit conflict.' },
    ],
  },
];