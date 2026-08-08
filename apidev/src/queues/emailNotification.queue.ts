import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/queues.js';
import { defaultJobOptions } from './jobOptions.js';

export interface EmailNotificationJobData {
  analysisId: string;
}

export const emailNotificationQueue = new Queue<EmailNotificationJobData>(QUEUE_NAMES.EMAIL_NOTIFICATION, {
  connection: getRedisConnection(),
  defaultJobOptions,
});
