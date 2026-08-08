import type { Octokit } from 'octokit';
import { getFileContent, type ManifestGroup, type RepoRef } from '../github/repoContent.service.js';
import { parsePackageJson } from './manifestParser.js';
import { parseLockfile } from './lockfileParser.js';
import { buildDependencyTree } from './dependencyTree.js';
import type { DependencyTreeNode, ParsedLockfile, ParsedManifest } from '../../types/dependencyGraph.js';
import { logger } from '../../config/logger.js';

export interface ManifestSnapshot {
  manifestPath: string;
  manifest: ParsedManifest;
  tree: DependencyTreeNode[];
}

export async function buildManifestSnapshot(
  octokit: Octokit,
  ref: RepoRef,
  group: ManifestGroup,
): Promise<ManifestSnapshot | null> {
  const manifestContent = await getFileContent(octokit, ref, group.manifestPath);
  if (!manifestContent) return null;

  const manifest = parsePackageJson(manifestContent);

  let lockfile: ParsedLockfile = { kind: 'npm', packages: [] };
  if (group.lockfilePath) {
    try {
      const lockContent = await getFileContent(octokit, ref, group.lockfilePath);
      if (lockContent) lockfile = parseLockfile(group.lockfilePath, lockContent);
    } catch (err) {
      logger.warn({ err, path: group.lockfilePath, ref: ref.ref }, 'Failed to parse lockfile -- proceeding with manifest-only tree');
    }
  }

  const tree = buildDependencyTree(manifest, lockfile);
  return { manifestPath: group.manifestPath, manifest, tree };
}
