import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import { cachedFetch, osvCacheKey, CACHE_TTL_SECONDS } from '../../cache/cacheService.js';
import { computeCvssV3BaseScore, cvssScoreToRiskLevel } from '../cvss.js';
import type { ProviderCallResult, SecurityProvider, VulnerabilityResult } from '../SecurityProvider.js';

interface OsvSeverityEntry {
  type: string;
  score: string;
}

interface OsvAffectedRangeEvent {
  introduced?: string;
  fixed?: string;
  last_affected?: string;
}

interface OsvVuln {
  id: string;
  summary?: string;
  details?: string;
  severity?: OsvSeverityEntry[];
  database_specific?: { severity?: string };
  affected?: Array<{ ranges?: Array<{ type: string; events: OsvAffectedRangeEvent[] }> }>;
  references?: Array<{ url: string }>;
  published?: string;
  withdrawn?: string;
}

function extractPatchedVersion(vuln: OsvVuln): string | undefined {
  for (const affected of vuln.affected ?? []) {
    for (const range of affected.ranges ?? []) {
      if (range.type !== 'SEMVER' && range.type !== 'ECOSYSTEM') continue;
      const fixed = range.events.find((e) => e.fixed)?.fixed;
      if (fixed) return fixed;
    }
  }
  return undefined;
}

function severityFromDatabaseSpecific(value: string | undefined): VulnerabilityResult['severity'] | undefined {
  if (!value) return undefined;
  const normalized = value.toUpperCase();
  if (normalized === 'LOW' || normalized === 'MODERATE' || normalized === 'HIGH' || normalized === 'CRITICAL') {
    return normalized;
  }
  return undefined;
}

function toVulnerabilityResult(vuln: OsvVuln, packageName: string): VulnerabilityResult {
  const cvssEntry = vuln.severity?.find((s) => s.type === 'CVSS_V3' || s.type === 'CVSS_V4');
  const cvss = cvssEntry ? computeCvssV3BaseScore(cvssEntry.score) : null;

  const severity =
    (cvss ? cvssScoreToRiskLevel(cvss.baseScore) : undefined) ??
    severityFromDatabaseSpecific(vuln.database_specific?.severity) ??
    'MODERATE';

  return {
    source: 'osv',
    sourceId: vuln.id,
    packageName,
    patchedVersion: extractPatchedVersion(vuln),
    summary: vuln.summary ?? vuln.id,
    details: vuln.details,
    severity,
    cvssScore: cvss?.baseScore,
    cvssVector: cvssEntry?.score,
    references: (vuln.references ?? []).map((r) => r.url),
    publishedAt: vuln.published ? new Date(vuln.published) : undefined,
    withdrawnAt: vuln.withdrawn ? new Date(vuln.withdrawn) : undefined,
  };
}

export class OSVProvider implements SecurityProvider {
  readonly name = 'osv';

  async checkVulnerabilities(packageName: string, version: string): Promise<ProviderCallResult<VulnerabilityResult[]>> {
    try {
      const vulns = await cachedFetch(osvCacheKey(packageName, version), CACHE_TTL_SECONDS, () =>
        this.query(packageName, version),
      );
      return { provider: this.name, available: true, data: vulns };
    } catch (err) {
      logger.error({ err, packageName, version }, 'OSV.dev lookup failed');
      return {
        provider: this.name,
        available: false,
        data: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private async query(packageName: string, version: string): Promise<VulnerabilityResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${env.OSV_API_URL}/v1/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, package: { name: packageName, ecosystem: 'npm' } }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`OSV.dev responded with HTTP ${res.status}`);
      }

      const body = (await res.json()) as { vulns?: OsvVuln[] };
      const activeVulns = (body.vulns ?? []).filter((v) => !v.withdrawn);
      return activeVulns.map((v) => toVulnerabilityResult(v, packageName));
    } finally {
      clearTimeout(timeout);
    }
  }
}
