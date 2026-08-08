import type { RiskLevel } from '../../constants/riskLevels.js';

export interface VulnerabilityResult {
  source: 'osv' | 'ghsa';
  sourceId: string;
  packageName: string;
  vulnerableVersionRange?: string;
  patchedVersion?: string;
  summary: string;
  details?: string;
  severity: RiskLevel;
  cvssScore?: number;
  cvssVector?: string;
  references: string[];
  publishedAt?: Date;
  withdrawnAt?: Date;
}

export interface ProviderCallResult<T> {
  provider: string;
  available: boolean;
  data: T;
  error?: string;
}

/** A source of vulnerability intelligence for a specific (package, version). */
export interface SecurityProvider {
  readonly name: string;
  checkVulnerabilities(packageName: string, version: string): Promise<ProviderCallResult<VulnerabilityResult[]>>;
}

export interface PackageMetadataResult {
  latestVersion?: string;
  description?: string;
  homepage?: string;
  repositoryUrl?: string;
  license?: string;
  maintainersCount?: number;
  weeklyDownloads?: number;
  firstPublishedAt?: Date;
  lastPublishedAt?: Date;
  isDeprecated?: boolean;
  deprecationMessage?: string;
  requestedVersionPublishedAt?: Date;
  hasInstallScripts?: boolean;
  installScripts?: { preinstall?: string; install?: string; postinstall?: string };
  dependencies?: Record<string, string>;
}

/** A source of package registry metadata (downloads, maintainers, install scripts, ...). */
export interface PackageMetadataProvider {
  readonly name: string;
  getPackageMetadata(packageName: string, version: string): Promise<ProviderCallResult<PackageMetadataResult | null>>;
}
