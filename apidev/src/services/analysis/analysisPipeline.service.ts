import { Analysis } from '../../models/Analysis.js';
import { AnalysisPackage } from '../../models/AnalysisPackage.js';
import { Finding } from '../../models/Finding.js';
import { Repository } from '../../models/Repository.js';
import { GithubInstallation } from '../../models/GithubInstallation.js';
import { requireGithubApp } from '../../config/githubApp.js';
import { logger } from '../../config/logger.js';
import { groupManifestsWithLockfiles, listDependencyFilePaths, type RepoRef } from '../github/repoContent.service.js';
import { buildManifestSnapshot } from './manifestSnapshot.js';
import { diffDependencyTrees, type DependencyChange } from './dependencyDiff.js';
import { gatherSecurityIntel } from '../security/securityIntel.service.js';
import { calculateOverallRisk, calculatePackageRisk } from '../risk/riskEngine.js';
import { calculateSecurityScore } from '../risk/securityScore.js';
import {
  getPreviousMaintainersCount,
  persistDependencyMetadata,
  persistDependencyVersion,
  persistVulnerabilities,
} from './dependencyPersistence.service.js';
import { prCommentQueue } from '../../queues/prComment.queue.js';
import { emailNotificationQueue } from '../../queues/emailNotification.queue.js';
import type { RiskLevel } from '../../constants/riskLevels.js';
import type { ProviderStatusEntry } from '../security/securityIntel.service.js';
import { splitFullName } from '../../utils/github.js';

interface AggregatedChange extends DependencyChange {
  manifestPath: string;
}

/**
 * Runs one full dependency analysis: fetch manifests/lockfiles at the
 * relevant ref(s), diff against the base ref when there is one, check
 * every changed package against security intelligence, score it, and
 * persist Findings + summary stats. Idempotent -- re-running an already
 * completed analysis is a no-op, and every DB write here is itself an
 * upsert keyed on stable identifiers, so a retried job never duplicates data.
 */
// If a worker crashes mid-analysis the doc is left stuck at "running" forever;
// treat "running" as claimed only within this window so a retried/duplicate
// job for the same analysis is skipped while another worker is actively on
// it, but a genuinely orphaned analysis still gets picked back up.
const RUNNING_CLAIM_STALE_MS = 15 * 60 * 1000;

