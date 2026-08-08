import { describe, expect, it } from 'vitest';
import { parsePnpmLockfile } from '../../src/services/analysis/lockfiles/pnpmLockfileParser.js';

describe('parsePnpmLockfile', () => {
  it('parses lockfileVersion 9 snapshots, including scoped and peer-suffixed keys', () => {
    const yaml = `
lockfileVersion: '9.0'
packages:
  lodash@4.17.21: {}
  '@babel/core@7.20.5': {}
snapshots:
  lodash@4.17.21: {}
  '@babel/core@7.20.5(supports-color@5.5.0)':
    dependencies:
      lodash: 4.17.19
`;
    const lockfile = parsePnpmLockfile(yaml);

    expect(lockfile.kind).toBe('pnpm');
    expect(lockfile.packages).toEqual(
      expect.arrayContaining([
        { name: 'lodash', version: '4.17.21', dependencies: {} },
        { name: '@babel/core', version: '7.20.5', dependencies: { lodash: '4.17.19' } },
      ]),
    );
  });

  it('falls back to the packages section when there is no snapshots section', () => {
    const yaml = `
lockfileVersion: '6.0'
packages:
  /lodash@4.17.21: {}
`;
    const lockfile = parsePnpmLockfile(yaml);
    expect(lockfile.packages[0]?.name).toBe('lodash');
  });

  it('throws on invalid YAML', () => {
    expect(() => parsePnpmLockfile('key: [unterminated')).toThrow(/Invalid pnpm-lock\.yaml/);
  });
});
