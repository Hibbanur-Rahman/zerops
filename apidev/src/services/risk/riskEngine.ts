import { compareRiskLevelDesc, scoreToRiskLevel, type RiskLevel } from '../../constants/riskLevels.js';
import { evaluateKnownVulnerabilities } from './riskFactors/knownVulnerabilities.js';
import { evaluateInstallScripts } from './riskFactors/installScripts.js';
import { evaluatePackageAge } from './riskFactors/packageAge.js';
import { evaluateMaintenanceActivity } from './riskFactors/maintenanceActivity.js';
import { evaluateMaintainerChanges } from './riskFactors/maintainerChanges.js';
import { evaluateTyposquatting } from './riskFactors/typosquatting.js';
import { evaluateVersionChange } from './riskFactors/versionChange.js';
import type { RiskFactorContext, RiskFactorEvaluator, RiskFactorResult } from './types.js';

const EVALUATORS: RiskFactorEvaluator[] = [
  evaluateKnownVulnerabilities,
  evaluateInstallScripts,
  evaluatePackageAge,
  evaluateMaintenanceActivity,
  evaluateMaintainerChanges,
  evaluateTyposquatting,
  evaluateVersionChange,
];

export interface PackageRiskResult {
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactorResult[];
}

/**
 * Combines every triggered risk factor's individual 0-100 score into one
 * package-level score, deterministically:
 *
 *   riskScore = min(100, worst_factor + 0.15 * sum(all_other_factors))
 *
 * The single worst factor sets the floor at full weight (one CRITICAL
 * vulnerability alone should land in the CRITICAL band), while every
 * additional triggered factor still nudges the score up at a diminishing
 * 15% rate -- reflecting that a package with five separate concerns is
 * riskier than one with a single issue of the same severity, without
 * letting unrelated low-severity factors stack up to an inflated total.
 */
export function calculatePackageRisk(ctx: RiskFactorContext): PackageRiskResult {
  const factors = EVALUATORS.flatMap((evaluate) => evaluate(ctx));

  if (factors.length === 0) {
    return { riskScore: 0, riskLevel: 'LOW', factors: [] };
  }

  const sortedScores = factors.map((f) => f.score).sort((a, b) => b - a);
  const [worst, ...rest] = sortedScores;
  const riskScore = Math.min(100, Math.round(worst! + rest.reduce((sum, s) => sum + s * 0.15, 0)));

  return { riskScore, riskLevel: scoreToRiskLevel(riskScore), factors };
}

/** An analysis's overall risk is its single worst finding -- the convention most SCA tools report by. */
export function calculateOverallRisk(severities: RiskLevel[]): RiskLevel {
  if (severities.length === 0) return 'LOW';
  return [...severities].sort(compareRiskLevelDesc)[0]!;
}
