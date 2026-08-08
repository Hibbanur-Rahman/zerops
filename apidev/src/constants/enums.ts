export const WEBHOOK_EVENT_TYPES = [
  'installation',
  'installation_repositories',
  'push',
  'pull_request',
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export function isWebhookEventType(value: string): value is WebhookEventType {
  return (WEBHOOK_EVENT_TYPES as readonly string[]).includes(value);
}

export const WEBHOOK_EVENT_STATUSES = ['received', 'queued', 'processing', 'processed', 'failed', 'ignored'] as const;
export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];

export const ANALYSIS_TYPES = ['push', 'pull_request', 'manual', 'initial'] as const;
export type AnalysisType = (typeof ANALYSIS_TYPES)[number];

export const ANALYSIS_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export const DEPENDENCY_CHANGE_TYPES = ['added', 'removed', 'updated', 'downgraded', 'unchanged'] as const;
export type DependencyChangeType = (typeof DEPENDENCY_CHANGE_TYPES)[number];

export const DEPENDENCY_TYPES = ['direct', 'transitive'] as const;
export type DependencyType = (typeof DEPENDENCY_TYPES)[number];

export const FINDING_STATUSES = ['open', 'resolved', 'ignored'] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

export const ECOSYSTEMS = ['npm'] as const;
export type Ecosystem = (typeof ECOSYSTEMS)[number];

export const VULNERABILITY_SOURCES = ['osv', 'ghsa', 'npm'] as const;
export type VulnerabilitySource = (typeof VULNERABILITY_SOURCES)[number];

export const PULL_REQUEST_STATES = ['open', 'closed', 'merged'] as const;
export type PullRequestState = (typeof PULL_REQUEST_STATES)[number];

export const NOTIFICATION_STATUSES = ['sent', 'failed', 'skipped', 'email_unavailable'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const NOTIFICATION_TYPES = ['analysis_completed', 'high_risk_detected'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const AUDIT_ACTIONS = [
  'github_connected',
  'github_disconnected',
  'github_app_installed',
  'github_app_uninstalled',
  'repository_enabled',
  'repository_disabled',
  'initial_scan_started',
  'analysis_completed',
  'analysis_failed',
  'finding_ignored',
  'finding_resolved',
  'notification_preference_changed',
  'security_policy_changed',
  'user_registered',
  'user_logged_in',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const GITHUB_ACCOUNT_TYPES = ['User', 'Organization'] as const;
export type GithubAccountType = (typeof GITHUB_ACCOUNT_TYPES)[number];

export const INSTALLATION_STATUSES = ['active', 'suspended', 'uninstalled'] as const;
export type InstallationStatus = (typeof INSTALLATION_STATUSES)[number];

export const REPOSITORY_SELECTIONS = ['all', 'selected'] as const;
export type RepositorySelection = (typeof REPOSITORY_SELECTIONS)[number];

export const CHECK_CONCLUSIONS = ['success', 'neutral', 'failure'] as const;
export type CheckConclusion = (typeof CHECK_CONCLUSIONS)[number];
