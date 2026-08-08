import { verify } from '@octokit/webhooks-methods';
import { env } from '../../config/env.js';

export async function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): Promise<boolean> {
  if (!signatureHeader || !env.GITHUB_WEBHOOK_SECRET) return false;
  return verify(env.GITHUB_WEBHOOK_SECRET, rawBody.toString('utf8'), signatureHeader);
}
