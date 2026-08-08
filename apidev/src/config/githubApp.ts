import { App } from 'octokit';
import { env } from './env.js';
import { logger } from './logger.js';
import { AppError } from '../utils/AppError.js';

let app: App | null = null;

/**
 * Lazily-constructed singleton -- returns null until GITHUB_APP_ID,
 * GITHUB_APP_PRIVATE_KEY, GITHUB_CLIENT_ID/SECRET and GITHUB_WEBHOOK_SECRET
 * are all configured, so callers can degrade gracefully instead of crashing
 * the process when the operator hasn't finished GitHub App setup yet.
 */
export function getGithubApp(): App | null {
  if (!env.github.configured) return null;
  if (app) return app;

  app = new App({
    appId: env.GITHUB_APP_ID!,
    privateKey: env.githubAppPrivateKey!,
    webhooks: { secret: env.GITHUB_WEBHOOK_SECRET! },
    oauth: { clientId: env.GITHUB_CLIENT_ID!, clientSecret: env.GITHUB_CLIENT_SECRET! },
    log: {
      debug: (message) => logger.debug(message),
      info: (message) => logger.info(message),
      warn: (message) => logger.warn(message),
      error: (message) => logger.error(message),
    },
  });

  return app;
}

export function requireGithubApp(): App {
  const instance = getGithubApp();
  if (!instance) {
    throw new AppError('The GitHub App is not configured yet', 503, 'GITHUB_NOT_CONFIGURED');
  }
  return instance;
}
