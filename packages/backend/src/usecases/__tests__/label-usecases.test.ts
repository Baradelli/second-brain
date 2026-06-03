import { describe, expect, it } from 'vitest';

import {
  LabelCycleError,
  LabelInUseError,
  LabelParentInvalidError,
} from '../../domain/errors.js';
import type { Label } from '../../domain/label.js';
import { LabelRepositoryFake } from '../_fakes/label-repository-fake.js';
import { ArchiveLabel } from '../archive-label.js';
import { CreateLabel } from '../create-label.js';
import { ListLabelTree } from '../list-label-tree.js';

const NOW = new Date('2026-06-01T12:00:00.000Z');

function makeLabel(overrides?: Partial<Label>): Label {
  return {
    id: 'label-1',
    userId: 'user-1',
    name: 'Book',
    parentId: null,
    color: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: NOW,
    ...overrides,
  };
}

describe('CreateLabel', () => {
  it('cria label raiz', async () => {
    const repo = new LabelRepositoryFake();
    const usecase = new CreateLabel(repo);

    const result = await usecase.execute(
      { userId: 'user-1', name: 'Book' },
      NOW,
    );

    expect(result.name).toBe('Book');
    expect(result.parentId).toBeNull();
    expect(result.status).toBe('ACTIVE');
    expect(result.createdAt).toBe(NOW);
  });

  it('cria label com parentId válido do mesmo usuário', async () => {
    const repo = new LabelRepositoryFake();
    await repo.save(makeLabel({ id: 'parent' }));
    const usecase = new CreateLabel(repo);

    const result = await usecase.execute(
      { userId: 'user-1', name: 'History', parentId: 'parent' },
      NOW,
    );

    expect(result.parentId).toBe('parent');
  });

  it('impede ciclo quando o parentId aponta para o próprio id gerado', async () => {
    const repo = new LabelRepositoryFake();
    const usecase = new CreateLabel(repo, () => 'self');

    await expect(
      usecase.execute({ userId: 'user-1', name: 'Loop', parentId: 'self' }),
    ).rejects.toThrow(LabelCycleError);
  });

  it('rejeita parentId inexistente ou de outro usuário', async () => {
    const repo = new LabelRepositoryFake();
    await repo.save(makeLabel({ id: 'other-parent', userId: 'user-2' }));
    const usecase = new CreateLabel(repo);

    await expect(
      usecase.execute({
        userId: 'user-1',
        name: 'History',
        parentId: 'missing',
      }),
    ).rejects.toThrow(LabelParentInvalidError);
    await expect(
      usecase.execute({
        userId: 'user-1',
        name: 'History',
        parentId: 'other-parent',
      }),
    ).rejects.toThrow(LabelParentInvalidError);
  });
});

describe('ListLabelTree', () => {
  it('lista labels ativos como árvore', async () => {
    const repo = new LabelRepositoryFake();
    await repo.save(makeLabel({ id: 'book', name: 'Book' }));
    await repo.save(
      makeLabel({ id: 'history', name: 'History', parentId: 'book' }),
    );
    await repo.save(makeLabel({ id: 'old', name: 'Old', status: 'ARCHIVED' }));

    const result = await new ListLabelTree(repo).execute({
      userId: 'user-1',
      status: 'ACTIVE',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('book');
    expect(result[0]?.children[0]?.id).toBe('history');
  });
});

describe('ArchiveLabel', () => {
  it('faz soft delete quando label não está em uso', async () => {
    const repo = new LabelRepositoryFake();
    await repo.save(makeLabel({ id: 'unused' }));

    const result = await new ArchiveLabel(repo).execute({ id: 'unused' }, NOW);

    expect(result.status).toBe('ARCHIVED');
    expect(result.archivedAt).toBe(NOW);
  });

  it('bloqueia archive quando há vínculo com item', async () => {
    const repo = new LabelRepositoryFake();
    await repo.save(makeLabel({ id: 'used' }));
    repo.setItemUsage('used', 1);

    await expect(
      new ArchiveLabel(repo).execute({ id: 'used' }, NOW),
    ).rejects.toMatchObject({
      name: 'LabelInUseError',
      reason: 'items',
      count: 1,
    });
  });

  it('bloqueia archive quando há sub-label ativo', async () => {
    const repo = new LabelRepositoryFake();
    await repo.save(makeLabel({ id: 'parent' }));
    await repo.save(makeLabel({ id: 'child', parentId: 'parent' }));

    await expect(
      new ArchiveLabel(repo).execute({ id: 'parent' }, NOW),
    ).rejects.toThrow(LabelInUseError);
  });
});
