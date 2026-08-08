import type { Worker } from 'bullmq';
import { logger } from '../config/logger.js';
import { startGithubWebhookWorker } from './githubWebhook.worker.js';
import { startDependencyAnalysisWorker } from './dependencyAnalysis.worker.js';
import { startPrCommentWorker } from './prComment.worker.js';
import { startEmailNotificationWorker } from './emailNotification.worker.js';

let workers: Worker[] = [];

export function startAllWorkers(): void {
  if (workers.length > 0) return;

  workers = [
    startGithubWebhookWorker(),
    startDependencyAnalysisWorker(),
    startPrCommentWorker(),
    startEmailNotificationWorker(),
  ];
  logger.info(`Started ${workers.length} BullMQ worker(s)`);
}

export async function stopAllWorkers(): Promise<void> {
  await Promise.allSettled(workers.map((w) => w.close()));
  workers = [];
}
