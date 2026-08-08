import { parse as parseYaml } from 'yaml';
import type { ParsedLockfile, ResolvedPackage } from '../../../types/dependencyGraph.js';
import { AppError } from '../../../utils/AppError.js';

interface PnpmPackageEntry {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface PnpmLockfileRaw {
  lockfileVersion?: string | number;
  packages?: Record<string, PnpmPackageEntry>;
  snapshots?: Record<string, PnpmPackageEntry>;
}

/**
 * pnpm lockfile keys look like `name@version` or, for peer-qualified
 * snapshots (lockfileVersion 9+), `name@version(peer@1.0.0)`. Strips the
 * parenthetical peer suffix and splits on the last "@" not part of a scope.
 */
function parsePnpmKey(key: string): { name: string; version: string } | null {
  const withoutPeerSuffix = key.replace(/\(.*\)$/, '');
  const atIndex = withoutPeerSuffix.startsWith('@') ? withoutPeerSuffix.indexOf('@', 1) : withoutPeerSuffix.indexOf('@');
  if (atIndex === -1) return null;
  return { name: withoutPeerSuffix.slice(0, atIndex), version: withoutPeerSuffix.slice(atIndex + 1) };
}

function extractPackages(section: Record<string, PnpmPackageEntry> | undefined): ResolvedPackage[] {
  const packages: ResolvedPackage[] = [];
  for (const [key, entry] of Object.entries(section ?? {})) {
    const parsed = parsePnpmKey(key);
    if (!parsed) continue;
    packages.push({
      name: parsed.name,
      version: parsed.version,
      dependencies: { ...entry.dependencies, ...entry.optionalDependencies },
    });
  }
  return packages;
}

export function parsePnpmLockfile(content: string): ParsedLockfile {
  let raw: PnpmLockfileRaw;
  try {
    raw = parseYaml(content) as PnpmLockfileRaw;
  } catch {
    throw AppError.badRequest('Invalid pnpm-lock.yaml: not valid YAML');
  }

  // Prefer "snapshots" (lockfileVersion 9+, has fully-resolved dependency
  // versions per exact package instance); fall back to "packages" for
  // older lockfile versions where it carries the dependency graph directly.
  const packages = raw.snapshots ? extractPackages(raw.snapshots) : extractPackages(raw.packages);
  return { kind: 'pnpm', packages };
}
