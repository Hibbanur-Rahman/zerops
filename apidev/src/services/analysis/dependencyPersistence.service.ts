import { Dependency } from '../../models/Dependency.js';
import { DependencyVersion } from '../../models/DependencyVersion.js';
import { Vulnerability } from '../../models/Vulnerability.js';
import type { PackageMetadataResult, VulnerabilityResult } from '../security/SecurityProvider.js';

export async function getPreviousMaintainersCount(packageName: string): Promise<number | undefined> {
  const existing = await Dependency.findOne({ name: packageName, ecosystem: 'npm' }).select('maintainersCount');
  return existing?.maintainersCount ?? undefined;
}

export async function persistDependencyMetadata(packageName: string, metadata: PackageMetadataResult | null) {
  const dependency = await Dependency.findOneAndUpdate(
    { name: packageName, ecosystem: 'npm' },
    {
      name: packageName,
      ecosystem: 'npm',
      latestVersion: metadata?.latestVersion,
      homepage: metadata?.homepage,
      repositoryUrl: metadata?.repositoryUrl,
      license: metadata?.license,
      maintainersCount: metadata?.maintainersCount,
      weeklyDownloads: metadata?.weeklyDownloads,
      firstPublishedAt: metadata?.firstPublishedAt,
      lastPublishedAt: metadata?.lastPublishedAt,
      isDeprecated: metadata?.isDeprecated ?? false,
      deprecationMessage: metadata?.deprecationMessage,
      metadataFetchedAt: new Date(),
      metadataStale: metadata === null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return dependency;
}

export async function persistDependencyVersion(
  dependencyId: string,
  version: string,
  metadata: PackageMetadataResult | null,
) {
  return DependencyVersion.findOneAndUpdate(
    { dependencyId, version },
    {
      dependencyId,
      version,
      publishedAt: metadata?.requestedVersionPublishedAt,
      dependencies: metadata?.dependencies ?? {},
      installScripts: metadata?.installScripts ?? {},
      hasInstallScripts: metadata?.hasInstallScripts ?? false,
      deprecated: metadata?.isDeprecated ?? false,
      deprecationMessage: metadata?.deprecationMessage,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function persistVulnerabilities(vulnerabilities: VulnerabilityResult[], packageName: string) {
  const persisted = await Promise.all(
    vulnerabilities.map((vuln) =>
      Vulnerability.findOneAndUpdate(
        { source: vuln.source, sourceId: vuln.sourceId },
        {
          source: vuln.source,
          sourceId: vuln.sourceId,
          packageName,
          ecosystem: 'npm',
          vulnerableVersionRange: vuln.vulnerableVersionRange,
          patchedVersion: vuln.patchedVersion,
          summary: vuln.summary,
          details: vuln.details,
          severity: vuln.severity,
          cvssScore: vuln.cvssScore,
          cvssVector: vuln.cvssVector,
          references: vuln.references,
          publishedAt: vuln.publishedAt,
          withdrawnAt: vuln.withdrawnAt,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ),
  );
  return persisted;
}
