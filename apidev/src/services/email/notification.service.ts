import type { Types } from 'mongoose';
import { Analysis } from '../../models/Analysis.js';
import { Repository } from '../../models/Repository.js';
import { User } from '../../models/User.js';
import { PullRequest } from '../../models/PullRequest.js';
import { Commit } from '../../models/Commit.js';
import { GithubAccount } from '../../models/GithubAccount.js';
import { NotificationPreference } from '../../models/NotificationPreference.js';
import { Notification } from '../../models/Notification.js';
import { Finding } from '../../models/Finding.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { ResendProvider } from './providers/ResendProvider.js';
import { renderAnalysisEmailHtml, renderAnalysisEmailSubject, renderAnalysisEmailText } from './emailTemplates.js';
import type { RiskLevel } from '../../constants/riskLevels.js';
import type { NotificationType } from '../../constants/enums.js';

const SEVERITY_PREFERENCE_KEY: Record<RiskLevel, 'notifyOnCritical' | 'notifyOnHigh' | 'notifyOnMedium' | 'notifyOnLow'> = {
  CRITICAL: 'notifyOnCritical',
  SEVERE: 'notifyOnCritical',
  HIGH: 'notifyOnHigh',
  MODERATE: 'notifyOnMedium',
  LOW: 'notifyOnLow',
};

async function recordSkipped(
  userId: Types.ObjectId,
  status: 'skipped' | 'email_unavailable',
  fields: Record<string, unknown>,
) {
  await Notification.create({ userId, channel: 'email', status, ...fields });
}

/**
 * Sends (or deliberately skips) the notification email for a completed
 * analysis. Author identification follows spec section 43: PR author for
 * PR analyses, commit author for push analyses, falling back to the
 * connected GitHub account's email, then the platform account's own email
 * -- never a third party's address we don't have consent to use. Missing
 * an email is recorded as `email_unavailable`, never a failure.
 */
export async function notifyForAnalysis(analysisId: string): Promise<void> {
  const analysis = await Analysis.findById(analysisId);
  if (!analysis || analysis.status !== 'completed') return;

  const repo = await Repository.findById(analysis.repositoryId);
  if (!repo) return;

  const owner = await User.findById(repo.userId);
  if (!owner) return;

  const prefs = await NotificationPreference.findOne({ userId: owner._id });
  const emailNotificationsEnabled = prefs?.emailNotificationsEnabled ?? true;
  const notifyOnPullRequest = prefs?.notifyOnPullRequest ?? true;
  const notifyOnPush = prefs?.notifyOnPush ?? true;

  const notificationType: NotificationType =
    analysis.overallRisk === 'CRITICAL' || analysis.overallRisk === 'SEVERE' ? 'high_risk_detected' : 'analysis_completed';

  const baseFields = {
    type: notificationType,
    subject: '(skipped)',
    relatedAnalysisId: analysis._id,
    relatedRepositoryId: repo._id,
    relatedPullRequestId: analysis.pullRequestId,
  };

  if (!emailNotificationsEnabled) {
    await recordSkipped(owner._id, 'skipped', baseFields);
    return;
  }
  if (analysis.analysisType === 'pull_request' && !notifyOnPullRequest) {
    await recordSkipped(owner._id, 'skipped', baseFields);
    return;
  }
  if (analysis.analysisType === 'push' && !notifyOnPush) {
    await recordSkipped(owner._id, 'skipped', baseFields);
    return;
  }

  const severityPreferenceKey = SEVERITY_PREFERENCE_KEY[analysis.overallRisk as RiskLevel];
  const severityGateOpen = prefs ? prefs[severityPreferenceKey] : severityPreferenceKey !== 'notifyOnLow';
  if (!severityGateOpen) {
    await recordSkipped(owner._id, 'skipped', baseFields);
    return;
  }

  let recipientEmail: string | undefined;
  let pullRequestUrl: string | undefined;
  let pullRequestNumber: number | undefined;
  let pullRequestTitle: string | undefined;

  if (analysis.analysisType === 'pull_request' && analysis.pullRequestId) {
    const pr = await PullRequest.findById(analysis.pullRequestId);
    recipientEmail = pr?.authorEmail ?? undefined;
    pullRequestNumber = pr?.number;
    pullRequestTitle = pr?.title;
    pullRequestUrl = pr ? `${repo.htmlUrl}/pull/${pr.number}` : undefined;
  } else if (analysis.commitSha) {
    const commit = await Commit.findOne({ repositoryId: repo._id, sha: analysis.commitSha });
    recipientEmail = commit?.authorEmail ?? undefined;
  }

  if (!recipientEmail) {
    const githubAccount = await GithubAccount.findOne({ userId: owner._id });
    recipientEmail = githubAccount?.email ?? owner.email;
  }

  if (!recipientEmail) {
    await recordSkipped(owner._id, 'email_unavailable', baseFields);
    return;
  }

  const findings = await Finding.find({ analysisId: analysis._id }).sort({ riskScore: -1 }).limit(5);
  const dashboardUrl = `${env.FRONTEND_URL}/repositories/${repo._id}/analysis/${analysis._id}`;

  const emailData = {
    repositoryFullName: repo.fullName,
    pullRequestNumber,
    pullRequestTitle,
    overallRisk: analysis.overallRisk as RiskLevel,
    securityScore: analysis.securityScore ?? 100,
    summary: {
      critical: analysis.summary?.critical ?? 0,
      high: analysis.summary?.high ?? 0,
      medium: analysis.summary?.medium ?? 0,
      low: analysis.summary?.low ?? 0,
      vulnerabilities: analysis.summary?.vulnerabilities ?? 0,
    },
    topFindings: findings.map((f) => ({
      packageName: f.packageName,
      severity: f.severity as RiskLevel,
      evidence: f.factors[0]?.evidence ?? 'Risk detected',
    })),
    pullRequestUrl,
    dashboardUrl,
  };

  const subject = renderAnalysisEmailSubject(emailData);

  if (!env.email.configured) {
    logger.warn({ analysisId }, 'RESEND_API_KEY not set -- skipping email notification');
    await recordSkipped(owner._id, 'skipped', { ...baseFields, subject, recipientEmail });
    return;
  }

  const provider = new ResendProvider();
  const result = await provider.send({
    to: recipientEmail,
    subject,
    html: renderAnalysisEmailHtml(emailData),
    text: renderAnalysisEmailText(emailData),
  });

  await Notification.create({
    userId: owner._id,
    type: notificationType,
    channel: 'email',
    recipientEmail,
    subject,
    status: result.success ? 'sent' : 'failed',
    error: result.error,
    relatedAnalysisId: analysis._id,
    relatedRepositoryId: repo._id,
    relatedPullRequestId: analysis.pullRequestId,
    sentAt: result.success ? new Date() : undefined,
  });
}
