import { beforeEach, describe, expect, it } from 'vitest';

import type { StudyItem } from '../../domain/study-item.js';
import { StudyItemRepositoryFake } from '../_fakes/study-item-repository-fake.js';
import { ListStudyItems } from '../list-study-items.js';

function makeStudyItem(overrides?: Partial<StudyItem>): StudyItem {
  return {
    id: 'si-1',
    userId: 'user-1',
    resourceId: null,
    title: 'X',
    reference: null,
    questions: null,
    fichamentoNoteId: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-27T10:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

describe('ListStudyItems', () => {
  let repo: StudyItemRepositoryFake;
  let useCase: ListStudyItems;

  beforeEach(() => {
    repo = new StudyItemRepositoryFake();
    useCase = new ListStudyItems(repo);
  });

  it('lists items of the user filtered by status (default ACTIVE)', async () => {
    await repo.save(makeStudyItem({ id: 'a', status: 'ACTIVE' }));
    await repo.save(makeStudyItem({ id: 'b', status: 'ARCHIVED' }));

    const active = await useCase.execute({
      userId: 'user-1',
      status: 'ACTIVE',
    });
    expect(active.map((i) => i.id)).toEqual(['a']);
  });

  it('filters by resourceId and labelId', async () => {
    await repo.save(makeStudyItem({ id: 'a', resourceId: 'res-1' }));
    await repo.save(
      makeStudyItem({ id: 'b', resourceId: 'res-2', labelIds: ['l1'] }),
    );

    const byResource = await useCase.execute({
      userId: 'user-1',
      resourceId: 'res-1',
    });
    expect(byResource.map((i) => i.id)).toEqual(['a']);

    const byLabel = await useCase.execute({ userId: 'user-1', labelId: 'l1' });
    expect(byLabel.map((i) => i.id)).toEqual(['b']);
  });

  it('does not leak other users items', async () => {
    await repo.save(makeStudyItem({ id: 'mine', userId: 'user-1' }));
    await repo.save(makeStudyItem({ id: 'theirs', userId: 'other' }));

    const result = await useCase.execute({ userId: 'user-1' });
    expect(result.map((i) => i.id)).toEqual(['mine']);
  });
});
