import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/cache/cacheService.js', () => ({
  cachedFetch: (_key: string, _ttl: number, fetcher: () => unknown) => fetcher(),
  npmMetadataCacheKey: (name: string, version: string) => `npm:${name}:${version}`,
  CACHE_TTL_SECONDS: 21600,
}));

const { NpmRegistryProvider } = await import('../../src/services/security/providers/NpmRegistryProvider.js');

const SAMPLE_REGISTRY_RESPONSE = {
  'dist-tags': { latest: '4.18.1' },
  time: { created: '2012-04-05T14:53:04.000Z', '4.18.1': '2026-01-15T00:00:00.000Z', '4.17.15': '2020-08-13T00:00:00.000Z' },
  maintainers: [{ name: 'jdalton' }],
  versions: {
    '4.17.15': {
      license: 'MIT',
      homepage: 'https://lodash.com/',
      repository: { url: 'git+https://github.com/lodash/lodash.git' },
      scripts: { test: 'echo test' },
      dependencies: {},
    },
    '4.18.1': {
      license: 'MIT',
      homepage: 'https://lodash.com/',
      repository: { url: 'git+https://github.com/lodash/lodash.git' },
      scripts: { postinstall: 'node install.js' },
      dependencies: {},
    },
  },
};

function mockFetchSequence(...responses: Array<{ ok: boolean; status?: number; json: () => unknown }>) {
  const fn = vi.fn();
  for (const response of responses) fn.mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fn);
}

describe('NpmRegistryProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('extracts real registry fields and normalizes the repository URL', async () => {
    mockFetchSequence(
      { ok: true, json: () => SAMPLE_REGISTRY_RESPONSE },
      { ok: true, json: () => ({ downloads: 165029483 }) },
    );

    const provider = new NpmRegistryProvider();
    const result = await provider.getPackageMetadata('lodash', '4.17.15');

    expect(result.available).toBe(true);
    expect(result.data).toMatchObject({
      latestVersion: '4.18.1',
      homepage: 'https://lodash.com/',
      repositoryUrl: 'https://github.com/lodash/lodash',
      license: 'MIT',
      maintainersCount: 1,
      weeklyDownloads: 165029483,
      isDeprecated: false,
      hasInstallScripts: false,
    });
  });

  it('flags install scripts and deprecation on the requested version', async () => {
    mockFetchSequence(
      {
        ok: true,
        json: () => ({
          ...SAMPLE_REGISTRY_RESPONSE,
          versions: {
            ...SAMPLE_REGISTRY_RESPONSE.versions,
            '4.18.1': { ...SAMPLE_REGISTRY_RESPONSE.versions['4.18.1'], deprecated: 'use something else' },
          },
        }),
      },
      { ok: true, json: () => ({ downloads: 1 }) },
    );

    const provider = new NpmRegistryProvider();
    const result = await provider.getPackageMetadata('lodash', '4.18.1');

    expect(result.data?.hasInstallScripts).toBe(true);
    expect(result.data?.installScripts?.postinstall).toBe('node install.js');
    expect(result.data?.isDeprecated).toBe(true);
    expect(result.data?.deprecationMessage).toBe('use something else');
  });

  it('returns null (not an error) for a 404', async () => {
    mockFetchSequence({ ok: false, status: 404, json: () => ({}) });

    const provider = new NpmRegistryProvider();
    const result = await provider.getPackageMetadata('does-not-exist', '1.0.0');

    expect(result.available).toBe(true);
    expect(result.data).toBeNull();
  });

  it('degrades gracefully on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const provider = new NpmRegistryProvider();
    const result = await provider.getPackageMetadata('lodash', '4.17.15');

    expect(result.available).toBe(false);
    expect(result.data).toBeNull();
  });
});
