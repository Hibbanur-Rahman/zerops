import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { Repository } from '../models/Repository.js';
import { Analysis } from '../models/Analysis.js';
import { Finding } from '../models/Finding.js';
import { Dependency } from '../models/Dependency.js';
import { getOwnedRepositoryIds } from '../services/authorization.service.js';
import { RISK_LEVELS } from '../constants/riskLevels.js';

export const getOverview = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const ownedRepositoryIds = await getOwnedRepositoryIds(req.user.id);

  const [totalRepositories, monitoredRepositories, severityCounts, recentAnalyses, distinctPackages] = await Promise.all([
    Repository.countDocuments({ userId: req.user.id }),
    Repository.countDocuments({ userId: req.user.id, monitoringEnabled: true }),
    Finding.aggregate([
      { $match: { repositoryId: { $in: ownedRepositoryIds }, status: 'open' } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    Analysis.find({ repositoryId: { $in: ownedRepositoryIds } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('repositoryId', 'name fullName'),
    Dependency.countDocuments({}),
  ]);

  const counts: Record<string, number> = { LOW: 0, MODERATE: 0, HIGH: 0, SEVERE: 0, CRITICAL: 0 };
  for (const entry of severityCounts as Array<{ _id: string; count: number }>) counts[entry._id] = entry.count;

  sendSuccess(res, {
    totalRepositories,
    monitoredRepositories,
    totalDependencies: distinctPackages,
    totalVulnerabilities: (counts.LOW ?? 0) + (counts.MODERATE ?? 0) + (counts.HIGH ?? 0) + (counts.SEVERE ?? 0) + (counts.CRITICAL ?? 0),
    critical: (counts.CRITICAL ?? 0) + (counts.SEVERE ?? 0),
    high: counts.HIGH ?? 0,
    medium: counts.MODERATE ?? 0,
    low: counts.LOW ?? 0,
    recentAnalyses,
  });
});

export const getActivity = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const ownedRepositoryIds = await getOwnedRepositoryIds(req.user.id);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const analyses = await Analysis.find({ repositoryId: { $in: ownedRepositoryIds } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('repositoryId', 'name fullName');

  sendSuccess(
    res,
    analyses.map((a) => ({
      id: a._id,
      repository: a.repositoryId,
      analysisType: a.analysisType,
      pullRequestNumber: a.pullRequestNumber,
      overallRisk: a.overallRisk,
      status: a.status,
      createdAt: a.createdAt,
    })),
  );
});

export const getRiskDistribution = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const ownedRepositoryIds = await getOwnedRepositoryIds(req.user.id);

  const results = await Finding.aggregate([
    { $match: { repositoryId: { $in: ownedRepositoryIds }, status: 'open' } },
    { $group: { _id: '$severity', count: { $sum: 1 } } },
  ]);

  const distribution: Record<string, number> = Object.fromEntries(RISK_LEVELS.map((level) => [level, 0]));
  for (const entry of results as Array<{ _id: string; count: number }>) distribution[entry._id] = entry.count;

  sendSuccess(res, distribution);
});
