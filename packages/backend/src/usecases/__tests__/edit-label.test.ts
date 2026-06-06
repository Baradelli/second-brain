import { beforeEach, describe, expect, it } from 'vitest';

import {
  LabelCycleError,
  LabelNotFoundError,
  LabelParentInvalidError,
} from '../../domain/errors.js';
import type { Label } from '../../domain/label.js';
import { EditLabel } from '../edit-label.js';
import { LabelRepositoryFake } from '../_fakes/label-repository-fake.js';

const USER = 'user-1';

function makeLabel(overrides: Partial<Label> & { id: string }): Label {
  return {
    userId: USER,
    name: 'Label',
    parentId: null,
    color: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('EditLabel', () => {
  let repo: LabelRepositoryFake;
  let useCase: EditLabel;

  beforeEach(() => {
    repo = new LabelRepositoryFake();
    useCase = new EditLabel(repo);
  });

  it('renomeia e troca cor (patch parcial não mexe no resto)', async () => {
    await repo.save(makeLabel({ id: 'l1', name: 'Antigo', color: null, parentId: null }));

    const result = await useCase.execute({
      id: 'l1',
      userId: USER,
      name: '  Tech  ',
      color: '#6D5DFC',
    });

    expect(result.name).toBe('Tech'); // trim
    expect(result.color).toBe('#6D5DFC');
    expect(result.parentId).toBeNull();
    expect(result.status).toBe('ACTIVE');
  });

  it('cor: null limpa a cor', async () => {
    await repo.save(makeLabel({ id: 'l1', color: '#fff' }));
    const result = await useCase.execute({ id: 'l1', userId: USER, color: null });
    expect(result.color).toBeNull();
  });

  it('reparent válido (pai do mesmo user)', async () => {
    await repo.save(makeLabel({ id: 'parent' }));
    await repo.save(makeLabel({ id: 'l1', parentId: null }));

    const result = await useCase.execute({
      id: 'l1',
      userId: USER,
      parentId: 'parent',
    });
    expect(result.parentId).toBe('parent');
  });

  it('parentId: null vira raiz', async () => {
    await repo.save(makeLabel({ id: 'parent' }));
    await repo.save(makeLabel({ id: 'l1', parentId: 'parent' }));

    const result = await useCase.execute({ id: 'l1', userId: USER, parentId: null });
    expect(result.parentId).toBeNull();
  });

  it('reparent para si mesmo → ciclo', async () => {
    await repo.save(makeLabel({ id: 'l1' }));
    await expect(
      useCase.execute({ id: 'l1', userId: USER, parentId: 'l1' }),
    ).rejects.toThrow(LabelCycleError);
  });

  it('reparent para um descendente → ciclo', async () => {
    // l1 → child → grandchild ; mover l1 para baixo de grandchild = ciclo
    await repo.save(makeLabel({ id: 'l1', parentId: null }));
    await repo.save(makeLabel({ id: 'child', parentId: 'l1' }));
    await repo.save(makeLabel({ id: 'grandchild', parentId: 'child' }));

    await expect(
      useCase.execute({ id: 'l1', userId: USER, parentId: 'grandchild' }),
    ).rejects.toThrow(LabelCycleError);
  });

  it('pai de outro user → inválido', async () => {
    await repo.save(makeLabel({ id: 'other', userId: 'someone-else' }));
    await repo.save(makeLabel({ id: 'l1' }));

    await expect(
      useCase.execute({ id: 'l1', userId: USER, parentId: 'other' }),
    ).rejects.toThrow(LabelParentInvalidError);
  });

  it('id inexistente ou dono errado → not found', async () => {
    await repo.save(makeLabel({ id: 'l1', userId: 'owner' }));
    await expect(
      useCase.execute({ id: 'l1', userId: 'intruder', name: 'x' }),
    ).rejects.toThrow(LabelNotFoundError);
    await expect(
      useCase.execute({ id: 'ghost', userId: USER, name: 'x' }),
    ).rejects.toThrow(LabelNotFoundError);
  });

  it('não altera status/archivedAt', async () => {
    await repo.save(makeLabel({ id: 'l1', status: 'ACTIVE', archivedAt: null }));
    const result = await useCase.execute({ id: 'l1', userId: USER, name: 'x' });
    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
  });
});
