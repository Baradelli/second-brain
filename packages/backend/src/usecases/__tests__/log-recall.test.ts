import { beforeEach, describe, expect, it } from 'vitest';

import {
  InvalidRecallError,
  StudyItemNotFoundError,
} from '../../domain/errors.js';
import type { StudyItem } from '../../domain/study-item.js';
import { RecallRepositoryFake } from '../_fakes/recall-repository-fake.js';
import { StudyItemRepositoryFake } from '../_fakes/study-item-repository-fake.js';
import { LogRecall } from '../log-recall.js';

function makeStudyItem(overrides?: Partial<StudyItem>): StudyItem {
  return {
    id: 'si-1',
    userId: 'user-1',
    resourceId: null,
    title: 'Cap. 3',
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

describe('LogRecall', () => {
  let items: StudyItemRepositoryFake;
  let recalls: RecallRepositoryFake;
  let useCase: LogRecall;

  beforeEach(() => {
    items = new StudyItemRepositoryFake();
    recalls = new RecallRepositoryFake();
    useCase = new LogRecall(items, recalls);
  });

  it('creates a Recall with default occurredAt=now, note null, and persists', async () => {
    await items.save(makeStudyItem());

    const result = await useCase.execute({
      studyItemId: 'si-1',
      userId: 'user-1',
      confidence: 'B',
    });

    expect(result.id).toBeTruthy();
    expect(result.studyItemId).toBe('si-1');
    expect(result.confidence).toBe('B');
    expect(result.note).toBeNull();
    expect(result.occurredAt).toBeInstanceOf(Date);
    expect(result.createdAt).toBeInstanceOf(Date);

    expect(recalls.saved).toHaveLength(1);
    expect(recalls.saved[0].id).toBe(result.id);
  });

  it('keeps an explicit occurredAt and note', async () => {
    await items.save(makeStudyItem());
    const occurredAt = new Date('2026-06-29T08:00:00.000Z');

    const result = await useCase.execute({
      studyItemId: 'si-1',
      userId: 'user-1',
      confidence: 'A',
      note: 'lembrei a tese central',
      occurredAt,
    });

    expect(result.occurredAt).toEqual(occurredAt);
    expect(result.note).toBe('lembrei a tese central');
  });

  it('accepts A, B and C', async () => {
    await items.save(makeStudyItem());
    for (const confidence of ['A', 'B', 'C'] as const) {
      const r = await useCase.execute({
        studyItemId: 'si-1',
        userId: 'user-1',
        confidence,
      });
      expect(r.confidence).toBe(confidence);
    }
  });

  it('rejects a confidence outside A/B/C (defensive)', async () => {
    await items.save(makeStudyItem());
    await expect(
      useCase.execute({
        studyItemId: 'si-1',
        userId: 'user-1',
        // @ts-expect-error testing defensive validation
        confidence: 'D',
      }),
    ).rejects.toThrow(InvalidRecallError);
  });

  it('rejects recalling an archived study item', async () => {
    await items.save(makeStudyItem({ status: 'ARCHIVED' }));
    await expect(
      useCase.execute({
        studyItemId: 'si-1',
        userId: 'user-1',
        confidence: 'B',
      }),
    ).rejects.toThrow(InvalidRecallError);
  });

  it('throws StudyItemNotFoundError for unknown item or wrong owner (no leak)', async () => {
    await items.save(makeStudyItem({ userId: 'owner' }));

    await expect(
      useCase.execute({
        studyItemId: 'ghost',
        userId: 'owner',
        confidence: 'B',
      }),
    ).rejects.toThrow(StudyItemNotFoundError);

    await expect(
      useCase.execute({
        studyItemId: 'si-1',
        userId: 'intruder',
        confidence: 'B',
      }),
    ).rejects.toThrow(StudyItemNotFoundError);

    expect(recalls.saved).toHaveLength(0);
  });

  it('does not mutate the study item', async () => {
    await items.save(makeStudyItem());
    await useCase.execute({
      studyItemId: 'si-1',
      userId: 'user-1',
      confidence: 'C',
    });

    const item = await items.byId('si-1');
    expect(item?.status).toBe('ACTIVE');
  });
});
