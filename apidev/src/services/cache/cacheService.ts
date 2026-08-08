import { getRedisConnection } from '../../config/redis.js';
import { logger } from '../../config/logger.js';

const DEFAULT_TTL_SECONDS = 6 * 60 * 60; // 6 hours -- package/security metadata changes slowly

/**
 * Generic read-through cache for external package/security metadata. Redis
 * is a performance layer only -- MongoDB (Dependency/Vulnerability models)
 * remains the source of truth; a cache miss or Redis outage just means a
 * fresh external lookup, never a hard failure.
 */
export async function cachedFetch<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const redis = getRedisConnection();

  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch (err) {
    logger.warn({ err, key }, 'Cache read failed -- continuing without cache');
  }

  const value = await fetcher();

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, 'Cache write failed -- continuing without cache');
  }

  return value;
}

export function npmMetadataCacheKey(packageName: string, version: string): string {
  return `npm:${packageName}:${version}`;
}

export function osvCacheKey(packageName: string, version: string): string {
  return `osv:${packageName}:${version}`;
}

export function ghsaCacheKey(packageName: string): string {
  return `ghsa:${packageName}`;
}

export const CACHE_TTL_SECONDS = DEFAULT_TTL_SECONDS;
