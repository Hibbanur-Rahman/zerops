import semver from 'semver';
import type { RiskFactorEvaluator } from '../types.js';

export const evaluateVersionChange: RiskFactorEvaluator = (ctx) => {
  if (!ctx.previousVersion) return [];

  if (ctx.changeType === 'downgraded') {
    return [
      {
        factor: 'version_downgrade',
        severity: 'MODERATE' as const,
        score: 35,
        evidence: `${ctx.packageName} was downgraded from ${ctx.previousVersion} to ${ctx.version}`,
        recommendation: 'Downgrades are unusual -- confirm this is intentional and not a lockfile or merge error',
      },
    ];
  }

  if (ctx.changeType === 'updated') {
    try {
      const previousMajor = semver.major(ctx.previousVersion);
      const nextMajor = semver.major(ctx.version);
      if (nextMajor > previousMajor) {
        return [
          {
            factor: 'major_version_change',
            severity: 'LOW' as const,
            score: 20,
            evidence: `${ctx.packageName} was upgraded across a major version boundary: ${ctx.previousVersion} -> ${ctx.version}`,
            recommendation: 'Major version bumps can include breaking changes -- review the changelog',
          },
        ];
      }
    } catch {
      // non-semver version strings (git shas, etc.) -- nothing meaningful to compare
    }
  }

  return [];
};
