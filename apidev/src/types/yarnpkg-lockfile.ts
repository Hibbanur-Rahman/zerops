export interface YarnLockEntry {
  version: string;
  resolved?: string;
  integrity?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

export interface YarnLockParseResult {
  type: 'success' | 'merge' | 'conflict';
  object: Record<string, YarnLockEntry>;
}
