export function evaluateRisk(risk) {
  const p = clamp5(risk.probability);
  const i = clamp5(risk.impact);
  const afterP = clamp5(risk.afterProbability != null ? risk.afterProbability : risk.probability);
  const afterI = clamp5(risk.afterImpact != null ? risk.afterImpact : risk.impact);
  const score = p * i;
  const afterScore = afterP * afterI;
  const reduction = score > 0 ? Math.round(((score - afterScore) / score) * 100) : 0;
  return {
    before: { probability: p, impact: i, score, tier: tierOf(score) },
    after: { probability: afterP, impact: afterI, score: afterScore, tier: tierOf(afterScore) },
    reduction: Math.max(0, reduction),
  };
}

export function tierOf(score) {
  if (score >= 15) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
}

export function suggestedResponse(category, score) {
  const cat = String(category || '').toLowerCase();
  if (score >= 15) {
    if (/vendor/.test(cat)) return 'Transfer';
    return 'Avoid';
  }
  if (score >= 10) {
    if (/security/.test(cat)) return 'Transfer';
    if (/vendor/.test(cat)) return 'Transfer';
    return 'Mitigate';
  }
  if (/stakeholder|budget|cost/.test(cat)) return 'Accept';
  return 'Mitigate';
}

function clamp5(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(5, Math.round(v)));
}