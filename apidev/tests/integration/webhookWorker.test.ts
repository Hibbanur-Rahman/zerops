import '../integration/testEnv.js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose, { Types } from 'mongoose';
import type { Worker } from 'bullmq';
import { resolveTestMongo } from './mongoTestEnv.js';

const testMongo = await resolveTestMongo();
if (testMongo) process.env.MONGODB_URI = testMongo.uri;

const { Repository } = await import('../../src/models/Repository.js');
const { WebhookEvent } = await import('../../src/models/WebhookEvent.js');
const { githubWebhookQueue } = await import('../../src/queues/githubWebhook.queue.js');
const { startGithubWebhookWorker } = await import('../../src/workers/githubWebhook.worker.js');

function waitForJobSettled(worker: Worker, jobId: string, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for job ${jobId} to settle`)), timeoutMs);
    worker.on('completed', (job) => {
      if (job.id === jobId) {
        clearTimeout(timer);
        resolve();
      }
    });
    worker.on('failed', (job, err) => {
      if (job?.id === jobId) {
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}

describe.skipIf(!testMongo)('github-webhook worker -- real BullMQ + real MongoDB, no external APIs', () => {
  let worker: Worker;

  beforeAll(async () => {
    await mongoose.connect(testMongo!.uri);
    worker = startGithubWebhookWorker();
  });

  afterAll(async () => {
    await worker.close();
    await githubWebhookQueue.close();
    await mongoose.disconnect();
    await testMongo!.teardown();
  });

  it('processes an installation_repositories(removed) job end to end', async () => {
    const githubRepositoryId = Math.floor(Math.random() * 1_000_000_000);
    const repo = await Repository.create({
      githubRepositoryId,
      installationId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      name: 'repo',
      fullName: 'acme/repo',
      owner: 'acme',
      htmlUrl: `https://github.com/acme/repo`,
      monitoringEnabled: true,
    });

    const webhookEvent = await WebhookEvent.create({
      githubDeliveryId: randomUUID(),
      eventType: 'installation_repositories',
      action: 'removed',
      payload: { action: 'removed', repositories_removed: [{ id: githubRepositoryId }] },
      status: 'queued',
    });

    const job = await githubWebhookQueue.add('process-webhook', { webhookEventId: String(webhookEvent._id) });
    await waitForJobSettled(worker, job.id!);

    const updatedRepo = await Repository.findById(repo._id);
    expect(updatedRepo?.monitoringEnabled).toBe(false);
    expect(updatedRepo?.removedFromInstallationAt).toBeTruthy();

    const updatedEvent = await WebhookEvent.findById(webhookEvent._id);
    expect(updatedEvent?.status).toBe('processed');
    expect(updatedEvent?.processedAt).toBeTruthy();
  });
});
