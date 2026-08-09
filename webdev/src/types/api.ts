export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'CRITICAL';
export type AnalysisType = 'push' | 'pull_request' | 'manual' | 'initial';
export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';
export type FindingStatus = 'open' | 'resolved' | 'ignored';
export type DependencyChangeType = 'added' | 'removed' | 'updated' | 'downgraded' | 'unchanged';

export interface SecurityPolicy {
  failOnCritical: boolean;
  failOnHigh: boolean;
  failOnMedium: boolean;
  maximumRiskScore: number;
  allowNewDependencies: boolean;
  allowDeprecatedPackages: boolean;
  allowInstallScripts: boolean;
}

export interface Repository {
  _id: string;
  githubRepositoryId: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  description?: string;
  monitoringEnabled: boolean;
  fullScanEnabled: boolean;
  policy: SecurityPolicy;
  securityScore: number | null;
  lastScanAt?: string;
  createdAt: string;
}

export interface AnalysisSummary {
  totalDependencies: number;
  directDependencies: number;
  transitiveDependencies: number;
  newDependencies: number;
  removedDependencies: number;
  updatedDependencies: number;
  vulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface Analysis {
  _id: string;
  repositoryId: string | { _id: string; name: string; fullName: string };
  analysisType: AnalysisType;
  status: AnalysisStatus;
  commitSha?: string;
  branch?: string;
  pullRequestNumber?: number;
  headSha?: string;
  baseSha?: string;
  summary?: AnalysisSummary;
  securityScore?: number;
  overallRisk?: RiskLevel;
  providerStatus?: Array<{ provider: string; available: boolean; error?: string; checkedAt: string }>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  error?: string;
}

export interface RiskFactor {
  factor: string;
  severity: RiskLevel;
  score: number;
  evidence: string;
  recommendation: string;
}

export interface FindingVulnerability {
  sourceId: string;
  summary: string;
  severity: RiskLevel;
  cvssScore?: number;
}

export interface Finding {
  _id: string;
  analysisId: string;
  repositoryId: string | { _id: string; name: string; fullName: string; owner: string };
  packageName: string;
  packageVersion: string;
  manifestPath?: string;
  dependencyType: 'direct' | 'transitive';
  dependencyPath: string[];
  severity: RiskLevel;
  riskScore: number;
  status: FindingStatus;
  factors: RiskFactor[];
  vulnerabilities: FindingVulnerability[];
  createdAt: string;
}

export interface AnalysisPackage {
  _id: string;
  name: string;
  version: string;
  previousVersion?: string;
  changeType: DependencyChangeType;
  isDirect: boolean;
  manifestPath: string;
  dependencyPath: string[];
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface Dependency {
  _id: string;
  name: string;
  ecosystem: string;
  latestVersion?: string;
  description?: string;
  homepage?: string;
  repositoryUrl?: string;
  license?: string;
  maintainersCount?: number;
  weeklyDownloads?: number;
  firstPublishedAt?: string;
  lastPublishedAt?: string;
  isDeprecated: boolean;
  deprecationMessage?: string;
}

export interface DependencyVersion {
  _id: string;
  version: string;
  publishedAt?: string;
  dependencies: Record<string, string>;
  hasInstallScripts: boolean;
  installScripts: { preinstall?: string; install?: string; postinstall?: string };
}

export interface Vulnerability {
  _id: string;
  source: string;
  sourceId: string;
  summary: string;
  severity: RiskLevel;
  cvssScore?: number;
  patchedVersion?: string;
  references: string[];
}

export interface PullRequest {
  _id: string;
  repositoryId: string | { _id: string; name: string; fullName: string };
  number: number;
  title: string;
  description?: string;
  authorLogin: string;
  baseBranch: string;
  headBranch: string;
  state: 'open' | 'closed' | 'merged';
  latestAnalysisId?: string;
  openedAt: string;
}

export interface NotificationItem {
  _id: string;
  type: string;
  channel: string;
  recipientEmail?: string;
  subject: string;
  status: 'sent' | 'failed' | 'skipped' | 'email_unavailable';
  createdAt: string;
}

export interface NotificationPreferences {
  emailNotificationsEnabled: boolean;
  notifyOnCritical: boolean;
  notifyOnHigh: boolean;
  notifyOnMedium: boolean;
  notifyOnLow: boolean;
  notifyOnPush: boolean;
  notifyOnPullRequest: boolean;
}

export interface DashboardOverview {
  totalRepositories: number;
  monitoredRepositories: number;
  totalDependencies: number;
  totalVulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  recentAnalyses: Analysis[];
}

export interface ActivityItem {
  id: string;
  repository: { _id: string; name: string; fullName: string };
  analysisType: AnalysisType;
  pullRequestNumber?: number;
  overallRisk?: RiskLevel;
  status: AnalysisStatus;
  createdAt: string;
}

export type RiskDistribution = Record<RiskLevel, number>;

export interface PaginatedMeta {
  pagination: { total: number; page: number; limit: number; totalPages: number };
}
