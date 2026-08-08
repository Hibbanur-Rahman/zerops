import semver from 'semver';

export type VersionDirection = 'upgrade' | 'downgrade' | 'unknown';

/** Compares two version strings, tolerating non-semver values (git shas, "workspace:*", ...). */
export function compareVersions(previous: string, next: string): VersionDirection {
  if (previous === next) return 'unknown';
  try {
    if (semver.gt(next, previous)) return 'upgrade';
    if (semver.lt(next, previous)) return 'downgrade';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
