import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { closeRedisConnections, ensureQueueSafeRedisConfig } from './config/redis.js';
import { startAllWorkers, stopAllWorkers } from './workers/index.js';

/**
 * Standalone worker-process entrypoint. Runs the same BullMQ workers that
 * server.ts starts inline -- kept as a separate entrypoint so a dedicated
 * "worker" Zerops service can be pointed at `node dist/worker.js` later
 * without any code changes, once analysis volume justifies splitting workers
 * out of the API container. See README "Architecture decisions".
 */
async function main(): Promise<void> {
  await connectDatabase();
  await ensureQueueSafeRedisConfig();
  startAllWorkers();
  logger.info('Worker process started');

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down worker process`);
    await Promise.allSettled([stopAllWorkers(), disconnectDatabase(), closeRedisConnections()]);
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal error starting worker process', err);
  process.exit(1);
});
