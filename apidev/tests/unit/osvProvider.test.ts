import { afterEach, describe, expect, it, vi } from 'vitest';

// Unit tests should not depend on live Redis. Replace the cache layer with
// a passthrough so each test's mocked fetch is actually exercised.
vi.mock('../../src/services/cache/cacheService.js', () => ({
  cachedFetch: (_key: string, _ttl: number, fetcher: () => unknown) => fetcher(),
  osvCacheKey: (name: string, version: string) => `osv:${name}:${version}`,
  CACHE_TTL_SECONDS: 21600,
}));

const { OSVProvider } = await import('../../src/services/security/providers/OSVProvider.js');

const SAMPLE_OSV_RESPONSE = {
  vulns: [
    {
      id: 'GHSA-29mw-wpgm-hmr9',
      summary: 'Regular Expression Denial of Service (ReDoS) in lodash',
      details: 'All versions of package lodash prior to 4.17.21 are vulnerable to ReDoS.',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L' }],
      database_specific: { severity: 'MODERATE' },
      affected: [
        {
          package: { name: 'lodash', ecosystem: 'npm' },
          ranges: [{ type: 'SEMVER', events: [{ introduced: '4.0.0' }, { fixed: '4.17.21' }] }],
        },
      ],
      references: [{ type: 'ADVISORY', url: 'https://nvd.nist.gov/vuln/detail/CVE-2020-28500' }],
      published: '2022-01-06T20:30:46Z',
    },
    {
      id: 'GHSA-withdrawn-example',
      summary: 'A withdrawn advisory',
      withdrawn: '2023-01-01T00:00:00Z',
      severity: [],
      affected: [],
      references: [],
    },
  ],
};

describe('OSVProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('extracts a real CVSS-derived severity and patched version, and filters withdrawn advisories', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => SAMPLE_OSV_RESPONSE,
      }),
    );

    const provider = new OSVProvider();
    const result = await provider.checkVulnerabilities('lodash', '4.17.15');

    expect(result.available).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      source: 'osv',
      sourceId: 'GHSA-29mw-wpgm-hmr9',
      severity: 'MODERATE',
      cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L',
      patchedVersion: '4.17.21',
    });
    expect(result.data[0]!.cvssScore).toBeCloseTo(5.3, 1);
  });

  it('degrades gracefully and reports unavailable when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const provider = new OSVProvider();
    const result = await provider.checkVulnerabilities('lodash', '4.17.15');

    expect(result.available).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.error).toContain('network down');
  });

  it('degrades gracefully on a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const provider = new OSVProvider();
    const result = await provider.checkVulnerabilities('lodash', '4.17.15');

    expect(result.available).toBe(false);
    expect(result.data).toEqual([]);
  });
});
