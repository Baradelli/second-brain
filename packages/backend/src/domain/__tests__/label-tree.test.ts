import { describe, expect, it } from 'vitest';

import type { Label } from '../label.js';
import { buildLabelTree } from '../label-tree.js';

const base = {
  userId: 'user-1',
  color: null,
  status: 'ACTIVE' as const,
  archivedAt: null,
  createdAt: new Date('2026-06-01T00:00:00.000Z'),
};

function label(id: string, name: string, parentId: string | null): Label {
  return { ...base, id, name, parentId };
}

describe('buildLabelTree', () => {
  it('monta raízes e filhos aninhados a partir de lista flat', () => {
    const tree = buildLabelTree([
      label('book', 'Book', null),
      label('history', 'History', 'book'),
      label('brazil', 'Brazil', 'history'),
      label('health', 'Health', null),
    ]);

    expect(tree).toHaveLength(2);
    expect(tree[0]?.id).toBe('book');
    expect(tree[0]?.children[0]?.id).toBe('history');
    expect(tree[0]?.children[0]?.children[0]?.id).toBe('brazil');
    expect(tree[1]?.id).toBe('health');
  });

  it('promove label órfão para raiz para não sumir da UI', () => {
    const tree = buildLabelTree([label('orphan', 'Orphan', 'missing')]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe('orphan');
  });
});
