import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess, paginationMeta } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { PullRequest } from '../models/PullRequest.js';
import { Finding } from '../models/Finding.js';
import { getOwnedRepositoryIds } from '../services/authorization.service.js';
import { paginationQuerySchema, paginationSkip } from '../validators/common.validators.js';

export const listPullRequests = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { page, limit } = paginationQuerySchema.parse(req.query);
  const repositoryId = typeof req.query.repositoryId === 'string' ? req.query.repositoryId : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;

  const ownedRepositoryIds = await getOwnedRepositoryIds(req.user.id);
  const filter: Record<string, unknown> = { repositoryId: { $in: ownedRepositoryIds } };

  if (repositoryId) {
    if (!ownedRepositoryIds.some((id) => id.equals(repositoryId))) throw AppError.notFound('Repository not found');
    filter.repositoryId = new Types.ObjectId(repositoryId);
  }
  if (state) filter.state = state;

  const [pullRequests, total] = await Promise.all([
    PullRequest.find(filter)
      .sort({ openedAt: -1 })
      .skip(paginationSkip(page, limit))
      .limit(limit)
      .populate('repositoryId', 'name fullName'),
    PullRequest.countDocuments(filter),
  ]);

  sendSuccess(res, pullRequests, 200, paginationMeta(total, page, limit));
});

export const getPullRequest = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const ownedRepositoryIds = await getOwnedRepositoryIds(req.user.id);

  const pullRequest = await PullRequest.findOne({ _id: req.params.id, repositoryId: { $in: ownedRepositoryIds } }).populate(
    'repositoryId',
    'name fullName owner',
  );
  if (!pullRequest) throw AppError.notFound('Pull request not found');

  const findings = pullRequest.latestAnalysisId
    ? await Finding.find({ analysisId: pullRequest.latestAnalysisId }).sort({ riskScore: -1 })
    : [];

  sendSuccess(res, { pullRequest, findings });
});
