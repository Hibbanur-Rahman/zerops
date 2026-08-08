import type { Octokit } from 'octokit';
import type { Types } from 'mongoose';
import { PullRequest } from '../../models/PullRequest.js';
import type { SecurityPolicy } from '../../models/Repository.js';

interface RepoIdentity {
  owner: string;
  repo: string;
}

export interface CheckRunSummaryInput {
  critical: number;
  high: number;
  medium: number;
  low: number;
  securityScore: number;
}

function decideConclusion(policy: SecurityPolicy, summary: CheckRunSummaryInput): 'success' | 'neutral' | 'failure' {
  if (policy.failOnCritical && summary.critical > 0) return 'failure';
  if (policy.failOnHigh && summary.high > 0) return 'failure';
  if (policy.failOnMedium && summary.medium > 0) return 'failure';
  if (summary.securityScore < 100 - policy.maximumRiskScore) return 'failure';
  if (summary.critical + summary.high + summary.medium + summary.low > 0) return 'neutral';
  return 'success';
}

function summaryText(summary: CheckRunSummaryInput): string {
  return [
    `**Security score:** ${summary.securityScore}/100`,
    '',
    `- Critical: ${summary.critical}`,
    `- High: ${summary.high}`,
    `- Medium: ${summary.medium}`,
    `- Low: ${summary.low}`,
  ].join('\n');
}

/**
 * Creates or updates the "Package Risk Analysis" check run for a commit,
 * reusing the same check run across re-runs of the same PR (keyed on the
 * PullRequest record's cached checkRunId) instead of creating a new one
 * on every push.
 */
export async function upsertCheckRun(
  octokit: Octokit,
  identity: RepoIdentity,
  repositoryId: Types.ObjectId,
  pullRequestNumber: number,
  headSha: string,
  policy: SecurityPolicy,
  summary: CheckRunSummaryInput,
): Promise<void> {
  const conclusion = decideConclusion(policy, summary);
  const pr = await PullRequest.findOne({ repositoryId, number: pullRequestNumber });

  const params = {
    owner: identity.owner,
    repo: identity.repo,
    name: 'Package Risk Analysis',
    head_sha: headSha,
    status: 'completed' as const,
    conclusion,
    output: {
      title: conclusion === 'failure' ? 'Risk policy violation detected' : 'Analysis complete',
      summary: summaryText(summary),
    },
  };

  if (pr?.checkRunId) {
    try {
      await octokit.rest.checks.update({ ...params, check_run_id: pr.checkRunId });
      return;
    } catch {
      // fall through and create a fresh check run below
    }
  }

  const { data: created } = await octokit.rest.checks.create(params);
  if (pr) {
    pr.checkRunId = created.id;
    await pr.save();
  }
}
