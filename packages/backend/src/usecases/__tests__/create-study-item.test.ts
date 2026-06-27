import { beforeEach, describe, expect, it } from 'vitest';

import { InvalidStudyItemError } from '../../domain/errors.js';
import { StudyItemRepositoryFake } from '../_fakes/study-item-repository-fake.js';
import { CreateStudyItem } from '../create-study-item.js';

describe('CreateStudyItem', () => {
  let repo: StudyItemRepositoryFake;
  let useCase: CreateStudyItem;

  beforeEach(() => {
    repo = new StudyItemRepositoryFake();
    useCase = new CreateStudyItem(repo);
  });

  it('creates with defaults status=ACTIVE, createdAt set and persists', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      title: 'Cap. 3 — A ressurreição em Paulo',
    });

    expect(result.id).toBeTruthy();
    expect(result.userId).toBe('user-1');
    expect(result.title).toBe('Cap. 3 — A ressurreição em Paulo');
    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
    expect(result.createdAt).toBeInstanceOf(Date);

    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].id).toBe(result.id);
  });

  it('trims title and rejects empty / whitespace-only title', async () => {
    await expect(
      useCase.execute({ userId: 'user-1', title: '   ' }),
    ).rejects.toThrow(InvalidStudyItemError);

    const ok = await useCase.execute({ userId: 'user-1', title: '  Paulo  ' });
    expect(ok.title).toBe('Paulo');
  });

  it('optional fields absent become null; labelIds default []', async () => {
    const result = await useCase.execute({ userId: 'user-1', title: 'X' });

    expect(result.resourceId).toBeNull();
    expect(result.reference).toBeNull();
    expect(result.fichamentoNoteId).toBeNull();
    expect(result.questions).toBeNull();
    expect(result.labelIds).toEqual([]);
  });

  it('normalizes partial questions to the three arrays', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      title: 'X',
      questions: { before: ['Que problema resolve?'] },
    });

    expect(result.questions).toEqual({
      before: ['Que problema resolve?'],
      during: [],
      after: [],
    });
  });

  it('keeps provided optional fields', async () => {
    const result = await useCase.execute({
      userId: 'user-1',
      title: 'X',
      resourceId: 'res-1',
      reference: 'pp. 40–60',
      fichamentoNoteId: 'note-1',
      labelIds: ['l1', 'l2'],
    });

    expect(result.resourceId).toBe('res-1');
    expect(result.reference).toBe('pp. 40–60');
    expect(result.fichamentoNoteId).toBe('note-1');
    expect(result.labelIds).toEqual(['l1', 'l2']);
  });
});
