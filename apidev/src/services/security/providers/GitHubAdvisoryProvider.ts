import type { Octokit } from 'octokit';
import semver from 'semver';
import { logger } from '../../../config/logger.js';
import { cachedFetch, ghsaCacheKey, CACHE_TTL_SECONDS } from '../../cache/cacheService.js';
import { cvssScoreToRiskLevel } from '../cvss.js';
import type { ProviderCallResult, SecurityProvider, VulnerabilityResult } from '../SecurityProvider.js';

const QUERY = `
  query ($package: String!) {
    securityVulnerabilities(ecosystem: NPM, package: $package, first: 25) {
      nodes {
        advisory {
          ghsaId
          summary
          description
          publishedAt
          withdrawnAt
          references { url }
          cvss { score vectorString }
        }
        vulnerableVersionRange
        firstPatchedVersion { identifier }
      }
    }
  }
`;

interface GraphQlResponse {
  securityVulnerabilities: {
    nodes: Array<{
      advisory: {
        ghsaId: string;
        summary: string;
        description?: string;
        publishedAt?: string;
        withdrawnAt?: string;
        references: Array<{ url: string }>;
        cvss?: { score?: number; vectorString?: string };
      };
      vulnerableVersionRange: string;
      firstPatchedVersion?: { identifier: string };
    }>;
  };
}

/**
 * GitHub's Advisory Database via GraphQL. Requires an authenticated
 * Octokit -- an installation client is authenticated enough to read this
 * public advisory data. Results are per-package (not per-version); callers
 * filter by `vulnerableVersionRange` against the version they care about.
 */
export class GitHubAdvisoryProvider implements SecurityProvider {
  readonly name = 'ghsa';

  constructor(private readonly octokit: Octokit) {}

  async checkVulnerabilities(packageName: string, version: string): Promise<ProviderCallResult<VulnerabilityResult[]>> {
    try {
      const allForPackage = await cachedFetch(ghsaCacheKey(packageName), CACHE_TTL_SECONDS, () =>
        this.query(packageName),
      );
      const data = allForPackage.filter((v) => {
        if (!v.vulnerableVersionRange) return true;
        try {
          return semver.satisfies(version, v.vulnerableVersionRange);
        } catch {
          return true;
        }
      });
      return { provider: this.name, available: true, data };
    } catch (err) {
      logger.error({ err, packageName, version }, 'GitHub Advisory Database lookup failed');
      return {
        provider: this.name,
        available: false,
        data: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private async query(packageName: string): Promise<Array<VulnerabilityResult & { vulnerableVersionRange: string }>> {
    const response: GraphQlResponse = await this.octokit.graphql(QUERY, { package: packageName });

    return response.securityVulnerabilities.nodes.map((node) => ({
      source: 'ghsa' as const,
      sourceId: node.advisory.ghsaId,
      packageName,
      vulnerableVersionRange: node.vulnerableVersionRange,
      patchedVersion: node.firstPatchedVersion?.identifier,
      summary: node.advisory.summary,
      details: node.advisory.description,
      severity: node.advisory.cvss?.score ? cvssScoreToRiskLevel(node.advisory.cvss.score) : 'MODERATE',
      cvssScore: node.advisory.cvss?.score,
      cvssVector: node.advisory.cvss?.vectorString,
      references: node.advisory.references.map((r) => r.url),
      publishedAt: node.advisory.publishedAt ? new Date(node.advisory.publishedAt) : undefined,
      withdrawnAt: node.advisory.withdrawnAt ? new Date(node.advisory.withdrawnAt) : undefined,
    }));
  }
}
