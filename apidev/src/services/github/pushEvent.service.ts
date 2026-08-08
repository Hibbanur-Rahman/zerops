import { Repository } from '../../models/Repository.js';
import { Commit } from '../../models/Commit.js';
import { Analysis } from '../../models/Analysis.js';
import { anyDependencyFileChanged } from '../analysis/dependencyFiles.js';
import { dependencyAnalysisQueue } from '../../queues/dependencyAnalysis.queue.js';
import { logger } from '../../config/logger.js';

interface PushCommitPayload {
  id: string;
  message: string;
  added: string[];
  removed: string[];
  modified: string[];
  author: { name?: string; email?: string; username?: string };
}

const ZERO_SHA = '0000000000000000000000000000000000000000';

interface PushEventPayload {
  ref: string;
  before: string;
  after: string;
  deleted: boolean;
  repository: { id: number };
  commits: PushCommitPayload[];
  pusher: { name: string; email?: string };
  sender: { id: number; login: string };
}

export async function handlePushEvent(payload: PushEventPayload): Promise<void> {
  if (payload.deleted) return;

  const repo = await Repository.findOne({ githubRepositoryId: payload.repository.id });
  if (!repo) {
    logger.info({ githubRepositoryId: payload.repository.id }, 'Push event for an untracked repository -- ignoring');
    return;
  }

  const branch = payload.ref.replace('refs/heads/', '');

  await Promise.all(
    payload.commits.map((commit) =>
      Commit.findOneAndUpdate(
        { repositoryId: repo._id, sha: commit.id },
        {
          repositoryId: repo._id,
          sha: commit.id,
          message: commit.message,
          branch,
          authorLogin: commit.author.username,
          authorName: commit.author.name,
          authorEmail: commit.author.email,
          changedFiles: [...commit.added, ...commit.modified, ...commit.removed],
          dependencyFilesChanged: anyDependencyFileChanged([...commit.added, ...commit.modified, ...commit.removed]),
          pushedAt: new Date(),
        },
        { upsert: true, setDefaultsOnInsert: true },
      ),
    ),
  );

  if (!repo.monitoringEnabled) return;

  const changedFiles = payload.commits.flatMap((c) => [...c.added, ...c.modified, ...c.removed]);
  const dependencyFilesChanged = anyDependencyFileChanged(changedFiles);

  if (!dependencyFilesChanged && !repo.fullScanEnabled) {
    logger.debug({ repositoryId: repo._id, commitSha: payload.after }, 'No dependency files changed -- skipping analysis');
    return;
  }

  const analysis = await Analysis.findOneAndUpdate(
    { repositoryId: repo._id, commitSha: payload.after, analysisType: 'push' },
    {
      $setOnInsert: {
        repositoryId: repo._id,
        commitSha: payload.after,
        baseSha: payload.before === ZERO_SHA ? undefined : payload.before,
        analysisType: 'push',
        status: 'pending',
        branch,
        triggeredByLogin: payload.sender.login,
        triggeredByGithubId: payload.sender.id,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (analysis.status === 'pending') {
    await dependencyAnalysisQueue.add('analyze', { analysisId: String(analysis._id) });
  }
}
