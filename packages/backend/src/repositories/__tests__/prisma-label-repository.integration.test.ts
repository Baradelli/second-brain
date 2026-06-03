import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Label } from '../../domain/label.js';
import { buildLabelTree } from '../../domain/label-tree.js';
import { PrismaLabelRepository } from '../prisma-label-repository.js';

const prisma = new PrismaClient();
const USER_ID = 'test-user-label';
const OTHER_USER_ID = 'test-user-label-other';
const repo = new PrismaLabelRepository(prisma);

function makeLabel(overrides?: Partial<Label>): Label {
  return {
    id: 'label-1',
    userId: USER_ID,
    name: 'Book',
    parentId: null,
    color: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

async function clearUserData() {
  await prisma.capture.deleteMany({ where: { userId: USER_ID } });
  await prisma.note.deleteMany({ where: { userId: USER_ID } });
  await prisma.label.deleteMany({ where: { userId: USER_ID } });
  await prisma.label.deleteMany({ where: { userId: OTHER_USER_ID } });
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: {
      id: USER_ID,
      email: 'label-test@cerebro.local',
      name: 'Label Test',
    },
  });
  await prisma.user.upsert({
    where: { id: OTHER_USER_ID },
    update: {},
    create: {
      id: OTHER_USER_ID,
      email: 'label-other-test@cerebro.local',
      name: 'Label Other Test',
    },
  });
});

beforeEach(async () => {
  await clearUserData();
});

afterAll(async () => {
  await clearUserData();
  await prisma.user.deleteMany({
    where: { id: { in: [USER_ID, OTHER_USER_ID] } },
  });
  await prisma.$disconnect();
});

describe('PrismaLabelRepository', () => {
  it('save + byId round-trip preserves parentId', async () => {
    await repo.save(makeLabel({ id: 'parent', name: 'Book' }));
    await repo.save(
      makeLabel({ id: 'child', name: 'History', parentId: 'parent' }),
    );

    const found = await repo.byId('child');

    expect(found).toMatchObject({ id: 'child', parentId: 'parent' });
  });

  it('listByUser filters status and tree can be reconstructed', async () => {
    await repo.save(makeLabel({ id: 'book', name: 'Book' }));
    await repo.save(
      makeLabel({ id: 'history', name: 'History', parentId: 'book' }),
    );
    await repo.save(makeLabel({ id: 'old', status: 'ARCHIVED' }));

    const labels = await repo.listByUser(USER_ID, 'ACTIVE');
    const tree = buildLabelTree(labels);

    expect(labels.map((label) => label.id)).not.toContain('old');
    expect(tree[0]?.id).toBe('book');
    expect(tree[0]?.children[0]?.id).toBe('history');
  });

  it('update applies patch without overwriting other fields', async () => {
    await repo.save(makeLabel({ id: 'label-1', name: 'Book' }));

    const updated = await repo.update('label-1', { name: 'History' });

    expect(updated.name).toBe('History');
    expect(updated.userId).toBe(USER_ID);
  });

  it('usageCount counts Note and Capture links plus active children', async () => {
    await repo.save(makeLabel({ id: 'used' }));
    await repo.save(makeLabel({ id: 'child', parentId: 'used' }));
    await repo.save(
      makeLabel({ id: 'old-child', parentId: 'used', status: 'ARCHIVED' }),
    );

    await prisma.capture.create({
      data: {
        id: 'label-capture',
        userId: USER_ID,
        text: 'ideia',
        labels: { connect: { id: 'used' } },
      },
    });
    await prisma.note.create({
      data: {
        id: 'label-note',
        userId: USER_ID,
        type: 'NOTE',
        scope: 'DAY',
        date: new Date('2026-06-01T00:00:00.000Z'),
        doc: { type: 'doc', content: [] },
        plainText: '',
        labels: { connect: { id: 'used' } },
      },
    });

    expect(await repo.usageCount('used')).toEqual({
      items: 2,
      activeChildren: 1,
    });
  });
});
