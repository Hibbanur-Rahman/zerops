import { describe, expect, it } from 'vitest';
import { buildDependencyTree, isDirectDependency } from '../../src/services/analysis/dependencyTree.js';
import type { ParsedLockfile, ParsedManifest } from '../../src/types/dependencyGraph.js';

function manifest(overrides: Partial<ParsedManifest> = {}): ParsedManifest {
  return {
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    optionalDependencies: {},
    scripts: {},
    ...overrides,
  };
}

describe('buildDependencyTree', () => {
  it('marks direct dependencies and walks transitive ones with a path', () => {
    const m = manifest({ dependencies: { 'package-a': '^1.0.0' } });
    const lockfile: ParsedLockfile = {
      kind: 'npm',
      packages: [
        { name: 'package-a', version: '1.0.0', dependencies: { 'package-b': '^2.0.0' } },
        { name: 'package-b', version: '2.0.0', dependencies: { 'package-c': '^3.0.0' } },
        { name: 'package-c', version: '3.0.0', dependencies: {} },
      ],
    };

    const nodes = buildDependencyTree(m, lockfile);

    const a = nodes.find((n) => n.name === 'package-a');
    const b = nodes.find((n) => n.name === 'package-b');
    const c = nodes.find((n) => n.name === 'package-c');

    expect(a).toMatchObject({ isDirect: true, path: [] });
    expect(b).toMatchObject({ isDirect: false, path: ['package-a'] });
    expect(c).toMatchObject({ isDirect: false, path: ['package-a', 'package-b'] });
  });

  it('does not infinite-loop on circular dependencies', () => {
    const m = manifest({ dependencies: { 'package-a': '^1.0.0' } });
    const lockfile: ParsedLockfile = {
      kind: 'npm',
      packages: [
        { name: 'package-a', version: '1.0.0', dependencies: { 'package-b': '^1.0.0' } },
        { name: 'package-b', version: '1.0.0', dependencies: { 'package-a': '^1.0.0' } },
      ],
    };

    const nodes = buildDependencyTree(m, lockfile);
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.length).toBeLessThan(10); // would be unbounded if the cycle guard failed
  });

  it('prefers the resolved version satisfying the requested range when duplicates exist', () => {
    const m = manifest({ dependencies: { 'package-a': '^1.0.0' } });
    const lockfile: ParsedLockfile = {
      kind: 'npm',
      packages: [
        { name: 'package-a', version: '1.0.0', dependencies: { lodash: '^3.0.0' } },
        { name: 'lodash', version: '3.10.1', dependencies: {} },
        { name: 'lodash', version: '4.17.21', dependencies: {} },
      ],
    };

    const nodes = buildDependencyTree(m, lockfile);
    const lodashNode = nodes.find((n) => n.name === 'lodash');
    expect(lodashNode?.version).toBe('3.10.1');
  });

  it('skips dependencies declared in the manifest but absent from the lockfile', () => {
    const m = manifest({ dependencies: { 'missing-package': '^1.0.0' } });
    const lockfile: ParsedLockfile = { kind: 'npm', packages: [] };
    expect(buildDependencyTree(m, lockfile)).toEqual([]);
  });
});

describe('isDirectDependency', () => {
  it('checks all four manifest dependency fields', () => {
    const m = manifest({
      dependencies: { a: '1' },
      devDependencies: { b: '1' },
      peerDependencies: { c: '1' },
      optionalDependencies: { d: '1' },
    });
    expect(isDirectDependency(m, 'a')).toBe(true);
    expect(isDirectDependency(m, 'b')).toBe(true);
    expect(isDirectDependency(m, 'c')).toBe(true);
    expect(isDirectDependency(m, 'd')).toBe(true);
    expect(isDirectDependency(m, 'e')).toBe(false);
  });
});
