export const RISK_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'SEVERE', 'CRITICAL'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

interface RiskBand {
  max: number;
  level: RiskLevel;
}

/** Score bands are inclusive of `max` and evaluated in ascending order. */
const RISK_BANDS: RiskBand[] = [
  { max: 20, level: 'LOW' },
  { max: 40, level: 'MODERATE' },
  { max: 60, level: 'HIGH' },
  { max: 80, level: 'SEVERE' },
  { max: 100, level: 'CRITICAL' },
];

export function scoreToRiskLevel(score: number): RiskLevel {
  const clamped = Math.max(0, Math.min(100, score));
  const band = RISK_BANDS.find((b) => clamped <= b.max);
  return band?.level ?? 'CRITICAL';
}

export const RISK_LEVEL_WEIGHT: Record<RiskLevel, number> = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  SEVERE: 4,
  CRITICAL: 5,
};

/** Higher risk level first, e.g. for sorting findings. */
export function compareRiskLevelDesc(a: RiskLevel, b: RiskLevel): number {
  return RISK_LEVEL_WEIGHT[b] - RISK_LEVEL_WEIGHT[a];
}
