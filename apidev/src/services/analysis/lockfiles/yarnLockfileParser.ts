import { parse as parseYarnLock } from '@yarnpkg/lockfile';
import type { ParsedLockfile, ResolvedPackage } from '../../../types/dependencyGraph.js';
import { AppError } from '../../../utils/AppError.js';

function splitNameAndRange(spec: string): [name: string, range: string] {
  const atIndex = spec.startsWith('@') ? spec.indexOf('@', 1) : spec.indexOf('@');
  if (atIndex === -1) return [spec, '*'];
  return [spec.slice(0, atIndex), spec.slice(atIndex + 1)];
}

export function parseYarnLockfile(content: string): ParsedLockfile {
  let result;
  try {
    result = parseYarnLock(content);
  } catch {
    throw AppError.badRequest('Invalid yarn.lock: syntax error');
  }
  if (result.type !== 'success') {
    throw AppError.badRequest('Invalid yarn.lock: unable to parse (merge conflict markers)');
  }

  const packages: ResolvedPackage[] = [];
  for (const [specGroup, entry] of Object.entries(result.object)) {
    const firstSpec = specGroup.split(',')[0]?.trim() ?? specGroup;
    const [name] = splitNameAndRange(firstSpec);
    packages.push({
      name,
      version: entry.version,
      dependencies: { ...entry.dependencies, ...entry.optionalDependencies },
    });
  }

  return { kind: 'yarn', packages };
}
