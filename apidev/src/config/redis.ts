import IORedis, { type Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

let sharedConnection: Redis | null = null;

/**
 * BullMQ requires maxRetriesPerRequest:null on connections it owns so it can
 * manage retries/backoff itself instead of ioredis giving up early.
 */
function createConnection(): Redis {
  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  connection.on('error', (err) => logger.error({ err }, 'Redis connection error'));
  connection.on('connect', () => logger.info('Redis connected'));

  return connection;
}

/** Shared connection for cache reads/writes and Queue producers. */
export function getRedisConnection(): Redis {
  if (!sharedConnection) sharedConnection = createConnection();
  return sharedConnection;
}

/**
 * BullMQ requires the Redis/Valkey instance to run maxmemory-policy=noeviction
 * -- any eviction policy (e.g. the allkeys-lru a managed cache tier defaults
 * to) can silently drop queued/in-flight job data under memory pressure.
 * Managed services may reset config on restart, so this re-applies it
 * defensively on every boot instead of relying on a one-time manual fix.
 */
export async function ensureQueueSafeRedisConfig(): Promise<void> {
  try {
    const connection = getRedisConnection();
    const [, currentPolicy] = await connection.config('GET', 'maxmemory-policy');
    if (currentPolicy && currentPolicy !== 'noeviction') {
      await connection.config('SET', 'maxmemory-policy', 'noeviction');
      logger.warn(
        { previousPolicy: currentPolicy },
        'Redis maxmemory-policy was not noeviction -- reset it to protect queued job data',
      );
    }
  } catch (err) {
    logger.error({ err }, 'Failed to verify/set Redis maxmemory-policy');
  }
}

/** BullMQ Workers must not share a connection with anything issuing blocking commands elsewhere. */
export function createWorkerConnection(): Redis {
  return createConnection();
}

export async function pingRedis(): Promise<boolean> {
  try {
    const pong = await getRedisConnection().ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export async function closeRedisConnections(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
  }
}
