declare module '@yarnpkg/lockfile' {
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

  interface YarnLockfileModule {
    parse(content: string): YarnLockParseResult;
    stringify(object: Record<string, YarnLockEntry>): string;
  }

  const yarnLockfile: YarnLockfileModule;
  export default yarnLockfile;
}
