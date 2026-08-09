import '../integration/testEnv.js';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { sign } from '@octokit/webhooks-methods';
import request from 'supertest';
import mongoose from 'mongoose';
import type { Job } from 'bullmq';
import { resolveTestMongo } from './mongoTestEnv.js';
import { removeJobIfPossible } from './queueTestUtils.js';

const testMongo = await resolveTestMongo();
if (testMongo) process.env.MONGODB_URI = testMongo.uri;

const { createApp } = await import('../../src/app.js');
const { WebhookEvent } = await import('../../src/models/WebhookEvent.js');
const { githubWebhookQueue } = await import('../../src/queues/githubWebhook.queue.js');

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET as string;

function installationRepositoriesRemovedPayload(githubRepositoryId: number) {
  return {
    action: 'removed',
    installation: { id: 555111 },
    repositories_removed: [{ id: githubRepositoryId, name: 'repo', full_name: 'acme/repo' }],
  };
}

async function postWebhook(opts: {
  body: string;
  signature?: string;
  deliveryId?: string;
  eventType?: string;
}) {
  const app = createApp();
  const req = request(app).post('/api/v1/github/webhook').set('Content-Type', 'application/json');
  if (opts.signature !== undefined) req.set('X-Hub-Signature-256', opts.signature);
  if (opts.deliveryId !== undefined) req.set('X-GitHub-Delivery', opts.deliveryId);
  if (opts.eventType !== undefined) req.set('X-GitHub-Event', opts.eventType);
  return req.send(opts.body);
}

describe.skipIf(!testMongo)('POST /api/v1/github/webhook -- signature verification & idempotency', () => {
  const createdJobIds: string[] = [];

  beforeAll(async () => {
    await mongoose.connect(testMongo!.uri);
  });

  afterEach(async () => {
    await WebhookEvent.deleteMany({});
    for (const jobId of createdJobIds.splice(0)) {
      await removeJobIfPossible(githubWebhookQueue, jobId);
    }
  });

  afterAll(async () => {
    await githubWebhookQueue.close();
    await mongoose.disconnect();
    await testMongo!.teardown();
  });

  it('rejects a request missing the delivery/event headers with 400', async () => {
    const body = JSON.stringify(installationRepositoriesRemovedPayload(1));
    const res = await postWebhook({ body, signature: await sign(WEBHOOK_SECRET, body) });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid signature with 401 and never persists the event', async () => {
    const body = JSON.stringify(installationRepositoriesRemovedPayload(2));
    const res = await postWebhook({
      body,
      signature: 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
      deliveryId: randomUUID(),
      eventType: 'installation_repositories',
    });

    expect(res.status).toBe(401);
    expect(await WebhookEvent.countDocuments({})).toBe(0);
  });

  it('acknowledges but does not persist an event type it does not act on', async () => {
    const body = JSON.stringify({ zen: 'Anything added dilutes everything else.' });
    const res = await postWebhook({
      body,
      signature: await sign(WEBHOOK_SECRET, body),
      deliveryId: randomUUID(),
      eventType: 'ping',
    });

    expect(res.status).toBe(202);
    expect(res.body.data.ignored).toBe(true);
    expect(await WebhookEvent.countDocuments({})).toBe(0);
  });

  it('accepts a validly-signed event, persists it, and enqueues a real BullMQ job', async () => {
    const deliveryId = randomUUID();
    const body = JSON.stringify(installationRepositoriesRemovedPayload(3));
    const res = await postWebhook({
      body,
      signature: await sign(WEBHOOK_SECRET, body),
      deliveryId,
      eventType: 'installation_repositories',
    });

    expect(res.status).toBe(202);
    expect(res.body.data.received).toBe(true);

    const stored = await WebhookEvent.findOne({ githubDeliveryId: deliveryId });
    expect(stored).not.toBeNull();
    expect(stored?.status).toBe('queued');
    expect(stored?.jobId).toBeTruthy();

    const job = (await githubWebhookQueue.getJob(stored!.jobId!)) as Job | undefined;
    expect(job).toBeDefined();
    expect(job?.data).toEqual({ webhookEventId: String(stored!._id) });
    if (job?.id) createdJobIds.push(job.id);
  });

  it('is idempotent against GitHub redelivering the same delivery ID', async () => {
    const deliveryId = randomUUID();
    const body = JSON.stringify(installationRepositoriesRemovedPayload(4));
    const signature = await sign(WEBHOOK_SECRET, body);
    const opts = { body, signature, deliveryId, eventType: 'installation_repositories' };

    const first = await postWebhook(opts);
    expect(first.status).toBe(202);

    const stored = await WebhookEvent.findOne({ githubDeliveryId: deliveryId });
    if (stored?.jobId) createdJobIds.push(stored.jobId);

    const second = await postWebhook(opts);
    expect(second.status).toBe(200);
    expect(second.body.data.duplicate).toBe(true);

    expect(await WebhookEvent.countDocuments({ githubDeliveryId: deliveryId })).toBe(1);
  });
});
