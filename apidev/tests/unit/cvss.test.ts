import { describe, expect, it } from 'vitest';
import { computeCvssV3BaseScore, cvssScoreToRiskLevel } from '../../src/services/security/cvss.js';

describe('computeCvssV3BaseScore', () => {
  it('computes 9.8 for the canonical critical-RCE vector', () => {
    const result = computeCvssV3BaseScore('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H');
    expect(result?.baseScore).toBe(9.8);
  });

  it('computes 7.5 for a network DoS-only vector', () => {
    const result = computeCvssV3BaseScore('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H');
    expect(result?.baseScore).toBe(7.5);
  });

  it('returns null for a non-CVSS-v3 string', () => {
    expect(computeCvssV3BaseScore('not a vector')).toBeNull();
    expect(computeCvssV3BaseScore('CVSS:2.0/AV:N/AC:L/Au:N/C:C/I:C/A:C')).toBeNull();
  });
});

describe('cvssScoreToRiskLevel', () => {
  it('maps scores to the correct band', () => {
    expect(cvssScoreToRiskLevel(9.8)).toBe('CRITICAL');
    expect(cvssScoreToRiskLevel(7.5)).toBe('HIGH');
    expect(cvssScoreToRiskLevel(5.0)).toBe('MODERATE');
    expect(cvssScoreToRiskLevel(2.0)).toBe('LOW');
  });
});
