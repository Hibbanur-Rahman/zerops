import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { closeRedisConnections, ensureQueueSafeRedisConfig } from './config/redis.js';
import { startAllWorkers, stopAllWorkers } from './workers/index.js';

async function main(): Promise<void> {
  await connectDatabase();
  await ensureQueueSafeRedisConfig();

  if (!env.DISABLE_INLINE_WORKERS) {
    startAllWorkers();
  }

  const app = createApp();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Package Risk Analyzer API listening on 0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
    if (!env.github.configured) {
      logger.warn('GitHub App is not fully configured -- /api/v1/github routes will return 503 until it is');
    }
    if (!env.email.configured) {
      logger.warn('RESEND_API_KEY is not set -- email notifications will be skipped');
    }
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
      await Promise.allSettled([stopAllWorkers(), disconnectDatabase(), closeRedisConnections()]);
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });
}

main().catch((err) => {
  console.error('Fatal error during startup', err);
  process.exit(1);
});
