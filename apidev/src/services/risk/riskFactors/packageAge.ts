import type { RiskFactorEvaluator } from '../types.js';

const NEW_PACKAGE_THRESHOLD_DAYS = 30;
const LOW_DOWNLOAD_THRESHOLD = 1000;

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

export const evaluatePackageAge: RiskFactorEvaluator = (ctx) => {
  const results = [];
  const publishedAt = ctx.metadata?.requestedVersionPublishedAt ?? ctx.metadata?.firstPublishedAt;

  if (ctx.changeType === 'added' && publishedAt) {
    const ageDays = daysSince(publishedAt);
    if (ageDays < NEW_PACKAGE_THRESHOLD_DAYS) {
      results.push({
        factor: 'new_package',
        severity: 'MODERATE' as const,
        score: 35,
        evidence: `${ctx.packageName}@${ctx.version} was published ${Math.max(0, Math.round(ageDays))} day(s) ago and is being added for the first time`,
        recommendation: 'New packages have a shorter track record -- review before merging, especially for new direct dependencies',
      });
    }
  }

  if (
    ctx.changeType === 'added' &&
    ctx.metadata?.weeklyDownloads !== undefined &&
    ctx.metadata.weeklyDownloads < LOW_DOWNLOAD_THRESHOLD
  ) {
    results.push({
      factor: 'low_adoption',
      severity: 'LOW' as const,
      score: 15,
      evidence: `${ctx.packageName} has only ${ctx.metadata.weeklyDownloads} weekly download(s)`,
      recommendation: 'Low-adoption packages receive less community security scrutiny -- confirm this is the intended dependency',
    });
  }

  return results;
};
