import semver from 'semver';
import type { DependencyTreeNode, ParsedLockfile, ParsedManifest, ResolvedPackage } from '../../types/dependencyGraph.js';

function buildIndex(lockfile: ParsedLockfile): Map<string, ResolvedPackage[]> {
  const index = new Map<string, ResolvedPackage[]>();
  for (const pkg of lockfile.packages) {
    const existing = index.get(pkg.name);
    if (existing) existing.push(pkg);
    else index.set(pkg.name, [pkg]);
  }
  return index;
}

/**
 * Picks the best-matching resolved version for a (name, range) reference.
 * Lockfiles occasionally carry more than one resolved version per name
 * (legitimate duplicate-version installs); prefer the one satisfying the
 * requested range, falling back to the first entry when the range is
 * unparseable (workspace:, git URLs, npm: aliases, ...) or none match.
 */
function resolveVersion(candidates: ResolvedPackage[], range: string | undefined): ResolvedPackage {
  if (candidates.length === 1 || !range) return candidates[0]!;
  try {
    const match = candidates.find((c) => semver.satisfies(c.version, range));
    return match ?? candidates[0]!;
  } catch {
    return candidates[0]!;
  }
}

function directDependencyNames(manifest: ParsedManifest): Map<string, string> {
  return new Map([
    ...Object.entries(manifest.dependencies),
    ...Object.entries(manifest.devDependencies),
    ...Object.entries(manifest.optionalDependencies),
  ]);
}

export function buildDependencyTree(manifest: ParsedManifest, lockfile: ParsedLockfile): DependencyTreeNode[] {
  const index = buildIndex(lockfile);
  const nodes: DependencyTreeNode[] = [];
  const visited = new Set<string>();

  function walk(name: string, range: string | undefined, path: string[], isDirect: boolean): void {
    const candidates = index.get(name);
    if (!candidates || candidates.length === 0) return; // declared but not present in the lockfile (rare/inconsistent state)

    const resolved = resolveVersion(candidates, range);
    const key = `${name}@${resolved.version}`;
    const nextPath = [...path, name];

    nodes.push({ name, version: resolved.version, isDirect, path });

    if (visited.has(key)) return; // avoid infinite recursion on circular dependency graphs
    visited.add(key);

    for (const [childName, childRange] of Object.entries(resolved.dependencies)) {
      walk(childName, childRange, nextPath, false);
    }
  }

  for (const [name, range] of directDependencyNames(manifest)) {
    walk(name, range, [], true);
  }

  return nodes;
}

/** True if `name` appears anywhere in the manifest's own dependency fields (i.e. is a direct dependency). */
export function isDirectDependency(manifest: ParsedManifest, name: string): boolean {
  return (
    name in manifest.dependencies ||
    name in manifest.devDependencies ||
    name in manifest.optionalDependencies ||
    name in manifest.peerDependencies
  );
}
