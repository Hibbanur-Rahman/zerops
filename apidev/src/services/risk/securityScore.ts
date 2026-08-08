const SEVERITY_PENALTY: Record<'CRITICAL' | 'SEVERE' | 'HIGH' | 'MODERATE' | 'LOW', number> = {
  CRITICAL: 25,
  SEVERE: 15,
  HIGH: 8,
  MODERATE: 3,
  LOW: 1,
};

export interface FindingSeverityCounts {
  critical: number;
  severe: number;
  high: number;
  moderate: number;
  low: number;
}

/**
 * Repository security score: 100 = excellent, 0 = extremely risky.
 * Deterministic: 100 minus a per-severity penalty, dampened by sqrt(count)
 * so repeated findings of the same severity have diminishing marginal
 * impact (ten LOW findings are worse than one, but not ten times worse) --
 * without dampening, a repo with dozens of low-severity findings could
 * score identically to one riddled with criticals once the score floors at 0.
 */
export function calculateSecurityScore(counts: FindingSeverityCounts): number {
  const penalty =
    SEVERITY_PENALTY.CRITICAL * Math.sqrt(counts.critical) +
    SEVERITY_PENALTY.SEVERE * Math.sqrt(counts.severe) +
    SEVERITY_PENALTY.HIGH * Math.sqrt(counts.high) +
    SEVERITY_PENALTY.MODERATE * Math.sqrt(counts.moderate) +
    SEVERITY_PENALTY.LOW * Math.sqrt(counts.low);

  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}
