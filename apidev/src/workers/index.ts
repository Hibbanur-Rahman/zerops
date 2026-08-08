import type { Worker } from 'bullmq';
import { logger } from '../config/logger.js';
import { startGithubWebhookWorker } from './githubWebhook.worker.js';

let workers: Worker[] = [];

export function startAllWorkers(): void {
  if (workers.length > 0) return;

  workers = [startGithubWebhookWorker()];
  logger.info(`Started ${workers.length} BullMQ worker(s)`);
}

export async function stopAllWorkers(): Promise<void> {
  await Promise.allSettled(workers.map((w) => w.close()));
  workers = [];
}
