import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Recall } from '../../domain/recall.js';
import type { StudyItem } from '../../domain/study-item.js';
import { PrismaRecallRepository } from '../prisma-recall-repository.js';
import { PrismaStudyItemRepository } from '../prisma-study-item-repository.js';
import { prisma, setupTestUser, TEST_USER_ID } from './_db.js';

const recalls = new PrismaRecallRepository(prisma);
const items = new PrismaStudyItemRepository(prisma);

function makeStudyItem(id: string): StudyItem {
  return {
    id,
    userId: TEST_USER_ID,
    resourceId: null,
    title: 'Item',
    reference: null,
    questions: null,
    fichamentoNoteId: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-27T10:00:00.000Z'),
    labelIds: [],
  };
}

function makeRecall(overrides?: Partial<Recall>): Recall {
  return {
    id: 'rec-1',
    userId: TEST_USER_ID,
    studyItemId: 'si-1',
    confidence: 'B',
    note: null,
    occurredAt: new Date('2026-06-29T08:00:00.000Z'),
    createdAt: new Date('2026-06-29T08:00:00.000Z'),
    ...overrides,
  };
}

async function clearAll() {
  await prisma.recall.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.studyItem.deleteMany({ where: { userId: TEST_USER_ID } });
}

beforeAll(async () => {
  await setupTestUser();
});

beforeEach(async () => {
  await clearAll();
  await items.save(makeStudyItem('si-1'));
  await items.save(makeStudyItem('si-2'));
});

afterAll(async () => {
  await clearAll();
  await prisma.$disconnect();
});

describe('PrismaRecallRepository', () => {
  it('save + byId round-trip', async () => {
    await recalls.save(makeRecall({ note: 'lembrei a tese' }));
    const found = await recalls.byId('rec-1');

    expect(found).not.toBeNull();
    expect(found!.studyItemId).toBe('si-1');
    expect(found!.confidence).toBe('B');
    expect(found!.note).toBe('lembrei a tese');
    expect(found!.occurredAt.toISOString()).toBe('2026-06-29T08:00:00.000Z');
  });

  it('find filters by studyItemId and studyItemIds', async () => {
    await recalls.save(makeRecall({ id: 'r1', studyItemId: 'si-1' }));
    await recalls.save(makeRecall({ id: 'r2', studyItemId: 'si-2' }));

    const forOne = await recalls.find({
      userId: TEST_USER_ID,
      studyItemId: 'si-1',
    });
    expect(forOne.map((r) => r.id)).toEqual(['r1']);

    const forBoth = await recalls.find({
      userId: TEST_USER_ID,
      studyItemIds: ['si-1', 'si-2'],
    });
    expect(forBoth.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
  });

  it('delete removes the recall (hard delete)', async () => {
    await recalls.save(makeRecall({ id: 'r1' }));
    await recalls.delete('r1');
    expect(await recalls.byId('r1')).toBeNull();
  });
});
