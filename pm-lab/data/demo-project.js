export const DEMO_PROJECT = {
  id: 'demo-network-upgrade',
  name: 'Enterprise Network Infrastructure Upgrade',
  description:
    'Replace 50 network switches across 10 floors with managed L3 equipment, re-cable access closets, and validate redundancy before cutover.',
  objective:
    'Deploy 50 new network switches, decommission legacy units, and achieve 99.9% core availability by end of month.',
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  duration: 30,
  status: 'In Progress',
  progress: 58,
  plannedProgress: 70,
  budget: 250000000,
  actualCost: 185000000,
  source: 'demo',
  tasks: TASKS(),
  milestones: MILESTONES(),
  risks: RISKS(),
  issues: ISSUES(),
  resources: RESOURCES(),
  stakeholders: STAKEHOLDERS(),
  documents: [
    { name: 'Network_Upgrade_Plan.xlsx', type: 'xlsx', status: 'parsed' },
    { name: 'PMO_Meeting_MOM.docx', type: 'docx', status: 'parsed' },
  ],
  assumptions: [
    'Temporary maintenance window approved for weekend cutover.',
    'Vendor provides remote support during switch replacement.',
  ],
};

function TASKS() {
  const base = [
    ['t1', 'Kick-off & stakeholder alignment', 'Project Coordinator', 'Completed', 'High', '2026-06-01', '2026-06-02', 2, 100, null, true],
    ['t2', 'Site survey (10 floors)', 'Network Engineer 1', 'Completed', 'High', '2026-06-01', '2026-06-05', 5, 100, 't1', false],
    ['t3', 'Finalize switch model & BOM', 'Project Coordinator', 'Completed', 'High', '2026-06-03', '2026-06-05', 3, 100, 't2', false],
    ['t4', 'Purchase order to vendor', 'Project Coordinator', 'Completed', 'High', '2026-06-04', '2026-06-05', 2, 100, 't3', false],
    ['t5', 'Vendor deliver switches (batch 1)', 'Vendor Engineer', 'Completed', 'High', '2026-06-08', '2026-06-10', 3, 100, 't4', false],
    ['t6', 'Receiving inspection & asset tagging', 'System Engineer', 'Completed', 'Medium', '2026-06-10', '2026-06-12', 3, 100, 't5', false],
    ['t7', 'Staging + baseline configuration', 'Network Engineer 1', 'In Progress', 'High', '2026-06-11', '2026-06-16', 6, 70, 't6', false],
    ['t8', 'Create cutover runbook', 'Network Engineer 2', 'Completed', 'High', '2026-06-12', '2026-06-17', 6, 100, 't7', false],
    ['t9', 'Prepare rollback plan', 'Network Engineer 2', 'In Progress', 'Medium', '2026-06-13', '2026-06-17', 5, 40, 't8', false],
    ['t10', 'Cable & patch panel audit floor 1-5', 'System Engineer', 'Completed', 'Medium', '2026-06-12', '2026-06-16', 5, 100, 't6', false],
    ['t11', 'Cable & patch panel audit floor 6-10', 'System Engineer', 'Completed', 'Medium', '2026-06-16', '2026-06-20', 5, 100, 't10', false],
    ['t12', 'Switch replacement floor 1-2', 'Network Engineer 1', 'Completed', 'High', '2026-06-17', '2026-06-19', 3, 100, 't7', false],
    ['t13', 'Switch replacement floor 3-4', 'Network Engineer 2', 'Completed', 'High', '2026-06-18', '2026-06-20', 3, 100, 't11', false],
    ['t14', 'Switch replacement floor 5-6', 'Network Engineer 1', 'In Progress', 'High', '2026-06-20', '2026-06-23', 4, 55, 't12', false],
    ['t15', 'Link aggregation & uplink config', 'Network Engineer 2', 'Blocked', 'High', '2026-06-21', '2026-06-24', 4, 20, 't14', false],
    ['t16', 'VLAN & ACL provisioning', 'Network Engineer 1', 'Blocked', 'Medium', '2026-06-22', '2026-06-25', 4, 15, 't15', false],
    ['t17', 'WiFi controller integration', 'Network Engineer 2', 'In Progress', 'Medium', '2026-06-24', '2026-06-26', 3, 30, 't16', false],
    ['t18', 'Monitoring & alerting (SNMP/Syslog)', 'System Engineer', 'In Progress', 'Medium', '2026-06-24', '2026-06-27', 4, 45, 't17', false],
    ['t19', 'Performance baseline capture', 'Network Engineer 1', 'Overdue', 'Low', '2026-06-25', '2026-06-27', 3, 35, 't18', false],
    ['t20', 'UAT with business users', 'Project Coordinator', 'Overdue', 'High', '2026-06-26', '2026-06-29', 4, 10, 't19', true],
    ['t21', 'Training for IT ops team', 'System Engineer', 'In Progress', 'Medium', '2026-06-26', '2026-06-28', 3, 25, 't18', false],
    ['t22', 'Decommission legacy switches', 'Network Engineer 2', 'Overdue', 'Medium', '2026-06-27', '2026-06-29', 3, 20, 't20', false],
    ['t23', 'Handover documentation pack', 'Project Coordinator', 'Completed', 'Medium', '2026-06-28', '2026-06-29', 2, 100, 't21', false],
    ['t24', 'Closure & lessons learned', 'Project Coordinator', 'Completed', 'Low', '2026-06-29', '2026-06-30', 2, 100, 't23', true],
    ['t25', 'Final acceptance sign-off', 'Project Coordinator', 'Completed', 'High', '2026-06-30', '2026-06-30', 1, 100, 't24', true],
  ];
  const owners = ['Project Coordinator', 'Network Engineer 1', 'Network Engineer 2', 'System Engineer', 'Vendor Engineer'];
  const priorities = ['High', 'Medium', 'Low', 'Low', 'High'];
  const progresses = [100, 100, 100, 100, 100, 100, 70, 100, 40, 100, 100, 100, 100, 55, 20, 15, 30, 45, 35, 10, 25, 20, 100, 100, 100];
  return base.map((r, i) => ({
    id: r[0],
    name: r[1],
    description: '',
    owner: r[2],
    status: r[3],
    priority: r[4],
    startDate: r[5],
    endDate: r[6],
    duration: r[7],
    progress: r[8],
    dependency: r[9],
    milestone: r[10],
  }));
}

