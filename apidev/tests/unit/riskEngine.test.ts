import { describe, expect, it } from 'vitest';
import { calculateOverallRisk, calculatePackageRisk } from '../../src/services/risk/riskEngine.js';
import type { RiskFactorContext } from '../../src/services/risk/types.js';

function baseContext(overrides: Partial<RiskFactorContext> = {}): RiskFactorContext {
  return {
    packageName: 'example-package',
    version: '1.0.0',
    isDirect: true,
    changeType: 'unchanged',
    vulnerabilities: [],
    metadata: null,
    ...overrides,
  };
}

describe('calculatePackageRisk', () => {
  it('scores a clean package at 0 / LOW with no factors', () => {
    const result = calculatePackageRisk(baseContext());
    expect(result).toEqual({ riskScore: 0, riskLevel: 'LOW', factors: [] });
  });

  it('lets a single critical vulnerability dominate the score', () => {
    const result = calculatePackageRisk(
      baseContext({
        vulnerabilities: [
          {
            source: 'osv',
            sourceId: 'GHSA-critical',
            packageName: 'example-package',
            summary: 'Remote code execution',
            severity: 'CRITICAL',
            cvssScore: 9.8,
            references: [],
          },
        ],
      }),
    );

    expect(result.riskLevel).toBe('CRITICAL');
    expect(result.riskScore).toBe(98); // 9.8 * 10
    expect(result.factors).toHaveLength(1);
  });

  it('combines multiple factors with diminishing weight for all but the worst', () => {
    const result = calculatePackageRisk(
      baseContext({
        changeType: 'added',
        metadata: {
          installScripts: { postinstall: 'node install.js' },
          hasInstallScripts: true,
          weeklyDownloads: 50,
          requestedVersionPublishedAt: new Date(),
        },
      }),
    );

    // Factors triggered: postinstall_script (30), low_adoption (15), new_package (35).
    // worst=35, rest sorted desc = [30, 15] -> 35 + 30*0.15 + 15*0.15 = 35 + 4.5 + 2.25 = 41.75 -> 42
    expect(result.factors.length).toBeGreaterThanOrEqual(3);
    expect(result.riskScore).toBe(42);
    expect(result.riskLevel).toBe('HIGH');
  });

  it('never exceeds 100', () => {
    const manyVulns = Array.from({ length: 10 }, (_, i) => ({
      source: 'osv' as const,
      sourceId: `GHSA-${i}`,
      packageName: 'example-package',
      summary: 'Critical issue',
      severity: 'CRITICAL' as const,
      cvssScore: 9.8,
      references: [],
    }));

    const result = calculatePackageRisk(baseContext({ vulnerabilities: manyVulns }));
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });
});

describe('calculateOverallRisk', () => {
  it('returns LOW for no findings', () => {
    expect(calculateOverallRisk([])).toBe('LOW');
  });

  it('returns the single worst severity present', () => {
    expect(calculateOverallRisk(['LOW', 'MODERATE', 'CRITICAL', 'HIGH'])).toBe('CRITICAL');
  });
});
