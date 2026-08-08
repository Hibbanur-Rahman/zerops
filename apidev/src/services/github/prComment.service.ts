import type { Octokit } from 'octokit';
import type { Types } from 'mongoose';
import { PullRequest } from '../../models/PullRequest.js';
import { PR_COMMENT_MARKER, renderPrComment, type PrCommentAnalysisInput, type PrCommentFindingInput } from './prCommentRenderer.js';
import type { FindingDoc } from '../../models/Finding.js';
import { logger } from '../../config/logger.js';

interface RepoIdentity {
  owner: string;
  repo: string;
}

/**
 * Creates or updates the single stable PR comment for this analysis. Looks
 * up any existing comment carrying PR_COMMENT_MARKER via the PullRequest
 * record's cached commentId first (fast path); falls back to scanning
 * issue comments if that's stale (e.g. the comment was deleted on GitHub).
 */
export async function upsertPrComment(
  octokit: Octokit,
  identity: RepoIdentity,
  repositoryId: Types.ObjectId,
  pullRequestNumber: number,
  analysis: PrCommentAnalysisInput,
  findings: FindingDoc[],
  dashboardUrl: string,
): Promise<void> {
  const findingInputs: PrCommentFindingInput[] = findings.map((f) => ({
    packageName: f.packageName,
    severity: f.severity as PrCommentFindingInput['severity'],
    evidence: f.factors[0]?.evidence ?? 'Risk detected',
  }));
  const body = renderPrComment(analysis, findingInputs, dashboardUrl);
  const pr = await PullRequest.findOne({ repositoryId, number: pullRequestNumber });

  let existingCommentId = pr?.commentId;

  if (!existingCommentId) {
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner: identity.owner,
      repo: identity.repo,
      issue_number: pullRequestNumber,
      per_page: 100,
    });
    existingCommentId = comments.find((c) => c.body?.includes(PR_COMMENT_MARKER))?.id;
  }

  if (existingCommentId) {
    try {
      await octokit.rest.issues.updateComment({
        owner: identity.owner,
        repo: identity.repo,
        comment_id: existingCommentId,
        body,
      });
      if (pr && pr.commentId !== existingCommentId) {
        pr.commentId = existingCommentId;
        await pr.save();
      }
      return;
    } catch (err) {
      logger.warn({ err, existingCommentId }, 'Failed to update existing PR comment -- creating a new one');
    }
  }

  const { data: created } = await octokit.rest.issues.createComment({
    owner: identity.owner,
    repo: identity.repo,
    issue_number: pullRequestNumber,
    body,
  });

  if (pr) {
    pr.commentId = created.id;
    await pr.save();
  }
}
