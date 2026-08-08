import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { cachedFetch, npmMetadataCacheKey, CACHE_TTL_SECONDS } from '../../cache/cacheService.js';
import type { PackageMetadataProvider, PackageMetadataResult, ProviderCallResult } from '../SecurityProvider.js';

const DOWNLOADS_API_URL = 'https://api.npmjs.org';

interface NpmVersionMetadata {
  license?: string | { type?: string };
  homepage?: string;
  repository?: { url?: string } | string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  deprecated?: string;
}

interface NpmPackageMetadata {
  'dist-tags'?: Record<string, string>;
  versions?: Record<string, NpmVersionMetadata>;
  time?: Record<string, string>;
  maintainers?: unknown[];
}

function normalizeRepositoryUrl(repository: NpmVersionMetadata['repository']): string | undefined {
  const raw = typeof repository === 'string' ? repository : repository?.url;
  if (!raw) return undefined;
  return raw.replace(/^git\+/, '').replace(/\.git$/, '').replace(/^git:\/\//, 'https://');
}

async function fetchWeeklyDownloads(packageName: string): Promise<number | undefined> {
  try {
    const res = await fetch(`${DOWNLOADS_API_URL}/downloads/point/last-week/${encodeURIComponent(packageName)}`);
    if (!res.ok) return undefined;
    const body = (await res.json()) as { downloads?: number };
    return body.downloads;
  } catch {
    return undefined;
  }
}

export class NpmRegistryProvider implements PackageMetadataProvider {
  readonly name = 'npm-registry';

  async getPackageMetadata(
    packageName: string,
    version: string,
  ): Promise<ProviderCallResult<PackageMetadataResult | null>> {
    try {
      const data = await cachedFetch(npmMetadataCacheKey(packageName, version), CACHE_TTL_SECONDS, () =>
        this.fetchMetadata(packageName, version),
      );
      return { provider: this.name, available: true, data };
    } catch (err) {
      logger.error({ err, packageName, version }, 'npm registry lookup failed');
      return {
        provider: this.name,
        available: false,
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private async fetchMetadata(packageName: string, version: string): Promise<PackageMetadataResult | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let pkg: NpmPackageMetadata;
    try {
      const res = await fetch(`${env.NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}`, {
        signal: controller.signal,
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`npm registry responded with HTTP ${res.status}`);
      pkg = (await res.json()) as NpmPackageMetadata;
    } finally {
      clearTimeout(timeout);
    }

    const versionMeta = pkg.versions?.[version];
    const latestVersion = pkg['dist-tags']?.latest;
    const weeklyDownloads = await fetchWeeklyDownloads(packageName);

    return {
      latestVersion,
      homepage: versionMeta?.homepage,
      repositoryUrl: normalizeRepositoryUrl(versionMeta?.repository),
      license: typeof versionMeta?.license === 'string' ? versionMeta.license : versionMeta?.license?.type,
      maintainersCount: pkg.maintainers?.length,
      weeklyDownloads,
      firstPublishedAt: pkg.time?.created ? new Date(pkg.time.created) : undefined,
      lastPublishedAt: latestVersion && pkg.time?.[latestVersion] ? new Date(pkg.time[latestVersion]!) : undefined,
      isDeprecated: Boolean(versionMeta?.deprecated),
      deprecationMessage: versionMeta?.deprecated,
      requestedVersionPublishedAt: pkg.time?.[version] ? new Date(pkg.time[version]!) : undefined,
      hasInstallScripts: Boolean(
        versionMeta?.scripts?.preinstall || versionMeta?.scripts?.install || versionMeta?.scripts?.postinstall,
      ),
      installScripts: versionMeta?.scripts
        ? {
            preinstall: versionMeta.scripts.preinstall,
            install: versionMeta.scripts.install,
            postinstall: versionMeta.scripts.postinstall,
          }
        : undefined,
      dependencies: versionMeta?.dependencies,
    };
  }
}
