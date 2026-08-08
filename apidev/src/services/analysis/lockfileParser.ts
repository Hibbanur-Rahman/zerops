import type { ParsedLockfile } from '../../types/dependencyGraph.js';
import { parseNpmLockfile } from './lockfiles/npmLockfileParser.js';
import { parseYarnLockfile } from './lockfiles/yarnLockfileParser.js';
import { parsePnpmLockfile } from './lockfiles/pnpmLockfileParser.js';
import { AppError } from '../../utils/AppError.js';

export function parseLockfile(filename: string, content: string): ParsedLockfile {
  const basename = filename.split('/').pop() ?? filename;

  switch (basename) {
    case 'package-lock.json':
    case 'npm-shrinkwrap.json':
      return parseNpmLockfile(content);
    case 'yarn.lock':
      return parseYarnLockfile(content);
    case 'pnpm-lock.yaml':
      return parsePnpmLockfile(content);
    default:
      throw AppError.badRequest(`Unsupported lockfile: ${basename}`);
  }
}
