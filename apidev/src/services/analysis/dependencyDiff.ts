import type { DependencyChangeType } from '../../constants/enums.js';
import type { DependencyTreeNode } from '../../types/dependencyGraph.js';
import { compareVersions } from './versionCompare.js';

export interface DependencyChange {
  name: string;
  changeType: DependencyChangeType;
  previousVersion?: string;
  version?: string;
  isDirect: boolean;
  path: string[];
}

/**
 * Diffs two resolved dependency trees by package name. When a name has
 * multiple resolved versions in a tree (duplicate-version installs), the
 * first occurrence wins -- consistent with how the tree walk records nodes.
 */
export function diffDependencyTrees(base: DependencyTreeNode[], head: DependencyTreeNode[]): DependencyChange[] {
  const baseByName = new Map<string, DependencyTreeNode>();
  for (const node of base) if (!baseByName.has(node.name)) baseByName.set(node.name, node);

  const headByName = new Map<string, DependencyTreeNode>();
  for (const node of head) if (!headByName.has(node.name)) headByName.set(node.name, node);

  const changes: DependencyChange[] = [];

  for (const [name, headNode] of headByName) {
    const baseNode = baseByName.get(name);
    if (!baseNode) {
      changes.push({ name, changeType: 'added', version: headNode.version, isDirect: headNode.isDirect, path: headNode.path });
      continue;
    }
    if (baseNode.version !== headNode.version) {
      const direction = compareVersions(baseNode.version, headNode.version);
      changes.push({
        name,
        changeType: direction === 'downgrade' ? 'downgraded' : 'updated',
        previousVersion: baseNode.version,
        version: headNode.version,
        isDirect: headNode.isDirect,
        path: headNode.path,
      });
    }
  }

  for (const [name, baseNode] of baseByName) {
    if (!headByName.has(name)) {
      changes.push({ name, changeType: 'removed', previousVersion: baseNode.version, isDirect: baseNode.isDirect, path: baseNode.path });
    }
  }

  return changes;
}
