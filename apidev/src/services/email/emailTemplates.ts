import type { RiskLevel } from '../../constants/riskLevels.js';

export interface FindingHighlight {
  packageName: string;
  severity: RiskLevel;
  evidence: string;
}

export interface AnalysisEmailData {
  repositoryFullName: string;
  pullRequestNumber?: number;
  pullRequestTitle?: string;
  overallRisk: RiskLevel;
  securityScore: number;
  summary: { critical: number; high: number; medium: number; low: number; vulnerabilities: number };
  topFindings: FindingHighlight[];
  pullRequestUrl?: string;
  dashboardUrl: string;
}

export function renderAnalysisEmailSubject(data: AnalysisEmailData): string {
  const repoName = data.repositoryFullName.split('/')[1] ?? data.repositoryFullName;
  const suffix = data.pullRequestNumber ? ` PR #${data.pullRequestNumber}` : '';
  return `[Package Risk] ${data.overallRisk} risk detected in ${repoName}${suffix}`;
}

const RISK_COLOR: Record<RiskLevel, string> = {
  CRITICAL: '#dc2626',
  SEVERE: '#ea580c',
  HIGH: '#f59e0b',
  MODERATE: '#eab308',
  LOW: '#16a34a',
};

export function renderAnalysisEmailHtml(data: AnalysisEmailData): string {
  const repoName = data.repositoryFullName.split('/')[1] ?? data.repositoryFullName;
  const color = RISK_COLOR[data.overallRisk];
  const findingsCount = data.summary.critical + data.summary.high + data.summary.medium + data.summary.low;

  const findingsHtml = data.topFindings
    .map(
      (f) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
            <strong>${f.packageName}</strong> &mdash; <span style="color:${RISK_COLOR[f.severity]};font-weight:600;">${f.severity}</span>
            <div style="color:#6b7280;font-size:13px;margin-top:2px;">${f.evidence}</div>
          </td>
        </tr>`,
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
  <body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f9fafb;margin:0;padding:24px;">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="background:#111827;padding:20px 24px;color:#ffffff;font-size:16px;font-weight:600;">
          🔐 Package Risk Analyzer
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 4px;font-size:20px;">${repoName}</h1>
          <p style="margin:0 0 16px;color:#6b7280;">
            ${data.pullRequestNumber ? `Pull Request #${data.pullRequestNumber}${data.pullRequestTitle ? ` &mdash; ${data.pullRequestTitle}` : ''}` : 'Recent push'}
          </p>
          <p style="margin:0 0 16px;">
            <span style="display:inline-block;padding:4px 10px;border-radius:4px;background:${color};color:#ffffff;font-weight:600;font-size:13px;">
              RISK: ${data.overallRisk}
            </span>
          </p>
          <p style="margin:0 0 16px;color:#374151;">
            Security score <strong>${data.securityScore}/100</strong>. ${findingsCount} finding(s) detected
            (${data.summary.critical} critical, ${data.summary.high} high, ${data.summary.medium} medium, ${data.summary.low} low)
            across ${data.summary.vulnerabilities} known vulnerabilit${data.summary.vulnerabilities === 1 ? 'y' : 'ies'}.
          </p>
          ${data.topFindings.length > 0 ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:16px;">${findingsHtml}</table>` : ''}
          <div style="margin-top:20px;">
            ${data.pullRequestUrl ? `<a href="${data.pullRequestUrl}" style="display:inline-block;margin-right:12px;padding:10px 16px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;">View Pull Request</a>` : ''}
            <a href="${data.dashboardUrl}" style="display:inline-block;padding:10px 16px;background:#ffffff;color:#111827;text-decoration:none;border-radius:6px;font-size:14px;border:1px solid #d1d5db;">View Full Analysis</a>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderAnalysisEmailText(data: AnalysisEmailData): string {
  const repoName = data.repositoryFullName.split('/')[1] ?? data.repositoryFullName;
  const lines = [
    'Package Risk Analyzer',
    '',
    repoName,
    data.pullRequestNumber ? `Pull Request #${data.pullRequestNumber}` : 'Recent push',
    '',
    `Risk: ${data.overallRisk}`,
    `Security score: ${data.securityScore}/100`,
    `${data.summary.critical} critical, ${data.summary.high} high, ${data.summary.medium} medium, ${data.summary.low} low`,
    '',
  ];
  for (const f of data.topFindings) {
    lines.push(`${f.severity}: ${f.packageName}`, f.evidence, '');
  }
  if (data.pullRequestUrl) lines.push(`View Pull Request: ${data.pullRequestUrl}`);
  lines.push(`View Full Analysis: ${data.dashboardUrl}`);
  return lines.join('\n');
}
