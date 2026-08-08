import { Types } from 'mongoose';
import { Repository } from '../models/Repository.js';
import { AppError } from '../utils/AppError.js';
import type { RepositoryDoc } from '../models/Repository.js';
import type { HydratedDocument } from 'mongoose';

export async function getOwnedRepositoryIds(userId: string): Promise<Types.ObjectId[]> {
  const repos = await Repository.find({ userId }).select('_id');
  return repos.map((r) => r._id);
}

/** Loads a repository and throws 404 (not 403) if it doesn't belong to this user -- avoids leaking existence of other users' repos. */
export async function assertRepositoryOwnership(
  repositoryId: string,
  userId: string,
): Promise<HydratedDocument<RepositoryDoc>> {
  if (!Types.ObjectId.isValid(repositoryId)) throw AppError.notFound('Repository not found');
  const repo = await Repository.findOne({ _id: repositoryId, userId });
  if (!repo) throw AppError.notFound('Repository not found');
  return repo;
}
