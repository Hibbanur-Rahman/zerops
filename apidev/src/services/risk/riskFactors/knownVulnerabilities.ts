import { RISK_LEVEL_WEIGHT } from '../../../constants/riskLevels.js';
import type { RiskFactorContext, RiskFactorEvaluator, RiskFactorResult } from '../types.js';

/** Maps a vulnerability severity straight to a factor score (CVSS-derived where available). */
function severityToScore(severity: RiskFactorResult['severity'], cvssScore: number | undefined): number {
  if (cvssScore !== undefined) return Math.round(cvssScore * 10);
  return RISK_LEVEL_WEIGHT[severity] * 20;
}

export const evaluateKnownVulnerabilities: RiskFactorEvaluator = (ctx: RiskFactorContext) => {
  return ctx.vulnerabilities
    .filter((v) => !v.withdrawnAt)
    .map((vuln): RiskFactorResult => ({
      factor: 'known_vulnerability',
      severity: vuln.severity,
      score: severityToScore(vuln.severity, vuln.cvssScore),
      evidence: `${vuln.sourceId}: ${vuln.summary}${vuln.cvssScore ? ` (CVSS ${vuln.cvssScore.toFixed(1)})` : ''}`,
      recommendation: vuln.patchedVersion
        ? `Upgrade ${ctx.packageName} to ${vuln.patchedVersion} or later`
        : `Review ${vuln.sourceId} -- no patched version has been published yet`,
    }));
};
