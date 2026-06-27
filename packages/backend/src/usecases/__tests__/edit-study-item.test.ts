import { beforeEach, describe, expect, it } from 'vitest';

import { StudyItemNotFoundError } from '../../domain/errors.js';
import type { StudyItem } from '../../domain/study-item.js';
import { StudyItemRepositoryFake } from '../_fakes/study-item-repository-fake.js';
import { EditStudyItem } from '../edit-study-item.js';

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

describe('EditStudyItem', () => {
  let repo: StudyItemRepositoryFake;
  let useCase: EditStudyItem;

  beforeEach(() => {
    repo = new StudyItemRepositoryFake();
    useCase = new EditStudyItem(repo);
  });

  it('applies only present fields (partial patch); absent stay unchanged', async () => {
    await repo.save(makeStudyItem());

    const result = await useCase.execute({
      id: 'si-1',
      userId: 'user-1',
      title: 'Novo título',
    });

    expect(result.title).toBe('Novo título');
    expect(result.reference).toBeNull();
    expect(result.labelIds).toEqual(['l1']);
  });

  it('rejects empty / whitespace-only title when present', async () => {
    await repo.save(makeStudyItem());
    await expect(
      useCase.execute({ id: 'si-1', userId: 'user-1', title: '   ' }),
    ).rejects.toThrow();
  });

  it('throws StudyItemNotFoundError for unknown id', async () => {
    await expect(
      useCase.execute({ id: 'ghost', userId: 'user-1', title: 'x' }),
    ).rejects.toThrow(StudyItemNotFoundError);
  });

  it('throws StudyItemNotFoundError when userId is not the owner (no leak)', async () => {
    await repo.save(makeStudyItem({ userId: 'owner' }));

    await expect(
      useCase.execute({ id: 'si-1', userId: 'intruder', title: 'x' }),
    ).rejects.toThrow(StudyItemNotFoundError);

    const persisted = await repo.byId('si-1');
    expect(persisted?.title).toBe('Original');
  });

  it('labelIds present replaces the set; absent keeps current', async () => {
    await repo.save(makeStudyItem({ labelIds: ['l1', 'l2'] }));

    const replaced = await useCase.execute({
      id: 'si-1',
      userId: 'user-1',
      labelIds: ['l3'],
    });
    expect(replaced.labelIds).toEqual(['l3']);

    const kept = await useCase.execute({
      id: 'si-1',
      userId: 'user-1',
      title: 'y',
    });
    expect(kept.labelIds).toEqual(['l3']);
  });

  it('can set resourceId/fichamentoNoteId to null explicitly', async () => {
    await repo.save(
      makeStudyItem({ resourceId: 'res-1', fichamentoNoteId: 'note-1' }),
    );

    const result = await useCase.execute({
      id: 'si-1',
      userId: 'user-1',
      resourceId: null,
      fichamentoNoteId: null,
    });

    expect(result.resourceId).toBeNull();
    expect(result.fichamentoNoteId).toBeNull();
  });

  it('normalizes questions on edit', async () => {
    await repo.save(makeStudyItem());

    const result = await useCase.execute({
      id: 'si-1',
      userId: 'user-1',
      questions: { after: ['O que me surpreendeu?'] },
    });

    expect(result.questions).toEqual({
      before: [],
      during: [],
      after: ['O que me surpreendeu?'],
    });
  });

  it('never changes status/archivedAt/createdAt via edit', async () => {
    const createdAt = new Date('2026-06-27T10:00:00.000Z');
    await repo.save(
      makeStudyItem({ status: 'ACTIVE', archivedAt: null, createdAt }),
    );

    const result = await useCase.execute({
      id: 'si-1',
      userId: 'user-1',
      // @ts-expect-error status is not an editable field
      status: 'ARCHIVED',
      // @ts-expect-error archivedAt is not an editable field
      archivedAt: new Date(),
    });

    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
    expect(result.createdAt).toEqual(createdAt);
  });
});
