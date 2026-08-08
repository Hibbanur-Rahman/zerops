import { GithubAccount } from '../../models/GithubAccount.js';
import { GithubInstallation } from '../../models/GithubInstallation.js';
import { Repository } from '../../models/Repository.js';
import { recordAuditLog } from '../auditLog.service.js';
import { logger } from '../../config/logger.js';

interface InstallationPayload {
  id: number;
  account: { id: number; login: string; type: string; avatar_url?: string };
  target_type: string;
  repository_selection: 'all' | 'selected';
  permissions: Record<string, string>;
  events: string[];
}

interface SenderPayload {
  id: number;
  login: string;
}

export async function upsertInstallation(installation: InstallationPayload, sender: SenderPayload) {
  const owner = await GithubAccount.findOne({ githubUserId: sender.id });
  if (!owner) {
    logger.warn(
      { installationId: installation.id, senderLogin: sender.login },
      'Received installation event for a GitHub user with no connected account -- skipping (connect GitHub before installing the app)',
    );
    return null;
  }

  const record = await GithubInstallation.findOneAndUpdate(
    { installationId: installation.id },
    {
      installationId: installation.id,
      userId: owner.userId,
      accountId: installation.account.id,
      accountLogin: installation.account.login,
      accountType: installation.account.type,
      accountAvatarUrl: installation.account.avatar_url,
      targetType: installation.target_type,
      repositorySelection: installation.repository_selection,
      permissions: installation.permissions,
      events: installation.events,
      status: 'active',
      installedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await recordAuditLog({
    userId: owner.userId,
    action: 'github_app_installed',
    targetType: 'GithubInstallation',
    targetId: String(record._id),
  });

  return record;
}

export async function markInstallationUninstalled(installationId: number) {
  const record = await GithubInstallation.findOneAndUpdate(
    { installationId },
    { status: 'uninstalled', uninstalledAt: new Date() },
    { new: true },
  );
  if (!record) return null;

  await Repository.updateMany(
    { installationId: record._id },
    { monitoringEnabled: false, removedFromInstallationAt: new Date() },
  );
  await recordAuditLog({
    userId: record.userId,
    action: 'github_app_uninstalled',
    targetType: 'GithubInstallation',
    targetId: String(record._id),
  });
  return record;
}

export async function setInstallationSuspended(installationId: number, suspended: boolean) {
  return GithubInstallation.findOneAndUpdate(
    { installationId },
    { status: suspended ? 'suspended' : 'active', suspendedAt: suspended ? new Date() : undefined },
    { new: true },
  );
}

export async function removeRepositoriesFromInstallation(githubRepositoryIds: number[]) {
  await Repository.updateMany(
    { githubRepositoryId: { $in: githubRepositoryIds } },
    { monitoringEnabled: false, removedFromInstallationAt: new Date() },
  );
}
