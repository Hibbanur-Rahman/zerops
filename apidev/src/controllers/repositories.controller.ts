import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess, paginationMeta } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { Repository } from '../models/Repository.js';
import { Analysis } from '../models/Analysis.js';
import { Finding } from '../models/Finding.js';
import { PullRequest } from '../models/PullRequest.js';
import { GithubInstallation } from '../models/GithubInstallation.js';
import { assertRepositoryOwnership } from '../services/authorization.service.js';
import { recordAuditLog } from '../services/auditLog.service.js';
import { requireGithubApp } from '../config/githubApp.js';
import { getLatestCommitSha } from '../services/github/repoContent.service.js';
import { splitFullName } from '../utils/github.js';
import { dependencyAnalysisQueue } from '../queues/dependencyAnalysis.queue.js';
import { paginationQuerySchema, paginationSkip } from '../validators/common.validators.js';
import type { UpdateRepositoryInput } from '../validators/repository.validators.js';

export const listRepositories = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { page, limit } = paginationQuerySchema.parse(req.query);

  const filter = { userId: req.user.id };
  const [repositories, total] = await Promise.all([
    Repository.find(filter).sort({ fullName: 1 }).skip(paginationSkip(page, limit)).limit(limit),
    Repository.countDocuments(filter),
  ]);

  sendSuccess(res, repositories, 200, paginationMeta(total, page, limit));
});

export const getRepository = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const repo = await assertRepositoryOwnership(req.params.id as string, req.user.id);

  const [recentAnalyses, openFindingsBySeverity, openPullRequestCount] = await Promise.all([
    Analysis.find({ repositoryId: repo._id }).sort({ createdAt: -1 }).limit(5),
    Finding.aggregate([
      { $match: { repositoryId: repo._id, status: 'open' } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    PullRequest.countDocuments({ repositoryId: repo._id, state: 'open' }),
  ]);

  const severityCounts: Record<string, number> = { LOW: 0, MODERATE: 0, HIGH: 0, SEVERE: 0, CRITICAL: 0 };
  for (const entry of openFindingsBySeverity as Array<{ _id: string; count: number }>) {
    severityCounts[entry._id] = entry.count;
  }

  sendSuccess(res, {
    repository: repo,
    stats: {
      openFindingsBySeverity: severityCounts,
      openPullRequestCount,
    },
    recentAnalyses,
  });
});

export const updateRepository = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const repo = await assertRepositoryOwnership(req.params.id as string, req.user.id);
  const input = req.body as UpdateRepositoryInput;

  const monitoringChanged = input.monitoringEnabled !== undefined && input.monitoringEnabled !== repo.monitoringEnabled;
  const policyChanged = input.policy !== undefined;

  if (input.monitoringEnabled !== undefined) repo.monitoringEnabled = input.monitoringEnabled;
  if (input.fullScanEnabled !== undefined) repo.fullScanEnabled = input.fullScanEnabled;
  if (input.policy) Object.assign(repo.policy, input.policy);

  await repo.save();

  if (monitoringChanged) {
    await recordAuditLog({
      userId: req.user.id,
      action: input.monitoringEnabled ? 'repository_enabled' : 'repository_disabled',
      targetType: 'Repository',
      targetId: String(repo._id),
      req,
    });
  }
  if (policyChanged) {
    await recordAuditLog({
      userId: req.user.id,
      action: 'security_policy_changed',
      targetType: 'Repository',
      targetId: String(repo._id),
      metadata: input.policy,
      req,
    });
  }

  sendSuccess(res, repo);
});

export const triggerScan = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const repo = await assertRepositoryOwnership(req.params.id as string, req.user.id);

  const installation = await GithubInstallation.findById(repo.installationId);
  if (!installation) throw new AppError('No active GitHub App installation for this repository', 409, 'GITHUB_API_ERROR');

  const app = requireGithubApp();
  const octokit = await app.getInstallationOctokit(installation.installationId);
  const { owner, repo: repoName } = splitFullName(repo.fullName);
  const commitSha = await getLatestCommitSha(octokit, owner, repoName, repo.defaultBranch);

  const analysis = await Analysis.findOneAndUpdate(
    { repositoryId: repo._id, commitSha, analysisType: 'manual' },
    {
      $setOnInsert: {
        repositoryId: repo._id,
        commitSha,
        analysisType: 'manual',
        status: 'pending',
        branch: repo.defaultBranch,
        triggeredByLogin: req.user.email,
        triggeredByGithubId: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (analysis.status === 'pending') {
    await dependencyAnalysisQueue.add('analyze', { analysisId: String(analysis._id) });
    await recordAuditLog({ userId: req.user.id, action: 'initial_scan_started', targetType: 'Repository', targetId: String(repo._id), req });
  }

  sendSuccess(res, analysis, 202);
});
