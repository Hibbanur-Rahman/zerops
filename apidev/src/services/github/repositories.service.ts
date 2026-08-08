import { requireGithubApp } from '../../config/githubApp.js';
import { GithubInstallation } from '../../models/GithubInstallation.js';
import { Repository } from '../../models/Repository.js';
import { logger } from '../../config/logger.js';

/**
 * Refreshes the Repository collection from GitHub for every active
 * installation owned by this user, then returns the up-to-date list from
 * the database (the source of truth for the dashboard).
 */
export async function syncRepositoriesForUser(userId: string) {
  const app = requireGithubApp();
  const installations = await GithubInstallation.find({ userId, status: 'active' });

  for (const installation of installations) {
    try {
      const octokit = await app.getInstallationOctokit(installation.installationId);
      const repos = await octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, {
        per_page: 100,
      });

      for (const repo of repos) {
        await Repository.findOneAndUpdate(
          { githubRepositoryId: repo.id },
          {
            githubRepositoryId: repo.id,
            installationId: installation._id,
            userId,
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            private: repo.private,
            defaultBranch: repo.default_branch,
            htmlUrl: repo.html_url,
            description: repo.description ?? undefined,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }
    } catch (err) {
      logger.error({ err, installationId: installation.installationId }, 'Failed to sync repositories for installation');
    }
  }

  return Repository.find({ userId, removedFromInstallationAt: { $exists: false } }).sort({ fullName: 1 });
}
