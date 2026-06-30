import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Highlight } from '../../domain/highlight.js';
import { PrismaHighlightRepository } from '../prisma-highlight-repository.js';

const prisma = new PrismaClient();
const USER_ID = 'test-user-highlight';
const OTHER_USER_ID = 'test-user-highlight-other';
const RESOURCE_ID = 'test-resource-highlight';
const repo = new PrismaHighlightRepository(prisma);

function makeHighlight(overrides?: Partial<Highlight>): Highlight {
  return {
    id: 'hl-1',
    userId: USER_ID,
    resourceId: RESOURCE_ID,
    colorId: 'hl-yellow',
    location: null,
    quote: 'Você não sobe ao nível dos seus objetivos',
    comment: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

async function clearUserData() {
  await prisma.highlight.deleteMany({
    where: { userId: { in: [USER_ID, OTHER_USER_ID] } },
  });
  await prisma.resource.deleteMany({
    where: { userId: { in: [USER_ID, OTHER_USER_ID] } },
  });
}

beforeAll(async () => {
  for (const [id, email] of [
    [USER_ID, 'highlight-test@cerebro.local'],
    [OTHER_USER_ID, 'highlight-other@cerebro.local'],
  ]) {
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: { id, email, name: 'Highlight Test' },
    });
  }
  await clearUserData();
  await prisma.resource.create({
    data: { id: RESOURCE_ID, userId: USER_ID, title: 'Livro', type: 'book' },
  });
});

beforeEach(async () => {
  await prisma.highlight.deleteMany({
    where: { userId: { in: [USER_ID, OTHER_USER_ID] } },
  });
});

afterAll(async () => {
  await clearUserData();
  await prisma.user.deleteMany({
    where: { id: { in: [USER_ID, OTHER_USER_ID] } },
  });
  await prisma.$disconnect();
});

describe('PrismaHighlightRepository', () => {
  it('save + byId round-trip preserves all fields', async () => {
    await repo.save(
      makeHighlight({ location: 'p. 42', comment: 'lembrar disso' }),
    );

    const found = await repo.byId('hl-1');

    expect(found).toMatchObject({
      id: 'hl-1',
      resourceId: RESOURCE_ID,
      colorId: 'hl-yellow',
      location: 'p. 42',
      comment: 'lembrar disso',
      status: 'ACTIVE',
    });
  });

  it('find filters by resource, color and status', async () => {
    await repo.save(makeHighlight({ id: 'a', colorId: 'hl-yellow' }));
    await repo.save(makeHighlight({ id: 'b', colorId: 'hl-blue' }));
    await repo.save(
      makeHighlight({ id: 'c', colorId: 'hl-blue', status: 'ARCHIVED' }),
    );

    const blueActive = await repo.find({
      userId: USER_ID,
      resourceId: RESOURCE_ID,
      colorId: 'hl-blue',
      status: 'ACTIVE',
    });
    expect(blueActive.map((h) => h.id)).toEqual(['b']);
  });

  it('update applies patch without overwriting other fields', async () => {
    await repo.save(makeHighlight({ id: 'hl-1', quote: 'antes' }));

    const updated = await repo.update('hl-1', { quote: 'depois' });

    expect(updated.quote).toBe('depois');
    expect(updated.userId).toBe(USER_ID);
    expect(updated.colorId).toBe('hl-yellow');
  });

  it('delete removes the highlight', async () => {
    await repo.save(makeHighlight({ id: 'hl-1', status: 'ARCHIVED' }));
    await repo.delete('hl-1');
    expect(await repo.byId('hl-1')).toBeNull();
  });

  it('countByColor counts only ACTIVE highlights of that color', async () => {
    await repo.save(makeHighlight({ id: 'a', colorId: 'hl-blue' }));
    await repo.save(makeHighlight({ id: 'b', colorId: 'hl-blue' }));
    await repo.save(
      makeHighlight({ id: 'c', colorId: 'hl-blue', status: 'ARCHIVED' }),
    );
    await repo.save(makeHighlight({ id: 'd', colorId: 'hl-yellow' }));

    expect(await repo.countByColor(USER_ID, 'hl-blue')).toBe(2);
  });
});
