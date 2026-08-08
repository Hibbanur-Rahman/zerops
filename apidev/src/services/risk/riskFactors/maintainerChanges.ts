import type { RiskFactorEvaluator } from '../types.js';

export const evaluateMaintainerChanges: RiskFactorEvaluator = (ctx) => {
  if (
    ctx.previousMaintainersCount === undefined ||
    ctx.metadata?.maintainersCount === undefined ||
    ctx.previousMaintainersCount === ctx.metadata.maintainersCount
  ) {
    return [];
  }

  const delta = ctx.metadata.maintainersCount - ctx.previousMaintainersCount;
  return [
    {
      factor: 'maintainer_change',
      severity: 'MODERATE' as const,
      score: 30,
      evidence: `${ctx.packageName}'s maintainer count changed from ${ctx.previousMaintainersCount} to ${ctx.metadata.maintainersCount} since it was last analyzed`,
      recommendation:
        delta < 0
          ? 'A maintainer was removed -- confirm this was intentional and the package has not been compromised'
          : 'A new maintainer was added -- unexpected ownership changes have preceded supply-chain attacks on popular packages',
    },
  ];
};
