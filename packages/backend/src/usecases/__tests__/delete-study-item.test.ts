import { beforeEach, describe, expect, it } from 'vitest';

import {
  StudyItemHasHistoryError,
  StudyItemNotArchivedError,
  StudyItemNotFoundError,
} from '../../domain/errors.js';
import type { Recall } from '../../domain/recall.js';
import type { StudyItem } from '../../domain/study-item.js';
import { RecallRepositoryFake } from '../_fakes/recall-repository-fake.js';
import { StudyItemRepositoryFake } from '../_fakes/study-item-repository-fake.js';
import { DeleteStudyItem } from '../delete-study-item.js';

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

function makeRecall(studyItemId: string): Recall {
  return {
    id: 'r1',
    userId: USER,
    studyItemId,
    confidence: 'A',
    note: null,
    occurredAt: new Date('2026-06-02T12:00:00.000Z'),
    createdAt: new Date('2026-06-02T12:00:00.000Z'),
  };
}

describe('DeleteStudyItem', () => {
  let items: StudyItemRepositoryFake;
  let recalls: RecallRepositoryFake;
  let useCase: DeleteStudyItem;

  beforeEach(() => {
    items = new StudyItemRepositoryFake();
    recalls = new RecallRepositoryFake();
    useCase = new DeleteStudyItem(items, recalls);
  });

  it('apaga um item arquivado sem histórico de recall', async () => {
    await items.save(makeItem());

    const result = await useCase.execute({ id: 's1', userId: USER });

    expect(result.id).toBe('s1');
    expect(await items.byId('s1')).toBeNull();
  });

  it('recusa se o item não está arquivado', async () => {
    await items.save(makeItem({ status: 'ACTIVE', archivedAt: null }));

    await expect(useCase.execute({ id: 's1', userId: USER })).rejects.toThrow(
      StudyItemNotArchivedError,
    );
  });

  it('recusa se há histórico de recall', async () => {
    await items.save(makeItem());
    await recalls.save(makeRecall('s1'));

    await expect(useCase.execute({ id: 's1', userId: USER })).rejects.toThrow(
      StudyItemHasHistoryError,
    );
    expect(await items.byId('s1')).not.toBeNull();
  });

  it('não apaga item de outro usuário', async () => {
    await items.save(makeItem({ userId: 'other' }));

    await expect(useCase.execute({ id: 's1', userId: USER })).rejects.toThrow(
      StudyItemNotFoundError,
    );
  });
});
