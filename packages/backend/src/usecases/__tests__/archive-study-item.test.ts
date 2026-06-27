import { beforeEach, describe, expect, it } from 'vitest';

import { StudyItemNotFoundError } from '../../domain/errors.js';
import type { StudyItem } from '../../domain/study-item.js';
import { StudyItemRepositoryFake } from '../_fakes/study-item-repository-fake.js';
import { ArchiveStudyItem } from '../archive-study-item.js';

function makeStudyItem(overrides?: Partial<StudyItem>): StudyItem {
  return {
    id: 'si-1',
    userId: 'user-1',
    resourceId: null,
    title: 'Original',
    reference: null,
    questions: null,
    fichamentoNoteId: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-27T10:00:00.000Z'),
    labelIds: ['l1'],
    ...overrides,
  };
}

describe('ArchiveStudyItem', () => {
  let repo: StudyItemRepositoryFake;
  let useCase: ArchiveStudyItem;

  beforeEach(() => {
    repo = new StudyItemRepositoryFake();
    useCase = new ArchiveStudyItem(repo);
  });

  it('sets status=ARCHIVED and archivedAt; leaves other fields intact', async () => {
    await repo.save(makeStudyItem());
    const archivedAt = new Date('2026-06-28T12:00:00.000Z');

    const result = await useCase.execute({
      id: 'si-1',
      userId: 'user-1',
      archivedAt,
    });

    expect(result.status).toBe('ARCHIVED');
    expect(result.archivedAt).toEqual(archivedAt);
    expect(result.title).toBe('Original');
    expect(result.labelIds).toEqual(['l1']);
  });

  it('is idempotent: re-archiving keeps the original archivedAt', async () => {
    const first = new Date('2026-06-28T12:00:00.000Z');
    await repo.save(makeStudyItem({ status: 'ARCHIVED', archivedAt: first }));

    const result = await useCase.execute({
      id: 'si-1',
      userId: 'user-1',
      archivedAt: new Date('2026-07-01T00:00:00.000Z'),
    });

    expect(result.status).toBe('ARCHIVED');
    expect(result.archivedAt).toEqual(first);
  });

  it('throws StudyItemNotFoundError for unknown id or wrong owner', async () => {
    await repo.save(makeStudyItem({ userId: 'owner' }));

    await expect(
      useCase.execute({ id: 'ghost', userId: 'owner' }),
    ).rejects.toThrow(StudyItemNotFoundError);

    await expect(
      useCase.execute({ id: 'si-1', userId: 'intruder' }),
    ).rejects.toThrow(StudyItemNotFoundError);
  });
});
