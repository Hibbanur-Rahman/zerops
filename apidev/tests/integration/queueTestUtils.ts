import type { Queue } from 'bullmq';

/**
 * Best-effort cleanup for a job created during a test. A live dev server
 * sharing this same real Redis/queue can grab the job before the test's own
 * cleanup runs and hold its lock -- that's a real other worker doing real
 * work, not a test failure, so tolerate it instead of failing the run.
 */
export async function removeJobIfPossible(queue: Queue, jobId: string | undefined): Promise<void> {
  if (!jobId) return;
  try {
    const job = await queue.getJob(jobId);
    await job?.remove();
  } catch {
    // Another worker holds the lock -- defaultJobOptions' removeOnComplete/removeOnFail clears it eventually.
  }
}

/** Polls until `check` returns truthy or the timeout elapses, for asserting on state a worker updates asynchronously. */
export async function waitUntil<T>(
  check: () => Promise<T | undefined | null | false>,
  { timeoutMs = 15000, intervalMs = 200 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() >= deadline) throw new Error(`waitUntil: condition not met within ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
