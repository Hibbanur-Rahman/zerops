import type { Octokit } from 'octokit';
import { isDependencyFilePath, isManifestPath, manifestDirectory } from '../analysis/dependencyFiles.js';

export interface RepoRef {
  owner: string;
  repo: string;
  ref: string;
}

/** Fetches a single file's text content at a given ref, or null if it doesn't exist. */
export async function getFileContent(octokit: Octokit, { owner, repo, ref }: RepoRef, path: string): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref });
    if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) return null;
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

/**
 * Lists every dependency-relevant file path in the repo at `ref` via the Git
 * Trees API (one call, recursive) rather than walking directories one at a
 * time -- the efficient approach for large/monorepo trees (spec section 38).
 */
export async function listDependencyFilePaths(octokit: Octokit, { owner, repo, ref }: RepoRef): Promise<string[]> {
  const { data } = await octokit.rest.git.getTree({ owner, repo, tree_sha: ref, recursive: 'true' });
  if (data.truncated) {
    // Extremely large tree -- degrade rather than fail; a repo this big is
    // a known limitation documented in the README.
  }

  return (data.tree ?? [])
    .filter((entry) => entry.type === 'blob' && entry.path && !entry.path.includes('node_modules/'))
    .map((entry) => entry.path!)
    .filter(isDependencyFilePath);
}

export async function getLatestCommitSha(octokit: Octokit, owner: string, repo: string, branch: string): Promise<string> {
  const { data } = await octokit.rest.repos.getBranch({ owner, repo, branch });
  return data.commit.sha;
}

export interface ManifestGroup {
  manifestPath: string;
  lockfilePath: string | null;
}

/** Groups each package.json with the nearest lockfile at or above its directory (supports monorepos). */
export function groupManifestsWithLockfiles(paths: string[]): ManifestGroup[] {
  const manifestPaths = paths.filter(isManifestPath);
  const lockfilePaths = paths.filter((p) => !isManifestPath(p));

  return manifestPaths.map((manifestPath) => {
    const manifestDir = manifestDirectory(manifestPath);
    const candidates = lockfilePaths
      .filter((lockPath) => {
        const lockDir = manifestDirectory(lockPath);
        return manifestDir === lockDir || manifestDir === '.' || lockDir === '.';
      })
      .sort((a, b) => manifestDirectory(b).length - manifestDirectory(a).length);

    // Prefer a lockfile in the exact same directory as the manifest; fall back to the repo root.
    const sameDir = candidates.find((p) => manifestDirectory(p) === manifestDir);
    return { manifestPath, lockfilePath: sameDir ?? candidates[candidates.length - 1] ?? null };
  });
}
