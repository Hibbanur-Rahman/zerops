import { describe, expect, it } from 'vitest';
import { parseNpmLockfile } from '../../src/services/analysis/lockfiles/npmLockfileParser.js';

describe('parseNpmLockfile', () => {
  it('parses a v3 lockfile, skipping the project root entry', () => {
    const lockfile = parseNpmLockfile(
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'example', dependencies: { lodash: '^4.17.21' } },
          'node_modules/lodash': { version: '4.17.21' },
          'node_modules/@babel/core': { version: '7.20.0', dependencies: { lodash: '^4.17.19' } },
        },
      }),
    );

    expect(lockfile.kind).toBe('npm');
    expect(lockfile.packages).toEqual(
      expect.arrayContaining([
        { name: 'lodash', version: '4.17.21', dependencies: {}, isDev: undefined, isOptional: undefined },
        { name: '@babel/core', version: '7.20.0', dependencies: { lodash: '^4.17.19' }, isDev: undefined, isOptional: undefined },
      ]),
    );
    expect(lockfile.packages).toHaveLength(2);
  });

  it('resolves nested (non-hoisted) package names correctly', () => {
    const lockfile = parseNpmLockfile(
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': {},
          'node_modules/foo': { version: '1.0.0' },
          'node_modules/foo/node_modules/lodash': { version: '3.10.1' },
        },
      }),
    );

    const nested = lockfile.packages.find((p) => p.version === '3.10.1');
    expect(nested?.name).toBe('lodash');
  });

  it('flattens a v1 lockfile', () => {
    const lockfile = parseNpmLockfile(
      JSON.stringify({
        dependencies: {
          lodash: {
            version: '4.17.21',
            requires: { 'ms': '^2.1.0' },
            dependencies: {
              ms: { version: '2.1.3' },
            },
          },
        },
      }),
    );

    expect(lockfile.packages).toEqual(
      expect.arrayContaining([
        { name: 'lodash', version: '4.17.21', dependencies: { ms: '^2.1.0' }, isDev: undefined, isOptional: undefined },
        { name: 'ms', version: '2.1.3', dependencies: {}, isDev: undefined, isOptional: undefined },
      ]),
    );
  });

  it('throws on invalid JSON', () => {
    expect(() => parseNpmLockfile('{bad')).toThrow(/Invalid package-lock\.json/);
  });
});
