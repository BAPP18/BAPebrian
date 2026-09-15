export const insightProviders = {};

export const LocalRuleEngineProvider = {
  name: 'LocalRuleEngineProvider',
  async generateInsight(project, health) {
    const d = health ? health.dimensions : null;
    const parts = [];
    if (d) {
      if (health.execSummary && health.execSummary.scheduleNote.indexOf('Behind') === 0) {
        parts.push('Project progress is below the planned baseline. The primary concern is schedule variance combined with resource constraints.');
      } else if (d.schedule >= 80) {
        parts.push('Schedule execution is tracking close to the baseline.');
      } else {
        parts.push('Schedule execution is slightly off baseline; monitor the critical path.');
      }
      if (d.budget < 70) parts.push('Budget execution is running above the earned-value baseline; reinforce cost controls.');
      else if (d.budget < 85) parts.push('Budget utilization needs monitoring to avoid variance growth.');
      else parts.push('Budget utilization is healthy against earned value.');
      if ((project.risks || []).some((r) => r.score >= 15)) parts.push('At least one critical risk is open — confirm its mitigation owner and due date.');
      if ((project.issues || []).length) parts.push(`${project.issues.length} open issue(s) should be triaged to protect the baseline.`);
      if (d.quality >= 85) parts.push('Delivered work quality is high relative to completion.');
    }
    if (!parts.length) parts.push('No analyzable project data available yet.');
    return parts.join(' ');
  },
};

export function registerInsightProvider(name, provider) {
  insightProviders[name] = provider;
}

export async function generateInsight(project, health) {
  const p = insightProviders.local || LocalRuleEngineProvider;
  return p.generateInsight(project, health);
}

registerInsightProvider('local', LocalRuleEngineProvider);
registerInsightProvider('openai', null);
registerInsightProvider('ollama', null);