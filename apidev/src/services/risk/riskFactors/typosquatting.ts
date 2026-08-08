import { POPULAR_NPM_PACKAGES } from '../popularPackages.js';
import type { RiskFactorEvaluator } from '../types.js';

/** Classic dynamic-programming Levenshtein (edit) distance. */
function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j++) dp[0]![j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
      }
    }
  }
  return dp[rows - 1]![cols - 1]!;
}

const MAX_SUSPICIOUS_DISTANCE = 2;

export const evaluateTyposquatting: RiskFactorEvaluator = (ctx) => {
  if (ctx.changeType !== 'added' || POPULAR_NPM_PACKAGES.includes(ctx.packageName)) return [];

  let closest: { name: string; distance: number } | null = null;
  for (const popular of POPULAR_NPM_PACKAGES) {
    // Skip pairs whose length alone rules out a close match -- keeps this O(n) check cheap.
    if (Math.abs(popular.length - ctx.packageName.length) > MAX_SUSPICIOUS_DISTANCE) continue;
    const distance = levenshteinDistance(ctx.packageName, popular);
    if (distance > 0 && distance <= MAX_SUSPICIOUS_DISTANCE && (!closest || distance < closest.distance)) {
      closest = { name: popular, distance };
    }
  }

  if (!closest) return [];

  return [
    {
      factor: 'typosquatting_similarity',
      severity: 'HIGH' as const,
      score: 60,
      evidence: `"${ctx.packageName}" is ${closest.distance} character edit(s) away from the popular package "${closest.name}"`,
      recommendation: `Double-check this is not a typo for "${closest.name}" before merging`,
    },
  ];
};