function MILESTONES() {
  return [
    { id: 'm1', name: 'Initiation complete', dueDate: '2026-06-02', status: 'Completed' },
    { id: 'm2', name: 'BOM & PO approved', dueDate: '2026-06-05', status: 'Completed' },
    { id: 'm3', name: 'Switches delivered & tagged', dueDate: '2026-06-12', status: 'Completed' },
    { id: 'm4', name: 'All switches replaced', dueDate: '2026-06-25', status: 'Completed' },
    { id: 'm5', name: 'UAT complete', dueDate: '2026-06-29', status: 'Delayed' },
  ];
}

function RISKS() {
  return [
    { id: 'r1', description: 'Vendor delivery delayed by 5 days', probability: 5, impact: 4, category: 'Vendor', owner: 'Project Coordinator', mitigation: 'Track daily with vendor; request second batch expedite.', contingency: 'Activate contingency schedule (add 3 days on critical path).', response: 'Mitigate', status: 'Open', afterProbability: 2, afterImpact: 3 },
    { id: 'r2', description: 'Testing resource shortage (2 engineers unavailable)', probability: 4, impact: 3, category: 'Resource', owner: 'Project Coordinator', mitigation: 'Cross-train System Engineer; outsource weekend testing.', contingency: 'Pull in MSP partner for UAT support.', response: 'Mitigate', status: 'Open', afterProbability: 2, afterImpact: 2 },
    { id: 'r3', description: 'Switch configuration errors during cutover', probability: 5, impact: 2, category: 'Technical', owner: 'Network Engineer 1', mitigation: 'Double staging + config review checklist.', contingency: 'Rollback runbook; parallel routing config.', response: 'Mitigate', status: 'Open', afterProbability: 3, afterImpact: 2 },
    { id: 'r4', description: 'Unplanned network outage during replacement', probability: 3, impact: 3, category: 'Operational', owner: 'Network Engineer 2', mitigation: 'Maintenance window + redundant uplinks.', contingency: 'Immediate rollback + incident bridge.', response: 'Transfer', status: 'Open', afterProbability: 2, afterImpact: 2 },
    { id: 'r5', description: 'Budget overrun on cabling materials', probability: 2, impact: 3, category: 'Cost', owner: 'Project Coordinator', mitigation: 'Reuse existing patch leads where certified.', contingency: 'Request contingency fund approval.', response: 'Avoid', status: 'Open', afterProbability: 1, afterImpact: 3 },
    { id: 'r6', description: 'Business users not available for UAT', probability: 2, impact: 2, category: 'Stakeholder', owner: 'Project Coordinator', mitigation: 'Pre-schedule UAT slots with department heads.', contingency: 'Run UAT with IT ops representatives.', response: 'Accept', status: 'Open', afterProbability: 2, afterImpact: 1 },
    { id: 'r7', description: 'Incomplete as-built documentation', probability: 1, impact: 2, category: 'Technical', owner: 'System Engineer', mitigation: 'Walk-down after each floor; photo evidence.', contingency: 'Vendor as-built survey session.', response: 'Mitigate', status: 'Open', afterProbability: 1, afterImpact: 1 },
  ].map((r) => ({ ...r, score: r.probability * r.impact }));
}

function ISSUES() {
  return [
    { id: 'i1', title: 'Vendor switch batch 2 delayed', description: 'Second delivery rescheduled by vendor due to stock.', status: 'Open', priority: 'High', owner: 'Project Coordinator', date: '2026-06-18' },
    { id: 'i2', title: 'Testing engineers needed for UAT', description: 'Two network engineers unavailable during UAT window.', status: 'Open', priority: 'High', owner: 'Project Coordinator', date: '2026-06-20' },
  ];
}

function RESOURCES() {
  return [
    { name: 'Bayu Akbar Pebrian', role: 'Project Coordinator', workload: 100 },
    { name: 'Engineer A', role: 'Network Engineer 1', workload: 90 },
    { name: 'Engineer B', role: 'Network Engineer 2', workload: 95 },
    { name: 'Engineer C', role: 'System Engineer', workload: 75 },
    { name: 'Vendor Engineer', role: 'Field Deployment', workload: 60 },
  ];
}

function STAKEHOLDERS() {
  return [
    { name: 'CTO', role: 'Executive Sponsor', power: 5, interest: 3 },
    { name: 'IT Operations Head', role: 'Operations Owner', power: 4, interest: 5 },
    { name: 'Department Managers', role: 'Business Users', power: 2, interest: 4 },
    { name: 'Vendor Account Manager', role: 'Supplier', power: 3, interest: 4 },
  ];
}