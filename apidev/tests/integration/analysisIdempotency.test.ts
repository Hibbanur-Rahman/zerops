import '../integration/testEnv.js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { resolveTestMongo } from './mongoTestEnv.js';

const testMongo = await resolveTestMongo();
if (testMongo) process.env.MONGODB_URI = testMongo.uri;

const { Repository } = await import('../../src/models/Repository.js');
const { Analysis } = await import('../../src/models/Analysis.js');
const { handlePushEvent } = await import('../../src/services/github/pushEvent.service.js');
const { runDependencyAnalysis } = await import('../../src/services/analysis/analysisPipeline.service.js');
const { dependencyAnalysisQueue } = await import('../../src/queues/dependencyAnalysis.queue.js');

function pushPayload(githubRepositoryId: number, afterSha: string) {
  return {
    ref: 'refs/heads/main',
    before: '0'.repeat(40),
    after: afterSha,
    deleted: false,
    repository: { id: githubRepositoryId },
    commits: [
      {
        id: afterSha,
        message: 'test commit',
        added: [],
        removed: [],
        modified: ['package.json'],
        author: { name: 'Test Author', email: 'author@example.com', username: 'testauthor' },
      },
    ],
    pusher: { name: 'testauthor' },
    sender: { id: 1, login: 'testauthor' },
  };
}

describe.skipIf(!testMongo)('analysis idempotency', () => {
  const createdJobIds: string[] = [];

  beforeAll(async () => {
    await mongoose.connect(testMongo!.uri);
  });

  afterEach(async () => {
    for (const jobId of createdJobIds.splice(0)) {
      const job = await dependencyAnalysisQueue.getJob(jobId);
      await job?.remove();
    }
  });

  afterAll(async () => {
    await dependencyAnalysisQueue.close();
    await mongoose.disconnect();
    await testMongo!.teardown();
  });

  it('handlePushEvent never creates a second Analysis for the same repo+commit', async () => {
    const githubRepositoryId = Math.floor(Math.random() * 1_000_000_000);
    const repo = await Repository.create({
      githubRepositoryId,
      installationId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      name: 'repo',
      fullName: 'acme/repo',
      owner: 'acme',
      htmlUrl: 'https://github.com/acme/repo',
      monitoringEnabled: true,
      fullScanEnabled: true,
    });
    const afterSha = 'a'.repeat(40);

    await handlePushEvent(pushPayload(githubRepositoryId, afterSha));
    await handlePushEvent(pushPayload(githubRepositoryId, afterSha));

    const analyses = await Analysis.find({ repositoryId: repo._id, commitSha: afterSha, analysisType: 'push' });
    expect(analyses).toHaveLength(1);

    for (const job of await dependencyAnalysisQueue.getJobs(['waiting', 'delayed'])) {
      if (job.id) createdJobIds.push(job.id);
    }
  });

  it('runDependencyAnalysis skips a duplicate job while another worker actively holds the analysis', async () => {
    const analysis = await Analysis.create({
      repositoryId: new Types.ObjectId(),
      analysisType: 'manual',
      status: 'running',
      startedAt: new Date(),
    });

    await runDependencyAnalysis(String(analysis._id));

    const reloaded = await Analysis.findById(analysis._id);
    expect(reloaded?.status).toBe('running');
    expect(reloaded?.error).toBeFalsy();
  });

  it('runDependencyAnalysis still picks up an analysis stuck running from a crashed worker', async () => {
    const staleStartedAt = new Date(Date.now() - 60 * 60 * 1000); // 1h ago, past the 15m staleness window
    const analysis = await Analysis.create({
      repositoryId: new Types.ObjectId(), // no matching Repository -- forces the "not found" branch
      analysisType: 'manual',
      status: 'running',
      startedAt: staleStartedAt,
    });

    await runDependencyAnalysis(String(analysis._id));

    const reloaded = await Analysis.findById(analysis._id);
    expect(reloaded?.status).toBe('failed');
    expect(reloaded?.error).toBe('Repository no longer exists');
  });
});
