import type { Octokit } from 'octokit';
import { OSVProvider } from './providers/OSVProvider.js';
import { NpmRegistryProvider } from './providers/NpmRegistryProvider.js';
import { GitHubAdvisoryProvider } from './providers/GitHubAdvisoryProvider.js';
import type { PackageMetadataResult, SecurityProvider, VulnerabilityResult } from './SecurityProvider.js';

export interface ProviderStatusEntry {
  provider: string;
  available: boolean;
  error?: string;
  checkedAt: Date;
}

export interface SecurityIntelResult {
  vulnerabilities: VulnerabilityResult[];
  metadata: PackageMetadataResult | null;
  providerStatus: ProviderStatusEntry[];
}

const npmRegistryProvider = new NpmRegistryProvider();

/**
 * Gathers vulnerability + registry intelligence for one (package, version)
 * from every configured provider. Each provider failure is recorded, never
 * thrown -- a single unavailable source degrades the report, it never
 * fails the whole analysis (see AGENTS.md / spec section 13).
 */
export async function gatherSecurityIntel(
  packageName: string,
  version: string,
  installationOctokit?: Octokit,
): Promise<SecurityIntelResult> {
  const vulnerabilityProviders: SecurityProvider[] = [new OSVProvider()];
  if (installationOctokit) {
    vulnerabilityProviders.push(new GitHubAdvisoryProvider(installationOctokit));
  }

  const [vulnResults, metadataResult] = await Promise.all([
    Promise.all(vulnerabilityProviders.map((p) => p.checkVulnerabilities(packageName, version))),
    npmRegistryProvider.getPackageMetadata(packageName, version),
  ]);

  // OSV mirrors GitHub Advisory Database for the npm ecosystem, so the same
  // GHSA id often comes back from both providers -- dedupe by sourceId,
  // first result wins (OSV needs no auth, so it's queried unconditionally).
  const seen = new Set<string>();
  const vulnerabilities: VulnerabilityResult[] = [];
  for (const result of vulnResults) {
    for (const vuln of result.data) {
      if (seen.has(vuln.sourceId)) continue;
      seen.add(vuln.sourceId);
      vulnerabilities.push(vuln);
    }
  }

  const now = new Date();
  const providerStatus: ProviderStatusEntry[] = [...vulnResults, metadataResult].map((r) => ({
    provider: r.provider,
    available: r.available,
    error: r.error,
    checkedAt: now,
  }));

  return { vulnerabilities, metadata: metadataResult.data, providerStatus };
}
