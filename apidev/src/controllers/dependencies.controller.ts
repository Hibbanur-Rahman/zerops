import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { sendSuccess, paginationMeta } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import { Dependency } from '../models/Dependency.js';
import { DependencyVersion } from '../models/DependencyVersion.js';
import { Vulnerability } from '../models/Vulnerability.js';
import { paginationQuerySchema, paginationSkip } from '../validators/common.validators.js';

export const listDependencies = catchAsync(async (req: Request, res: Response) => {
  const { page, limit } = paginationQuerySchema.parse(req.query);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

  const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
  const [dependencies, total] = await Promise.all([
    Dependency.find(filter).sort({ name: 1 }).skip(paginationSkip(page, limit)).limit(limit),
    Dependency.countDocuments(filter),
  ]);

  sendSuccess(res, dependencies, 200, paginationMeta(total, page, limit));
});

export const getDependency = catchAsync(async (req: Request, res: Response) => {
  const dependency = await Dependency.findById(req.params.id);
  if (!dependency) throw AppError.notFound('Dependency not found');

  const [versions, vulnerabilities] = await Promise.all([
    DependencyVersion.find({ dependencyId: dependency._id }).sort({ publishedAt: -1 }).limit(50),
    Vulnerability.find({ packageName: dependency.name }).sort({ severity: -1 }),
  ]);

  sendSuccess(res, { dependency, versions, vulnerabilities });
});
