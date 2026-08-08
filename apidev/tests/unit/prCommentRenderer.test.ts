import { describe, expect, it } from 'vitest';
import { PR_COMMENT_MARKER, renderPrComment } from '../../src/services/github/prCommentRenderer.js';

describe('renderPrComment', () => {
  it('includes the stable marker so the comment can be found and updated later', () => {
    const body = renderPrComment({ overallRisk: 'LOW', commitSha: 'abc123' }, [], 'https://example.com/dashboard');
    expect(body.startsWith(PR_COMMENT_MARKER)).toBe(true);
  });

  it('renders the summary table and findings for a risky analysis', () => {
    const body = renderPrComment(
      {
        overallRisk: 'CRITICAL',
        summary: { totalDependencies: 143, newDependencies: 3, vulnerabilities: 2, critical: 1, high: 1, medium: 0, low: 0 },
        commitSha: 'abc123',
      },
      [{ packageName: 'lodash', severity: 'CRITICAL', evidence: 'Known vulnerability, CVSS 9.8' }],
      'https://example.com/dashboard',
    );

    expect(body).toContain('**Risk: CRITICAL**');
    expect(body).toContain('| Packages analyzed | 143 |');
    expect(body).toContain('lodash');
    expect(body).toContain('CVSS 9.8');
    expect(body).toContain('[View full analysis](https://example.com/dashboard)');
    expect(body).toContain('Analysis: `abc123`');
  });

  it('shows "no significant findings" when there are none', () => {
    const body = renderPrComment(
      { overallRisk: 'LOW', summary: { totalDependencies: 10, newDependencies: 0, vulnerabilities: 0, critical: 0, high: 0, medium: 0, low: 0 }, commitSha: 'x' },
      [],
      'https://example.com',
    );
    expect(body).toContain('No significant findings.');
  });
});
