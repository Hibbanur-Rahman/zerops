import { Worker, type Job } from 'bullmq';
import { createWorkerConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { QUEUE_NAMES } from '../constants/queues.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import type { GithubWebhookJobData } from '../queues/githubWebhook.queue.js';
import {
  markInstallationUninstalled,
  removeRepositoriesFromInstallation,
  setInstallationSuspended,
  upsertInstallation,
} from '../services/github/installation.service.js';
import { handlePushEvent } from '../services/github/pushEvent.service.js';
import { handlePullRequestEvent } from '../services/github/pullRequestEvent.service.js';

async function processWebhookEvent(job: Job<GithubWebhookJobData>): Promise<void> {
  const webhookEvent = await WebhookEvent.findById(job.data.webhookEventId);
  if (!webhookEvent) {
    logger.warn({ webhookEventId: job.data.webhookEventId }, 'WebhookEvent not found -- skipping');
    return;
  }

  // Idempotent against retries/duplicate delivery of the same job: another
  // worker (or a previous attempt) may have already finished this event.
  if (webhookEvent.status === 'processed') return;

  try {
    const payload = webhookEvent.payload;

    switch (webhookEvent.eventType) {
      case 'installation':
        await handleInstallationEvent(webhookEvent.action, payload);
        break;
      case 'installation_repositories':
        await handleInstallationRepositoriesEvent(payload);
        break;
      case 'push':
        await handlePushEvent(payload);
        break;
      case 'pull_request':
        await handlePullRequestEvent(payload);
        break;
      default:
        logger.debug({ eventType: webhookEvent.eventType }, 'No handler for this webhook event type');
    }

    webhookEvent.status = 'processed';
    webhookEvent.processedAt = new Date();
    await webhookEvent.save();
  } catch (err) {
    webhookEvent.status = 'failed';
    webhookEvent.error = err instanceof Error ? err.message : String(err);
    await webhookEvent.save();
    throw err; // let BullMQ retry with backoff
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInstallationEvent(action: string | null | undefined, payload: any): Promise<void> {
  switch (action) {
    case 'created':
      await upsertInstallation(payload.installation, payload.sender);
      break;
    case 'deleted':
      await markInstallationUninstalled(payload.installation.id);
      break;
    case 'suspend':
      await setInstallationSuspended(payload.installation.id, true);
      break;
    case 'unsuspend':
      await setInstallationSuspended(payload.installation.id, false);
      break;
    case 'new_permissions_accepted':
      await upsertInstallation(payload.installation, payload.sender);
      break;
    default:
      logger.debug({ action }, 'Unhandled installation action');
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInstallationRepositoriesEvent(payload: any): Promise<void> {
  if (payload.action === 'removed' && Array.isArray(payload.repositories_removed)) {
    const ids = payload.repositories_removed.map((r: { id: number }) => r.id);
    await removeRepositoriesFromInstallation(ids);
  }
  // "added" repositories are picked up by the on-demand sync in
  // GET /api/v1/github/repositories -- nothing to persist eagerly here.
}

export function startGithubWebhookWorker(): Worker<GithubWebhookJobData> {
  const worker = new Worker<GithubWebhookJobData>(QUEUE_NAMES.GITHUB_WEBHOOK, processWebhookEvent, {
    connection: createWorkerConnection(),
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'github-webhook job failed');
  });

  return worker;
}
