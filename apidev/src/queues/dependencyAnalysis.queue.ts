import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/queues.js';
import { defaultJobOptions } from './jobOptions.js';

export interface DependencyAnalysisJobData {
  analysisId: string;
}

export const dependencyAnalysisQueue = new Queue<DependencyAnalysisJobData>(QUEUE_NAMES.DEPENDENCY_ANALYSIS, {
  connection: getRedisConnection(),
  defaultJobOptions,
});
