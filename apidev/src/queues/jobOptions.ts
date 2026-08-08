import type { JobsOptions } from 'bullmq';

/**
 * Exponential backoff (2s, 4s, 8s, 16s, 32s) across 5 attempts, with bounded
 * retention so Redis doesn't grow unbounded -- completed jobs are cheap to
 * lose, failed ones are kept longer for debugging.
 */
export const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};
