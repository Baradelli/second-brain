import { beforeEach, describe, expect, it } from 'vitest';

import {
  LabelInUseError,
  LabelNotArchivedError,
  LabelNotFoundError,
} from '../../domain/errors.js';
import type { Label } from '../../domain/label.js';
import { LabelRepositoryFake } from '../_fakes/label-repository-fake.js';
import { DeleteLabel } from '../delete-label.js';

const USER = 'user-1';

function makeLabel(overrides?: Partial<Label>): Label {
  return {
    id: 'l1',
    userId: USER,
    name: 'Estudo',
    parentId: null,
    color: null,
    status: 'ARCHIVED',
    archivedAt: new Date('2026-06-03T00:00:00.000Z'),
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

describe('DeleteLabel', () => {
  let repo: LabelRepositoryFake;
  let useCase: DeleteLabel;

  beforeEach(() => {
    repo = new LabelRepositoryFake();
    useCase = new DeleteLabel(repo);
  });

  it('apaga uma label arquivada sem uso nem filhas', async () => {
    await repo.save(makeLabel());

    const result = await useCase.execute({ id: 'l1', userId: USER });

    expect(result.id).toBe('l1');
    expect(await repo.byId('l1')).toBeNull();
  });

  it('recusa se a label não está arquivada', async () => {
    await repo.save(makeLabel({ status: 'ACTIVE', archivedAt: null }));

    await expect(useCase.execute({ id: 'l1', userId: USER })).rejects.toThrow(
      LabelNotArchivedError,
    );
  });

  it('recusa se a label está em uso por itens', async () => {
    await repo.save(makeLabel());
    repo.setItemUsage('l1', 2);

    await expect(useCase.execute({ id: 'l1', userId: USER })).rejects.toThrow(
      LabelInUseError,
    );
    expect(await repo.byId('l1')).not.toBeNull();
  });

  it('recusa se a label tem filhas ativas', async () => {
    await repo.save(makeLabel());
    await repo.save(
      makeLabel({ id: 'child', parentId: 'l1', status: 'ACTIVE' }),
    );

    await expect(useCase.execute({ id: 'l1', userId: USER })).rejects.toThrow(
      LabelInUseError,
    );
  });

  it('não apaga label de outro usuário', async () => {
    await repo.save(makeLabel({ userId: 'other' }));

    await expect(useCase.execute({ id: 'l1', userId: USER })).rejects.toThrow(
      LabelNotFoundError,
    );
  });
});
