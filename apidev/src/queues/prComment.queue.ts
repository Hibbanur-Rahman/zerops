import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/queues.js';
import { defaultJobOptions } from './jobOptions.js';

export interface PrCommentJobData {
  analysisId: string;
}

export const prCommentQueue = new Queue<PrCommentJobData>(QUEUE_NAMES.PR_COMMENT, {
  connection: getRedisConnection(),
  defaultJobOptions,
});
