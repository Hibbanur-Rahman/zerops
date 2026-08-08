import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { QUEUE_NAMES } from '../constants/queues.js';
import { defaultJobOptions } from './jobOptions.js';

export interface GithubWebhookJobData {
  webhookEventId: string;
}

export const githubWebhookQueue = new Queue<GithubWebhookJobData>(QUEUE_NAMES.GITHUB_WEBHOOK, {
  connection: getRedisConnection(),
  defaultJobOptions,
});
