import type { Label, LabelNode } from './label.js';

export function buildLabelTree(labels: Label[]): LabelNode[] {
  const nodes = new Map<string, LabelNode>();

  for (const label of labels) {
    nodes.set(label.id, { ...label, children: [] });
  }

  const roots: LabelNode[] = [];

  for (const label of labels) {
    const node = nodes.get(label.id);
    if (!node) continue;

    if (label.parentId === null) {
      roots.push(node);
      continue;
    }

    const parent = nodes.get(label.parentId);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
