import { describe, expect, it } from 'vitest';

import type { Label } from '../../../domain/label.js';
import { LabelRepositoryFake } from '../label-repository-fake.js';

function makeLabel(overrides?: Partial<Label>): Label {
  return {
    id: 'label-1',
    userId: 'user-1',
    name: 'Book',
    parentId: null,
    color: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('LabelRepositoryFake', () => {
  it('save + byId retorna o mesmo label', async () => {
    const repo = new LabelRepositoryFake();
    await repo.save(makeLabel());

    expect(await repo.byId('label-1')).toMatchObject({ name: 'Book' });
  });

  it('listByUser filtra por usuário e status', async () => {
    const repo = new LabelRepositoryFake();
    await repo.save(makeLabel({ id: 'a', userId: 'user-1' }));
    await repo.save(
      makeLabel({ id: 'b', userId: 'user-1', status: 'ARCHIVED' }),
    );
    await repo.save(makeLabel({ id: 'c', userId: 'user-2' }));

    const active = await repo.listByUser('user-1', 'ACTIVE');

    expect(active.map((label) => label.id)).toEqual(['a']);
  });

  it('update aplica patch e persiste', async () => {
    const repo = new LabelRepositoryFake();
    await repo.save(makeLabel());

    const updated = await repo.update('label-1', { name: 'History' });

    expect(updated.name).toBe('History');
    expect((await repo.byId('label-1'))?.name).toBe('History');
  });

  it('usageCount conta itens simulados e filhos ativos', async () => {
    const repo = new LabelRepositoryFake();
    await repo.save(makeLabel({ id: 'parent' }));
    await repo.save(makeLabel({ id: 'child', parentId: 'parent' }));
    await repo.save(
      makeLabel({
        id: 'archived-child',
        parentId: 'parent',
        status: 'ARCHIVED',
      }),
    );
    repo.setItemUsage('parent', 2);

    expect(await repo.usageCount('parent')).toEqual({
      items: 2,
      activeChildren: 1,
    });
  });
});
