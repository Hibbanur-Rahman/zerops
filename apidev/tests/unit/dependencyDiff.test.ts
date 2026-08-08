import { describe, expect, it } from 'vitest';
import { diffDependencyTrees } from '../../src/services/analysis/dependencyDiff.js';
import type { DependencyTreeNode } from '../../src/types/dependencyGraph.js';

function node(name: string, version: string, isDirect = true): DependencyTreeNode {
  return { name, version, isDirect, path: isDirect ? [] : ['parent'] };
}

describe('diffDependencyTrees', () => {
  it('detects added and removed packages', () => {
    const base = [node('express', '4.18.2')];
    const head = [node('express', '4.18.2'), node('zod', '3.24.1')];

    const changes = diffDependencyTrees(base, head);
    expect(changes).toEqual([{ name: 'zod', changeType: 'added', version: '3.24.1', isDirect: true, path: [] }]);
  });

  it('detects an upgrade', () => {
    const base = [node('express', '4.18.2')];
    const head = [node('express', '4.21.2')];

    const changes = diffDependencyTrees(base, head);
    expect(changes).toEqual([
      { name: 'express', changeType: 'updated', previousVersion: '4.18.2', version: '4.21.2', isDirect: true, path: [] },
    ]);
  });

  it('detects a downgrade', () => {
    const base = [node('express', '4.21.2')];
    const head = [node('express', '4.18.2')];

    const changes = diffDependencyTrees(base, head);
    expect(changes).toEqual([
      { name: 'express', changeType: 'downgraded', previousVersion: '4.21.2', version: '4.18.2', isDirect: true, path: [] },
    ]);
  });

  it('detects removal', () => {
    const base = [node('left-pad', '1.3.0')];
    const head: DependencyTreeNode[] = [];

    const changes = diffDependencyTrees(base, head);
    expect(changes).toEqual([{ name: 'left-pad', changeType: 'removed', previousVersion: '1.3.0', isDirect: true, path: [] }]);
  });

  it('reports no changes for identical trees', () => {
    const tree = [node('express', '4.18.2')];
    expect(diffDependencyTrees(tree, tree)).toEqual([]);
  });
});
