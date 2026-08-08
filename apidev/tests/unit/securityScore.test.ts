import { describe, expect, it } from 'vitest';
import { calculateSecurityScore } from '../../src/services/risk/securityScore.js';

describe('calculateSecurityScore', () => {
  it('returns 100 for no findings', () => {
    expect(calculateSecurityScore({ critical: 0, severe: 0, high: 0, moderate: 0, low: 0 })).toBe(100);
  });

  it('penalizes a single critical heavily', () => {
    const score = calculateSecurityScore({ critical: 1, severe: 0, high: 0, moderate: 0, low: 0 });
    expect(score).toBe(75); // 100 - 25*sqrt(1)
  });

  it('dampens repeated findings of the same severity via sqrt', () => {
    const oneCount = calculateSecurityScore({ critical: 0, severe: 0, high: 1, moderate: 0, low: 0 });
    const fourCount = calculateSecurityScore({ critical: 0, severe: 0, high: 4, moderate: 0, low: 0 });
    // 4x the findings should cost only 2x the penalty (sqrt(4) = 2), not 4x.
    expect(100 - fourCount).toBe((100 - oneCount) * 2);
  });

  it('never goes below 0', () => {
    const score = calculateSecurityScore({ critical: 50, severe: 50, high: 50, moderate: 50, low: 50 });
    expect(score).toBe(0);
  });
});
