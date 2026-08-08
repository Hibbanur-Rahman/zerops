import { Repository } from '../../models/Repository.js';
import { PullRequest } from '../../models/PullRequest.js';
import { Analysis } from '../../models/Analysis.js';
import { dependencyAnalysisQueue } from '../../queues/dependencyAnalysis.queue.js';
import { logger } from '../../config/logger.js';

const ANALYZABLE_ACTIONS = new Set(['opened', 'reopened', 'synchronize']);

interface PullRequestEventPayload {
  action: string;
  number: number;
  pull_request: {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: string;
    user: { id: number; login: string };
    base: { ref: string; sha: string };
    head: { ref: string; sha: string };
    closed_at: string | null;
    merged_at: string | null;
  };
  repository: { id: number };
  sender: { id: number; login: string };
}

export async function handlePullRequestEvent(payload: PullRequestEventPayload): Promise<void> {
  const repo = await Repository.findOne({ githubRepositoryId: payload.repository.id });
  if (!repo) {
    logger.info({ githubRepositoryId: payload.repository.id }, 'Pull request event for an untracked repository -- ignoring');
    return;
  }

  const pr = payload.pull_request;
  const prRecord = await PullRequest.findOneAndUpdate(
    { repositoryId: repo._id, number: pr.number },
    {
      repositoryId: repo._id,
      githubPullRequestId: pr.id,
      number: pr.number,
      title: pr.title,
      description: pr.body ?? undefined,
      authorLogin: pr.user.login,
      authorGithubId: pr.user.id,
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      baseSha: pr.base.sha,
      headSha: pr.head.sha,
      state: pr.merged_at ? 'merged' : pr.state === 'closed' ? 'closed' : 'open',
      closedAt: pr.closed_at ?? undefined,
      mergedAt: pr.merged_at ?? undefined,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!ANALYZABLE_ACTIONS.has(payload.action) || !repo.monitoringEnabled) {
    return;
  }

  const analysis = await Analysis.findOneAndUpdate(
    { repositoryId: repo._id, pullRequestNumber: pr.number, headSha: pr.head.sha, analysisType: 'pull_request' },
    {
      $setOnInsert: {
        repositoryId: repo._id,
        pullRequestId: prRecord._id,
        analysisType: 'pull_request',
        status: 'pending',
        pullRequestNumber: pr.number,
        headSha: pr.head.sha,
        baseSha: pr.base.sha,
        branch: pr.head.ref,
        triggeredByLogin: payload.sender.login,
        triggeredByGithubId: payload.sender.id,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (analysis.status === 'pending') {
    prRecord.latestAnalysisId = analysis._id;
    await prRecord.save();
    await dependencyAnalysisQueue.add('analyze', { analysisId: String(analysis._id) });
  }
}
