import { createRequire } from 'node:module';
import type { ParsedLockfile, ResolvedPackage } from '../../../types/dependencyGraph.js';
import type { YarnLockParseResult } from '../../../types/yarnpkg-lockfile.js';
import { AppError } from '../../../utils/AppError.js';

// @yarnpkg/lockfile's CJS bundle confuses ESM named/default-import interop
// differently across runtimes (Node's native loader vs. Vite/Vitest's
// transform both guess wrong, in opposite ways). Using real `require()`
// via createRequire sidesteps the ambiguity entirely -- it's the one
// access pattern verified to work the same everywhere.
const require = createRequire(import.meta.url);
const yarnLockfile: { parse(content: string): YarnLockParseResult } = require('@yarnpkg/lockfile');

function splitNameAndRange(spec: string): [name: string, range: string] {
  const atIndex = spec.startsWith('@') ? spec.indexOf('@', 1) : spec.indexOf('@');
  if (atIndex === -1) return [spec, '*'];
  return [spec.slice(0, atIndex), spec.slice(atIndex + 1)];
}

export function parseYarnLockfile(content: string): ParsedLockfile {
  let result;
  try {
    result = yarnLockfile.parse(content);
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
