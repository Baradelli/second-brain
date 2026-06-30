import { beforeEach, describe, expect, it } from 'vitest';

import { LabelNotFoundError } from '../../domain/errors.js';
import type { Label } from '../../domain/label.js';
import { LabelRepositoryFake } from '../_fakes/label-repository-fake.js';
import { UnarchiveLabel } from '../unarchive-label.js';

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

describe('UnarchiveLabel', () => {
  let repo: LabelRepositoryFake;
  let useCase: UnarchiveLabel;

  beforeEach(() => {
    repo = new LabelRepositoryFake();
    useCase = new UnarchiveLabel(repo);
  });

  it('restaura a label (ACTIVE + archivedAt nulo)', async () => {
    await repo.save(makeLabel());

    const result = await useCase.execute({ id: 'l1', userId: USER });

    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
  });

  it('não restaura label de outro usuário', async () => {
    await repo.save(makeLabel({ userId: 'other' }));

    await expect(useCase.execute({ id: 'l1', userId: USER })).rejects.toThrow(
      LabelNotFoundError,
    );
  });
});
