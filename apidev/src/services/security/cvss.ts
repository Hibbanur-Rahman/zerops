/**
 * CVSS v3.0/v3.1 base score calculator. Implements the official formula
 * (https://www.first.org/cvss/v3.1/specification-document section 7.1) so
 * severity is derived from the actual vector rather than guessed.
 */

type ScopeUnchangedMetrics = Record<string, number>;

const AV: ScopeUnchangedMetrics = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const AC: ScopeUnchangedMetrics = { L: 0.77, H: 0.44 };
const PR_UNCHANGED: ScopeUnchangedMetrics = { N: 0.85, L: 0.62, H: 0.27 };
const PR_CHANGED: ScopeUnchangedMetrics = { N: 0.85, L: 0.68, H: 0.5 };
const UI: ScopeUnchangedMetrics = { N: 0.85, R: 0.62 };
const CIA: ScopeUnchangedMetrics = { H: 0.56, L: 0.22, N: 0 };

function roundUp(value: number): number {
  const intInput = Math.round(value * 100000);
  if (intInput % 10000 === 0) return intInput / 100000;
  return (Math.floor(intInput / 10000) + 1) / 10;
}

export interface CvssResult {
  baseScore: number;
  vector: string;
}

/** Parses a CVSS v3.x vector string (e.g. "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H") and computes its base score. */
export function computeCvssV3BaseScore(vectorString: string): CvssResult | null {
  if (!/^CVSS:3\.[01]\//.test(vectorString)) return null;

  const metrics: Record<string, string> = {};
  for (const part of vectorString.split('/').slice(1)) {
    const [key, value] = part.split(':');
    if (key && value) metrics[key] = value;
  }

  const { AV: av, AC: ac, PR: pr, UI: ui, S: scope, C: c, I: i, A: a } = metrics;
  if (!av || !ac || !pr || !ui || !scope || !c || !i || !a) return null;

  const avValue = AV[av];
  const acValue = AC[ac];
  const prValue = (scope === 'C' ? PR_CHANGED : PR_UNCHANGED)[pr];
  const uiValue = UI[ui];
  const cValue = CIA[c];
  const iValue = CIA[i];
  const aValue = CIA[a];

  if ([avValue, acValue, prValue, uiValue, cValue, iValue, aValue].some((v) => v === undefined)) {
    return null;
  }

  const iscBase = 1 - (1 - cValue!) * (1 - iValue!) * (1 - aValue!);
  const isc = scope === 'C' ? 7.52 * (iscBase - 0.029) - 3.25 * Math.pow(iscBase - 0.02, 15) : 6.42 * iscBase;
  const esc = 8.22 * avValue! * acValue! * prValue! * uiValue!;

  if (isc <= 0) return { baseScore: 0, vector: vectorString };

  const baseScore = scope === 'C' ? roundUp(Math.min(1.08 * (isc + esc), 10)) : roundUp(Math.min(isc + esc, 10));
  return { baseScore, vector: vectorString };
}

export function cvssScoreToRiskLevel(score: number): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
  if (score >= 9) return 'CRITICAL';
  if (score >= 7) return 'HIGH';
  if (score >= 4) return 'MODERATE';
  return 'LOW';
}
