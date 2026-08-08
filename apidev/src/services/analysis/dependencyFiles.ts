const DEPENDENCY_FILENAMES = new Set([
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
]);

export function isDependencyFilePath(path: string): boolean {
  const basename = path.split('/').pop() ?? path;
  return DEPENDENCY_FILENAMES.has(basename);
}

export function isManifestPath(path: string): boolean {
  return path.split('/').pop() === 'package.json';
}

export function anyDependencyFileChanged(paths: string[]): boolean {
  return paths.some(isDependencyFilePath);
}

/** Directory containing a package.json, used as the manifest's identity in monorepos ("." for the root). */
export function manifestDirectory(manifestPath: string): string {
  const idx = manifestPath.lastIndexOf('/');
  return idx === -1 ? '.' : manifestPath.slice(0, idx);
}
