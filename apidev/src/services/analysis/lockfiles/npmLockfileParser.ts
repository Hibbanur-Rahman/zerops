import type { ParsedLockfile, ResolvedPackage } from '../../../types/dependencyGraph.js';
import { AppError } from '../../../utils/AppError.js';

interface NpmLockfileV2Package {
  version?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  dev?: boolean;
  optional?: boolean;
  link?: boolean;
}

interface NpmLockfileV1Dependency {
  version: string;
  requires?: Record<string, string>;
  dependencies?: Record<string, NpmLockfileV1Dependency>;
  dev?: boolean;
  optional?: boolean;
}

interface NpmLockfileRaw {
  lockfileVersion?: number;
  packages?: Record<string, NpmLockfileV2Package>;
  dependencies?: Record<string, NpmLockfileV1Dependency>;
}

function packageNameFromPath(path: string): string {
  const segments = path.split('node_modules/').filter(Boolean);
  return (segments[segments.length - 1] ?? '').replace(/\/$/, '');
}

function parseV2OrV3(raw: NpmLockfileRaw): ResolvedPackage[] {
  const packages: ResolvedPackage[] = [];
  for (const [path, pkg] of Object.entries(raw.packages ?? {})) {
    if (path === '' || pkg.link || !pkg.version) continue; // "" is the project root itself, not a dependency
    packages.push({
      name: packageNameFromPath(path),
      version: pkg.version,
      dependencies: { ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies },
      isDev: pkg.dev,
      isOptional: pkg.optional,
    });
  }
  return packages;
}

function flattenV1(
  deps: Record<string, NpmLockfileV1Dependency> | undefined,
  out: ResolvedPackage[] = [],
): ResolvedPackage[] {
  for (const [name, dep] of Object.entries(deps ?? {})) {
    out.push({
      name,
      version: dep.version,
      dependencies: dep.requires ?? {},
      isDev: dep.dev,
      isOptional: dep.optional,
    });
    if (dep.dependencies) flattenV1(dep.dependencies, out);
  }
  return out;
}

export function parseNpmLockfile(content: string): ParsedLockfile {
  let raw: NpmLockfileRaw;
  try {
    raw = JSON.parse(content);
  } catch {
    throw AppError.badRequest('Invalid package-lock.json: not valid JSON');
  }

  const packages = raw.packages ? parseV2OrV3(raw) : flattenV1(raw.dependencies);
  return { kind: 'npm', packages };
}
