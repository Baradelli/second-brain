import { beforeEach, describe, expect, it } from 'vitest';

import { StudyItemNotFoundError } from '../../domain/errors.js';
import type { StudyItem } from '../../domain/study-item.js';
import { StudyItemRepositoryFake } from '../_fakes/study-item-repository-fake.js';
import { UnarchiveStudyItem } from '../unarchive-study-item.js';

const USER = 'user-1';

function makeItem(overrides?: Partial<StudyItem>): StudyItem {
  return {
    id: 's1',
    userId: USER,
    resourceId: null,
    title: 'Item',
    reference: null,
    questions: null,
    fichamentoNoteId: null,
    status: 'ARCHIVED',
    archivedAt: new Date('2026-06-03T00:00:00.000Z'),
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

describe('UnarchiveStudyItem', () => {
  let repo: StudyItemRepositoryFake;
  let useCase: UnarchiveStudyItem;

  beforeEach(() => {
    repo = new StudyItemRepositoryFake();
    useCase = new UnarchiveStudyItem(repo);
  });

  it('restaura o item (ACTIVE + archivedAt nulo)', async () => {
    await repo.save(makeItem());

    const result = await useCase.execute({ id: 's1', userId: USER });

    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
  });

  it('não restaura item de outro usuário', async () => {
    await repo.save(makeItem({ userId: 'other' }));

    await expect(useCase.execute({ id: 's1', userId: USER })).rejects.toThrow(
      StudyItemNotFoundError,
    );
  });
});
