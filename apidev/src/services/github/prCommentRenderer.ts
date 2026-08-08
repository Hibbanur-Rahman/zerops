import type { RiskLevel } from '../../constants/riskLevels.js';

export const PR_COMMENT_MARKER = '<!-- package-risk-analyzer -->';

const SEVERITY_EMOJI: Record<RiskLevel, string> = {
  CRITICAL: '🔴',
  SEVERE: '🟠',
  HIGH: '🟠',
  MODERATE: '🟡',
  LOW: '🟢',
};

const MAX_FINDINGS_SHOWN = 10;

export interface PrCommentAnalysisInput {
  overallRisk?: RiskLevel | null;
  commitSha?: string | null;
  headSha?: string | null;
  summary?: {
    totalDependencies: number;
    newDependencies: number;
    vulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface PrCommentFindingInput {
  packageName: string;
  severity: RiskLevel;
  evidence: string;
}

export function renderPrComment(
  analysis: PrCommentAnalysisInput,
  findings: PrCommentFindingInput[],
  dashboardUrl: string,
): string {
  const s = analysis.summary;
  const lines: string[] = [
    PR_COMMENT_MARKER,
    '## 🔐 Package Risk Analysis',
    '',
    `**Risk: ${analysis.overallRisk ?? 'LOW'}**`,
    '',
    '| Metric | Result |',
    '|---|---:|',
    `| Packages analyzed | ${s?.totalDependencies ?? 0} |`,
    `| New packages | ${s?.newDependencies ?? 0} |`,
    `| Vulnerabilities | ${s?.vulnerabilities ?? 0} |`,
    `| Critical | ${s?.critical ?? 0} |`,
    `| High | ${s?.high ?? 0} |`,
    `| Medium | ${s?.medium ?? 0} |`,
    `| Low | ${s?.low ?? 0} |`,
    '',
  ];

  if (findings.length > 0) {
    lines.push('### Findings', '');
    for (const finding of findings.slice(0, MAX_FINDINGS_SHOWN)) {
      lines.push(`${SEVERITY_EMOJI[finding.severity]} **${finding.packageName}** — ${finding.severity}`, '', finding.evidence, '');
    }
    if (findings.length > MAX_FINDINGS_SHOWN) {
      lines.push(`_...and ${findings.length - MAX_FINDINGS_SHOWN} more finding(s). See the full report for details._`, '');
    }
    lines.push('### Recommendation', '', 'Review the findings above before merging.', '');
  } else {
    lines.push('No significant findings.', '');
  }

  lines.push(`[View full analysis](${dashboardUrl})`, '', `Analysis: \`${analysis.headSha ?? analysis.commitSha ?? ''}\``);

  return lines.join('\n');
}
