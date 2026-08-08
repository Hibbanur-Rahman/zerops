import { Worker, type Job } from 'bullmq';
import { createWorkerConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { QUEUE_NAMES } from '../constants/queues.js';
import { Analysis } from '../models/Analysis.js';
import { PullRequest } from '../models/PullRequest.js';
import { Repository } from '../models/Repository.js';
import { GithubInstallation } from '../models/GithubInstallation.js';
import { Finding } from '../models/Finding.js';
import { requireGithubApp } from '../config/githubApp.js';
import { splitFullName } from '../utils/github.js';
import { upsertPrComment } from '../services/github/prComment.service.js';
import { upsertCheckRun } from '../services/github/checkRun.service.js';
import type { PrCommentJobData } from '../queues/prComment.queue.js';

async function processPrCommentJob(job: Job<PrCommentJobData>): Promise<void> {
  const analysis = await Analysis.findById(job.data.analysisId);
  if (!analysis || analysis.analysisType !== 'pull_request' || !analysis.pullRequestId) return;

  const [pr, repo] = await Promise.all([
    PullRequest.findById(analysis.pullRequestId),
    Repository.findById(analysis.repositoryId),
  ]);
  if (!pr || !repo) {
    logger.warn({ analysisId: job.data.analysisId }, 'PR or repository not found -- skipping PR comment/check update');
    return;
  }

  const installation = await GithubInstallation.findById(repo.installationId);
  if (!installation) return;

  const app = requireGithubApp();
  const octokit = await app.getInstallationOctokit(installation.installationId);
  const identity = splitFullName(repo.fullName);

  const findings = await Finding.find({ analysisId: analysis._id }).sort({ riskScore: -1 });
  const dashboardUrl = `${env.FRONTEND_URL}/repositories/${repo._id}/analysis/${analysis._id}`;

  await upsertPrComment(octokit, identity, repo._id, pr.number, analysis, findings, dashboardUrl);

  await upsertCheckRun(octokit, identity, repo._id, pr.number, pr.headSha, repo.policy, {
    critical: analysis.summary?.critical ?? 0,
    high: analysis.summary?.high ?? 0,
    medium: analysis.summary?.medium ?? 0,
    low: analysis.summary?.low ?? 0,
    securityScore: analysis.securityScore ?? 100,
  });
}

export function startPrCommentWorker(): Worker<PrCommentJobData> {
  const worker = new Worker<PrCommentJobData>(QUEUE_NAMES.PR_COMMENT, processPrCommentJob, {
    connection: createWorkerConnection(),
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, analysisId: job?.data.analysisId, err }, 'pr-comment job failed');
  });

  return worker;
}
