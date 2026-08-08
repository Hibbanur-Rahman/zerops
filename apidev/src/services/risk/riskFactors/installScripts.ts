import type { RiskFactorEvaluator, RiskFactorResult } from '../types.js';

// Heuristic pattern match against the install-script *command text* from
// package.json (real registry data). This is not source-code/tarball
// analysis -- it flags command strings that look like they fetch and run
// remote code, which is the pattern real npm supply-chain attacks use.
const SUSPICIOUS_COMMAND_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /curl|wget/i, label: 'downloads a remote file' },
  { pattern: /\bbase64\b/i, label: 'references base64-encoded content' },
  { pattern: /chmod\s+\+x/i, label: 'marks a file executable' },
  { pattern: /\/dev\/tcp\//i, label: 'opens a raw TCP connection' },
  { pattern: /eval\(/i, label: 'evaluates dynamic code' },
];

const CRYPTO_MINING_KEYWORDS = /xmrig|coinhive|cryptonight|stratum\+tcp|minerd|nicehash/i;

export const evaluateInstallScripts: RiskFactorEvaluator = (ctx) => {
  const scripts = ctx.metadata?.installScripts;
  if (!scripts) return [];

  const results: RiskFactorResult[] = [];

  for (const [phase, command] of Object.entries(scripts)) {
    if (!command) continue;

    results.push({
      factor: `${phase}_script`,
      severity: 'MODERATE',
      score: 30,
      evidence: `Package runs a ${phase} script: \`${command}\``,
      recommendation: `Review the ${phase} script before merging -- install scripts run arbitrary code on the developer's and CI machines`,
    });

    const suspicious = SUSPICIOUS_COMMAND_PATTERNS.find(({ pattern }) => pattern.test(command));
    if (suspicious) {
      results.push({
        factor: 'suspicious_install_command',
        severity: 'HIGH',
        score: 65,
        evidence: `The ${phase} script ${suspicious.label}: \`${command}\``,
        recommendation: `Treat this ${phase} script as high-risk and verify exactly what it fetches/executes before merging`,
      });
    }

    if (CRYPTO_MINING_KEYWORDS.test(command)) {
      results.push({
        factor: 'cryptomining_indicator',
        severity: 'CRITICAL',
        score: 95,
        evidence: `The ${phase} script references known cryptomining tooling: \`${command}\``,
        recommendation: `Do not install this package -- its install script references cryptomining software`,
      });
    }
  }

  return results;
};
