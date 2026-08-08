import { AppError } from '../../utils/AppError.js';
import type { ParsedManifest } from '../../types/dependencyGraph.js';

interface RawManifest {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export function parsePackageJson(content: string): ParsedManifest {
  let raw: RawManifest;
  try {
    raw = JSON.parse(content);
  } catch {
    throw AppError.badRequest('Invalid package.json: not valid JSON');
  }

  return {
    name: raw.name,
    dependencies: raw.dependencies ?? {},
    devDependencies: raw.devDependencies ?? {},
    peerDependencies: raw.peerDependencies ?? {},
    optionalDependencies: raw.optionalDependencies ?? {},
    scripts: {
      preinstall: raw.scripts?.preinstall,
      install: raw.scripts?.install,
      postinstall: raw.scripts?.postinstall,
    },
  };
}
