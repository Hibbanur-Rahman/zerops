export interface ManifestScripts {
  preinstall?: string;
  install?: string;
  postinstall?: string;
}

export interface ParsedManifest {
  name?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  scripts: ManifestScripts;
}

/** A single resolved (name, version) node from a lockfile, with its own declared dependency ranges. */
export interface ResolvedPackage {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  isDev?: boolean;
  isOptional?: boolean;
}

export type LockfileKind = 'npm' | 'yarn' | 'pnpm';

export interface ParsedLockfile {
  kind: LockfileKind;
  packages: ResolvedPackage[];
}

/** A package as it appears in the resolved dependency tree for one manifest. */
export interface DependencyTreeNode {
  name: string;
  version: string;
  isDirect: boolean;
  /** Chain of package names from a direct dependency down to this package, e.g. ["a", "b", "c"]. */
  path: string[];
}
