import { beforeEach, describe, expect, it } from 'vitest';

import type { Recall } from '../../domain/recall.js';
import type { StudyItem } from '../../domain/study-item.js';
import { RecallRepositoryFake } from '../_fakes/recall-repository-fake.js';
import { StudyItemRepositoryFake } from '../_fakes/study-item-repository-fake.js';
import { SelectDueRecalls } from '../select-due-recalls.js';

const USER_ID = 'user-1';
const TZ = 'America/Sao_Paulo';

function makeStudyItem(overrides?: Partial<StudyItem>): StudyItem {
  return {
    id: 'si-1',
    userId: USER_ID,
    resourceId: null,
    title: 'Item',
    reference: null,
    questions: null,
    fichamentoNoteId: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

function makeRecall(overrides?: Partial<Recall>): Recall {
  return {
    id: 'r-1',
    userId: USER_ID,
    studyItemId: 'si-1',
    confidence: 'B',
    note: null,
    occurredAt: new Date('2026-06-01T12:00:00.000Z'),
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('SelectDueRecalls', () => {
  let items: StudyItemRepositoryFake;
  let recalls: RecallRepositoryFake;
  let useCase: SelectDueRecalls;

  beforeEach(() => {
    items = new StudyItemRepositoryFake();
    recalls = new RecallRepositoryFake();
    useCase = new SelectDueRecalls(items, recalls);
  });

  it('does not include a freshly created item (next review is 2 days out)', async () => {
    await items.save(
      makeStudyItem({ createdAt: new Date('2026-06-10T12:00:00.000Z') }),
    );

    const due = await useCase.execute({
      userId: USER_ID,
      reference: new Date('2026-06-10T15:00:00.000Z'),
      timezone: TZ,
    });

    expect(due).toEqual([]);
  });

  it('includes an item whose 2-day window has arrived', async () => {
    await items.save(
      makeStudyItem({
        id: 'due',
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
      }),
    );

    const due = await useCase.execute({
      userId: USER_ID,
      reference: new Date('2026-06-03T15:00:00.000Z'),
      timezone: TZ,
    });

    expect(due).toHaveLength(1);
    expect(due[0].studyItemId).toBe('due');
    expect(due[0].overdue).toBe(false);
  });

  it('flags overdue items', async () => {
    await items.save(
      makeStudyItem({
        id: 'late',
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
      }),
    );

    const due = await useCase.execute({
      userId: USER_ID,
      reference: new Date('2026-06-20T15:00:00.000Z'),
      timezone: TZ,
    });

    expect(due).toHaveLength(1);
    expect(due[0].overdue).toBe(true);
  });

  it('excludes consolidated items (3 recalls done)', async () => {
    await items.save(makeStudyItem({ id: 'done' }));
    await recalls.save(makeRecall({ id: 'a', studyItemId: 'done' }));
    await recalls.save(makeRecall({ id: 'b', studyItemId: 'done' }));
    await recalls.save(makeRecall({ id: 'c', studyItemId: 'done' }));

    const due = await useCase.execute({
      userId: USER_ID,
      reference: new Date('2026-12-01T15:00:00.000Z'),
      timezone: TZ,
    });

    expect(due).toEqual([]);
  });

  it('only considers ACTIVE items of the user', async () => {
    await items.save(makeStudyItem({ id: 'archived', status: 'ARCHIVED' }));
    await items.save(makeStudyItem({ id: 'other', userId: 'other' }));

    const due = await useCase.execute({
      userId: USER_ID,
      reference: new Date('2026-06-20T15:00:00.000Z'),
      timezone: TZ,
    });

    expect(due).toEqual([]);
  });
});
