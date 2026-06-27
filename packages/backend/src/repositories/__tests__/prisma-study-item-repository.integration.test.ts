import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { StudyItem } from '../../domain/study-item.js';
import { PrismaStudyItemRepository } from '../prisma-study-item-repository.js';
import { prisma, setupTestUser, TEST_USER_ID } from './_db.js';

const repo = new PrismaStudyItemRepository(prisma);

function makeStudyItem(overrides?: Partial<StudyItem>): StudyItem {
  return {
    id: 'si-1',
    userId: TEST_USER_ID,
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

async function clearAll() {
  await prisma.recall.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.studyItem.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.resource.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.label.deleteMany({ where: { userId: TEST_USER_ID } });
}

async function makeLabel(id: string, name: string) {
  await prisma.label.create({ data: { id, userId: TEST_USER_ID, name } });
}

async function makeResource(id: string) {
  await prisma.resource.create({
    data: { id, userId: TEST_USER_ID, title: 'R', type: 'book' },
  });
}

beforeAll(async () => {
  await setupTestUser();
});

beforeEach(async () => {
  await clearAll();
});

afterAll(async () => {
  await clearAll();
  await prisma.$disconnect();
});

describe('PrismaStudyItemRepository', () => {
  it('save + byId round-trip preserves fields including questions JSON and nulls', async () => {
    await repo.save(
      makeStudyItem({
        reference: 'pp. 40–60',
        questions: { before: ['Q?'], during: [], after: [] },
      }),
    );
    const found = await repo.byId('si-1');

    expect(found).not.toBeNull();
    expect(found!.title).toBe('Cap. 3');
    expect(found!.reference).toBe('pp. 40–60');
    expect(found!.questions).toEqual({ before: ['Q?'], during: [], after: [] });
    expect(found!.resourceId).toBeNull();
    expect(found!.fichamentoNoteId).toBeNull();
    expect(found!.status).toBe('ACTIVE');
    expect(found!.labelIds).toEqual([]);
  });

  it('save with labelIds connects labels; byId returns the ids', async () => {
    await makeLabel('l1', 'Teologia');
    await makeLabel('l2', 'História');

    await repo.save(makeStudyItem({ labelIds: ['l1', 'l2'] }));
    const found = await repo.byId('si-1');

    expect(found!.labelIds.sort()).toEqual(['l1', 'l2']);
  });

  it('find filters by status, resourceId and labelId', async () => {
    await makeLabel('l1', 'X');
    await makeResource('res-1');
    await repo.save(
      makeStudyItem({ id: 'a', status: 'ACTIVE', resourceId: 'res-1' }),
    );
    await repo.save(makeStudyItem({ id: 'b', status: 'ARCHIVED' }));
    await repo.save(makeStudyItem({ id: 'c', labelIds: ['l1'] }));

    const active = await repo.find({ userId: TEST_USER_ID, status: 'ACTIVE' });
    expect(active.map((i) => i.id).sort()).toEqual(['a', 'c']);

    const byResource = await repo.find({
      userId: TEST_USER_ID,
      resourceId: 'res-1',
    });
    expect(byResource.map((i) => i.id)).toEqual(['a']);

    const byLabel = await repo.find({ userId: TEST_USER_ID, labelId: 'l1' });
    expect(byLabel.map((i) => i.id)).toEqual(['c']);
  });

  it('update applies partial patch and replaces labelIds', async () => {
    await makeLabel('l1', 'A');
    await makeLabel('l2', 'B');
    await repo.save(makeStudyItem({ labelIds: ['l1'] }));

    const updated = await repo.update('si-1', {
      title: 'Novo',
      status: 'CONSOLIDATED',
      labelIds: ['l2'],
    });

    expect(updated.title).toBe('Novo');
    expect(updated.status).toBe('CONSOLIDATED');
    expect(updated.labelIds).toEqual(['l2']);
  });

  it('update throws when item does not exist', async () => {
    await expect(repo.update('ghost', { title: 'x' })).rejects.toThrow();
  });
});
