import type { DependencyChangeType } from '../../constants/enums.js';
import type { RiskLevel } from '../../constants/riskLevels.js';
import type { PackageMetadataResult, VulnerabilityResult } from '../security/SecurityProvider.js';

export interface RiskFactorContext {
  packageName: string;
  version: string;
  previousVersion?: string;
  isDirect: boolean;
  changeType: DependencyChangeType;
  vulnerabilities: VulnerabilityResult[];
  metadata: PackageMetadataResult | null;
  previousMaintainersCount?: number;
}

export interface RiskFactorResult {
  factor: string;
  severity: RiskLevel;
  score: number;
  evidence: string;
  recommendation: string;
}

export type RiskFactorEvaluator = (ctx: RiskFactorContext) => RiskFactorResult[];
