import { Resend } from 'resend';
import { env } from '../../../config/env.js';
import { logger } from '../../../config/logger.js';
import type { EmailProvider, SendEmailInput, SendEmailResult } from '../EmailProvider.js';

export class ResendProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly client: Resend;

  constructor() {
    this.client = new Resend(env.RESEND_API_KEY);
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    try {
      const { error } = await this.client.emails.send({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      if (error) {
        logger.error({ error, to: input.to }, 'Resend rejected the email');
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      logger.error({ err, to: input.to }, 'Failed to send email via Resend');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}