export async function runDependencyAnalysis(analysisId: string): Promise<void> {
  const analysis = await Analysis.findById(analysisId);
  if (!analysis) {
    logger.warn({ analysisId }, 'Analysis not found -- skipping');
    return;
  }
  if (analysis.status === 'completed') return;
  if (
    analysis.status === 'running' &&
    analysis.startedAt &&
    Date.now() - analysis.startedAt.getTime() < RUNNING_CLAIM_STALE_MS
  ) {
    logger.info({ analysisId }, 'Analysis already running elsewhere -- skipping duplicate job');
    return;
  }

  const repo = await Repository.findById(analysis.repositoryId);
  if (!repo) {
    analysis.status = 'failed';
    analysis.error = 'Repository no longer exists';
    await analysis.save();
    return;
  }

  analysis.status = 'running';
  analysis.startedAt = new Date();
  await analysis.save();

  const providerStatus: ProviderStatusEntry[] = [];

  try {
    const app = requireGithubApp();
    const installation = await GithubInstallation.findById(repo.installationId);
    if (!installation) throw new Error('No GitHub App installation found for this repository');

    const octokit = await app.getInstallationOctokit(installation.installationId);
    const { owner, repo: repoName } = splitFullName(repo.fullName);

    const headRef: RepoRef = { owner, repo: repoName, ref: analysis.headSha ?? analysis.commitSha! };
    const baseRef: RepoRef | null = analysis.baseSha ? { owner, repo: repoName, ref: analysis.baseSha } : null;

    const headPaths = await listDependencyFilePaths(octokit, headRef);
    const manifestGroups = groupManifestsWithLockfiles(headPaths);

    const headSnapshots = (
      await Promise.all(manifestGroups.map((group) => buildManifestSnapshot(octokit, headRef, group)))
    ).filter((s) => s !== null);

    const baseSnapshotsByPath = new Map<string, Awaited<ReturnType<typeof buildManifestSnapshot>>>();
    if (baseRef) {
      const baseSnapshots = await Promise.all(
        manifestGroups.map((group) => buildManifestSnapshot(octokit, baseRef, group).catch(() => null)),
      );
      for (const snapshot of baseSnapshots) {
        if (snapshot) baseSnapshotsByPath.set(snapshot.manifestPath, snapshot);
      }
    }

    const allChanges: AggregatedChange[] = [];
    let directCount = 0;
    let transitiveCount = 0;

    for (const headSnapshot of headSnapshots) {
      const baseSnapshot = baseSnapshotsByPath.get(headSnapshot.manifestPath);
      const changes = baseSnapshot
        ? diffDependencyTrees(baseSnapshot.tree, headSnapshot.tree)
        : headSnapshot.tree.map((node) => ({
            name: node.name,
            changeType: 'unchanged' as const,
            version: node.version,
            isDirect: node.isDirect,
            path: node.path,
          }));

      allChanges.push(...changes.map((c) => ({ ...c, manifestPath: headSnapshot.manifestPath })));
      directCount += headSnapshot.tree.filter((n) => n.isDirect).length;
      transitiveCount += headSnapshot.tree.filter((n) => !n.isDirect).length;
    }

    const severityCounts = { critical: 0, severe: 0, high: 0, moderate: 0, low: 0 };
    let vulnerabilityCount = 0;
    const findingSeverities: RiskLevel[] = [];

    // Clear findings from any previous run of this exact analysis (retry-safety) before re-inserting.
    await Finding.deleteMany({ analysisId: analysis._id });
    await AnalysisPackage.deleteMany({ analysisId: analysis._id });

    for (const change of allChanges) {
      if (change.changeType === 'removed' || !change.version) continue;

      // One package's failure (a bad registry response, a persistence hiccup, ...)
      // must never abort the whole repository analysis (spec section 30).
      try {
        await analyzeOnePackage(change);
      } catch (err) {
        logger.error({ err, packageName: change.name, analysisId }, 'Failed to analyze one package -- skipping it');
      }
    }

    async function analyzeOnePackage(change: AggregatedChange): Promise<void> {
      if (!change.version) return;
      const previousMaintainersCount = await getPreviousMaintainersCount(change.name);
      const intel = await gatherSecurityIntel(change.name, change.version, octokit);
      providerStatus.push(...intel.providerStatus);

      const dependency = await persistDependencyMetadata(change.name, intel.metadata);
      await persistDependencyVersion(String(dependency._id), change.version, intel.metadata);
      const persistedVulns = await persistVulnerabilities(intel.vulnerabilities, change.name);

      const risk = calculatePackageRisk({
        packageName: change.name,
        version: change.version,
        previousVersion: change.previousVersion,
        isDirect: change.isDirect,
        changeType: change.changeType,
        vulnerabilities: intel.vulnerabilities,
        metadata: intel.metadata,
        previousMaintainersCount,
      });

      await AnalysisPackage.create({
        analysisId: analysis!._id,
        dependencyId: dependency._id,
        name: change.name,
        version: change.version,
        previousVersion: change.previousVersion,
        changeType: change.changeType,
        isDirect: change.isDirect,
        manifestPath: change.manifestPath,
        dependencyPath: change.path,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
      });

      vulnerabilityCount += intel.vulnerabilities.length;

      if (risk.factors.length > 0) {
        findingSeverities.push(risk.riskLevel);
        switch (risk.riskLevel) {
          case 'CRITICAL': severityCounts.critical++; break;
          case 'SEVERE': severityCounts.severe++; break;
          case 'HIGH': severityCounts.high++; break;
          case 'MODERATE': severityCounts.moderate++; break;
          case 'LOW': severityCounts.low++; break;
        }

        await Finding.create({
          analysisId: analysis!._id,
          repositoryId: repo!._id,
          packageName: change.name,
          packageVersion: change.version,
          manifestPath: change.manifestPath,
          dependencyType: change.isDirect ? 'direct' : 'transitive',
          dependencyPath: change.path,
          severity: risk.riskLevel,
          riskScore: risk.riskScore,
          status: 'open',
          factors: risk.factors,
          vulnerabilities: persistedVulns.map((v) => ({
            vulnerabilityId: v._id,
            sourceId: v.sourceId,
            summary: v.summary,
            severity: v.severity,
            cvssScore: v.cvssScore,
          })),
        });
      }
    }

    const securityScore = calculateSecurityScore(severityCounts);

    analysis.manifestPaths = manifestGroups.map((g) => g.manifestPath);
    analysis.summary = {
      totalDependencies: directCount + transitiveCount,
      directDependencies: directCount,
      transitiveDependencies: transitiveCount,
      newDependencies: allChanges.filter((c) => c.changeType === 'added').length,
      removedDependencies: allChanges.filter((c) => c.changeType === 'removed').length,
      updatedDependencies: allChanges.filter((c) => c.changeType === 'updated' || c.changeType === 'downgraded').length,
      vulnerabilities: vulnerabilityCount,
      critical: severityCounts.critical + severityCounts.severe,
      high: severityCounts.high,
      medium: severityCounts.moderate,
      low: severityCounts.low,
    };
    analysis.securityScore = securityScore;
    analysis.overallRisk = calculateOverallRisk(findingSeverities);
    analysis.providerStatus = dedupeProviderStatus(providerStatus) as typeof analysis.providerStatus;
    analysis.status = 'completed';
    analysis.completedAt = new Date();
    await analysis.save();

    repo.securityScore = securityScore;
    repo.lastScanAt = new Date();
    repo.lastAnalysisId = analysis._id;
    await repo.save();

    if (analysis.analysisType === 'pull_request') {
      await prCommentQueue.add('update-comment', { analysisId: String(analysis._id) });
    }
    await emailNotificationQueue.add('notify', { analysisId: String(analysis._id) });
  } catch (err) {
    analysis.status = 'failed';
    analysis.error = err instanceof Error ? err.message : String(err);
    await analysis.save();
    throw err;
  }
}

function dedupeProviderStatus(entries: ProviderStatusEntry[]): ProviderStatusEntry[] {
  const byProvider = new Map<string, ProviderStatusEntry>();
  for (const entry of entries) {
    const existing = byProvider.get(entry.provider);
    if (!existing || (!existing.available && entry.available)) {
      byProvider.set(entry.provider, entry);
    }
  }
  return [...byProvider.values()];
}
