import { describe, expect, it } from 'vitest';
import { evaluateTyposquatting } from '../../src/services/risk/riskFactors/typosquatting.js';
import type { RiskFactorContext } from '../../src/services/risk/types.js';

function ctx(packageName: string, changeType: RiskFactorContext['changeType'] = 'added'): RiskFactorContext {
  return {
    packageName,
    version: '1.0.0',
    isDirect: true,
    changeType,
    vulnerabilities: [],
    metadata: null,
  };
}

describe('evaluateTyposquatting', () => {
  it('flags a one-character typo of a popular package', () => {
    const results = evaluateTyposquatting(ctx('lodahs'));
    expect(results).toHaveLength(1);
    expect(results[0]!.factor).toBe('typosquatting_similarity');
    expect(results[0]!.evidence).toContain('lodash');
  });

  it('does not flag the popular package itself', () => {
    expect(evaluateTyposquatting(ctx('lodash'))).toEqual([]);
  });

  it('does not flag an unrelated, sufficiently different name', () => {
    expect(evaluateTyposquatting(ctx('my-completely-unrelated-internal-tool'))).toEqual([]);
  });

  it('only checks newly-added dependencies', () => {
    expect(evaluateTyposquatting(ctx('lodahs', 'unchanged'))).toEqual([]);
  });
});
