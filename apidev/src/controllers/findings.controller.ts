import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess, paginationMeta } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { Finding } from '../models/Finding.js';
import { getOwnedRepositoryIds } from '../services/authorization.service.js';
import { recordAuditLog } from '../services/auditLog.service.js';
import { paginationSkip } from '../validators/common.validators.js';
import { listFindingsQuerySchema, type UpdateFindingStatusInput } from '../validators/finding.validators.js';

export const listFindings = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const query = listFindingsQuerySchema.parse(req.query);

  const ownedRepositoryIds = await getOwnedRepositoryIds(req.user.id);
  const filter: Record<string, unknown> = { repositoryId: { $in: ownedRepositoryIds } };

  if (query.repositoryId) {
    if (!ownedRepositoryIds.some((id) => id.equals(query.repositoryId!))) throw AppError.notFound('Repository not found');
    filter.repositoryId = new Types.ObjectId(query.repositoryId);
  }
  if (query.severity) filter.severity = query.severity;
  if (query.status) filter.status = query.status;
  if (query.packageName) filter.packageName = query.packageName;
  if (query.createdAfter || query.createdBefore) {
    filter.createdAt = {
      ...(query.createdAfter ? { $gte: query.createdAfter } : {}),
      ...(query.createdBefore ? { $lte: query.createdBefore } : {}),
    };
  }

  const [findings, total] = await Promise.all([
    Finding.find(filter)
      .sort({ createdAt: -1 })
      .skip(paginationSkip(query.page, query.limit))
      .limit(query.limit)
      .populate('repositoryId', 'name fullName'),
    Finding.countDocuments(filter),
  ]);

  sendSuccess(res, findings, 200, paginationMeta(total, query.page, query.limit));
});

export const getFinding = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const ownedRepositoryIds = await getOwnedRepositoryIds(req.user.id);

  const finding = await Finding.findOne({ _id: req.params.id, repositoryId: { $in: ownedRepositoryIds } }).populate(
    'repositoryId',
    'name fullName owner',
  );
  if (!finding) throw AppError.notFound('Finding not found');

  sendSuccess(res, finding);
});

export const updateFindingStatus = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const ownedRepositoryIds = await getOwnedRepositoryIds(req.user.id);

  const finding = await Finding.findOne({ _id: req.params.id, repositoryId: { $in: ownedRepositoryIds } });
  if (!finding) throw AppError.notFound('Finding not found');

  const input = req.body as UpdateFindingStatusInput;
  finding.status = input.status;
  finding.resolvedBy = input.status !== 'open' ? new Types.ObjectId(req.user.id) : undefined;
  finding.resolvedAt = input.status !== 'open' ? new Date() : undefined;
  finding.ignoredReason = input.status === 'ignored' ? input.ignoredReason : undefined;
  await finding.save();

  await recordAuditLog({
    userId: req.user.id,
    action: input.status === 'ignored' ? 'finding_ignored' : input.status === 'resolved' ? 'finding_resolved' : 'security_policy_changed',
    targetType: 'Finding',
    targetId: String(finding._id),
    req,
  });

  sendSuccess(res, finding);
});
