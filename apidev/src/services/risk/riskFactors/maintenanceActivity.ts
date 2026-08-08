import type { RiskFactorEvaluator } from '../types.js';

const ABANDONED_THRESHOLD_DAYS = 2 * 365;

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

export const evaluateMaintenanceActivity: RiskFactorEvaluator = (ctx) => {
  const results = [];

  if (ctx.metadata?.isDeprecated) {
    results.push({
      factor: 'deprecated_package',
      severity: 'HIGH' as const,
      score: 55,
      evidence: `${ctx.packageName} is marked deprecated: ${ctx.metadata.deprecationMessage ?? 'no reason given'}`,
      recommendation: 'Replace this dependency -- the maintainer has marked it deprecated',
    });
  }

  if (ctx.metadata?.lastPublishedAt && !ctx.metadata.isDeprecated) {
    const daysSincePublish = daysSince(ctx.metadata.lastPublishedAt);
    if (daysSincePublish > ABANDONED_THRESHOLD_DAYS) {
      results.push({
        factor: 'abandoned_package',
        severity: 'MODERATE' as const,
        score: 30,
        evidence: `${ctx.packageName} has not published a new version in over ${Math.round(daysSincePublish / 365)} year(s)`,
        recommendation: 'Consider whether an actively-maintained alternative exists for this dependency',
      });
    }
  }

  return results;
};
