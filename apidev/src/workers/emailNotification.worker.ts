import { Worker, type Job } from 'bullmq';
import { createWorkerConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { QUEUE_NAMES } from '../constants/queues.js';
import { notifyForAnalysis } from '../services/email/notification.service.js';
import type { EmailNotificationJobData } from '../queues/emailNotification.queue.js';

async function processEmailNotificationJob(job: Job<EmailNotificationJobData>): Promise<void> {
  await notifyForAnalysis(job.data.analysisId);
}

export function startEmailNotificationWorker(): Worker<EmailNotificationJobData> {
  const worker = new Worker<EmailNotificationJobData>(QUEUE_NAMES.EMAIL_NOTIFICATION, processEmailNotificationJob, {
    connection: createWorkerConnection(),
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, analysisId: job?.data.analysisId, err }, 'email-notification job failed');
  });

  return worker;
}
