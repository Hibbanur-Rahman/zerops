import { Worker, type Job } from 'bullmq';
import { createWorkerConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { QUEUE_NAMES } from '../constants/queues.js';
import type { DependencyAnalysisJobData } from '../queues/dependencyAnalysis.queue.js';
import { runDependencyAnalysis } from '../services/analysis/analysisPipeline.service.js';

async function processAnalysisJob(job: Job<DependencyAnalysisJobData>): Promise<void> {
  await runDependencyAnalysis(job.data.analysisId);
}

export function startDependencyAnalysisWorker(): Worker<DependencyAnalysisJobData> {
  const worker = new Worker<DependencyAnalysisJobData>(QUEUE_NAMES.DEPENDENCY_ANALYSIS, processAnalysisJob, {
    connection: createWorkerConnection(),
    concurrency: 3,
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, analysisId: job?.data.analysisId, err }, 'dependency-analysis job failed');
  });

  return worker;
}
