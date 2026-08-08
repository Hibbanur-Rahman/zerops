export const QUEUE_NAMES = {
  GITHUB_WEBHOOK: 'github-webhook',
  DEPENDENCY_ANALYSIS: 'dependency-analysis',
  PR_COMMENT: 'pr-comment',
  EMAIL_NOTIFICATION: 'email-notification',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
