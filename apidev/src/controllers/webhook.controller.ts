import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { isWebhookEventType } from '../constants/enums.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { verifyWebhookSignature } from '../services/github/webhookVerify.service.js';
import { githubWebhookQueue } from '../queues/githubWebhook.queue.js';

interface GithubWebhookPayload {
  action?: string;
  installation?: { id: number };
  repository?: { id: number };
}

export const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const deliveryId = req.headers['x-github-delivery'] as string | undefined;
  const eventType = req.headers['x-github-event'] as string | undefined;

  if (!env.github.configured) {
    throw new AppError('The GitHub App is not configured yet', 503, 'GITHUB_NOT_CONFIGURED');
  }
  if (!deliveryId || !eventType) {
    throw AppError.badRequest('Missing required GitHub webhook headers');
  }

  const valid = await verifyWebhookSignature(req.rawBody ?? Buffer.alloc(0), signature);
  if (!valid) {
    logger.warn({ deliveryId, eventType }, 'Rejected webhook with invalid signature');
    throw new AppError('Invalid webhook signature', 401, 'WEBHOOK_SIGNATURE_INVALID');
  }

  if (!isWebhookEventType(eventType)) {
    // Acknowledge events we don't act on (e.g. "ping") so GitHub doesn't treat this as a failure.
    res.status(202).json({ success: true, data: { ignored: true, eventType } });
    return;
  }

  const payload = req.body as GithubWebhookPayload;

  let webhookEvent;
  try {
    webhookEvent = await WebhookEvent.create({
      githubDeliveryId: deliveryId,
      eventType,
      action: payload.action,
      installationId: payload.installation?.id,
      githubRepositoryId: payload.repository?.id,
      payload,
      status: 'received',
    });
  } catch (err) {
    if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
      logger.info({ deliveryId }, 'Duplicate webhook delivery ignored');
      res.status(200).json({ success: true, data: { duplicate: true } });
      return;
    }
    throw err;
  }

  const job = await githubWebhookQueue.add('process-webhook', { webhookEventId: String(webhookEvent._id) });
  webhookEvent.status = 'queued';
  webhookEvent.jobId = job.id;
  await webhookEvent.save();

  res.status(202).json({ success: true, data: { received: true } });
});
