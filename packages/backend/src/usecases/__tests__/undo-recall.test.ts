import { beforeEach, describe, expect, it } from 'vitest';

import { RecallNotFoundError } from '../../domain/errors.js';
import type { Recall } from '../../domain/recall.js';
import { RecallRepositoryFake } from '../_fakes/recall-repository-fake.js';
import { UndoRecall } from '../undo-recall.js';

function makeRecall(overrides?: Partial<Recall>): Recall {
  return {
    id: 'rec-1',
    userId: 'user-1',
    studyItemId: 'si-1',
    confidence: 'B',
    note: null,
    occurredAt: new Date('2026-06-29T08:00:00.000Z'),
    createdAt: new Date('2026-06-29T08:00:00.000Z'),
    ...overrides,
  };
}

describe('UndoRecall', () => {
  let recalls: RecallRepositoryFake;
  let useCase: UndoRecall;

  beforeEach(() => {
    recalls = new RecallRepositoryFake();
    useCase = new UndoRecall(recalls);
  });

  it('hard-deletes the recall', async () => {
    await recalls.save(makeRecall());

    await useCase.execute({ recallId: 'rec-1', userId: 'user-1' });

    expect(await recalls.byId('rec-1')).toBeNull();
    expect(recalls.saved).toHaveLength(0);
  });

  it('throws RecallNotFoundError for unknown id', async () => {
    await expect(
      useCase.execute({ recallId: 'ghost', userId: 'user-1' }),
    ).rejects.toThrow(RecallNotFoundError);
  });

  it('throws RecallNotFoundError when userId is not the owner (no leak, not deleted)', async () => {
    await recalls.save(makeRecall({ userId: 'owner' }));

    await expect(
      useCase.execute({ recallId: 'rec-1', userId: 'intruder' }),
    ).rejects.toThrow(RecallNotFoundError);

    expect(await recalls.byId('rec-1')).not.toBeNull();
  });
});
