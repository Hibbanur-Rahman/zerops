import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess, paginationMeta } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { Analysis } from '../models/Analysis.js';
import { AnalysisPackage } from '../models/AnalysisPackage.js';
import { Finding } from '../models/Finding.js';
import { getOwnedRepositoryIds } from '../services/authorization.service.js';
import { paginationSkip } from '../validators/common.validators.js';
import { listAnalysesQuerySchema } from '../validators/analysis.validators.js';

export const listAnalyses = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const query = listAnalysesQuerySchema.parse(req.query);

  const ownedRepositoryIds = await getOwnedRepositoryIds(req.user.id);
  const filter: Record<string, unknown> = { repositoryId: { $in: ownedRepositoryIds } };

  if (query.repositoryId) {
    if (!ownedRepositoryIds.some((id) => id.equals(query.repositoryId!))) throw AppError.notFound('Repository not found');
    filter.repositoryId = new Types.ObjectId(query.repositoryId);
  }
  if (query.analysisType) filter.analysisType = query.analysisType;

  const [analyses, total] = await Promise.all([
    Analysis.find(filter)
      .sort({ createdAt: -1 })
      .skip(paginationSkip(query.page, query.limit))
      .limit(query.limit)
      .populate('repositoryId', 'name fullName'),
    Analysis.countDocuments(filter),
  ]);

  sendSuccess(res, analyses, 200, paginationMeta(total, query.page, query.limit));
});

export const getAnalysis = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const ownedRepositoryIds = await getOwnedRepositoryIds(req.user.id);

  const analysis = await Analysis.findOne({ _id: req.params.id, repositoryId: { $in: ownedRepositoryIds } }).populate(
    'repositoryId',
    'name fullName owner',
  );
  if (!analysis) throw AppError.notFound('Analysis not found');

  const [packages, findings] = await Promise.all([
    AnalysisPackage.find({ analysisId: analysis._id }).sort({ riskScore: -1 }),
    Finding.find({ analysisId: analysis._id }).sort({ riskScore: -1 }),
  ]);

  sendSuccess(res, { analysis, packages, findings });
});
