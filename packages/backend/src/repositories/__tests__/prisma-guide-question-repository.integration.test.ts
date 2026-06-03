import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { GuideQuestion } from '../../domain/guide-question.js';
import { PrismaGuideQuestionRepository } from '../prisma-guide-question-repository.js';

const prisma = new PrismaClient();
const USER_ID = 'test-user-guide-question';
const OTHER_USER_ID = 'test-user-guide-question-other';
const repo = new PrismaGuideQuestionRepository(prisma);

function makeQuestion(overrides?: Partial<GuideQuestion>): GuideQuestion {
  return {
    id: 'q-1',
    labelId: 'book',
    text: 'Was it useful?',
    order: 0,
    active: true,
    ...overrides,
  };
}

async function clearUserData() {
  await prisma.guideQuestion.deleteMany({
    where: { label: { userId: { in: [USER_ID, OTHER_USER_ID] } } },
  });
  await prisma.label.deleteMany({
    where: { userId: { in: [USER_ID, OTHER_USER_ID] } },
  });
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: {
      id: USER_ID,
      email: 'guide-question-test@cerebro.local',
      name: 'Guide Question Test',
    },
  });
  await prisma.user.upsert({
    where: { id: OTHER_USER_ID },
    update: {},
    create: {
      id: OTHER_USER_ID,
      email: 'guide-question-other-test@cerebro.local',
      name: 'Guide Question Other Test',
    },
  });
});

beforeEach(async () => {
  await clearUserData();
  await prisma.label.createMany({
    data: [
      { id: 'book', userId: USER_ID, name: 'Book' },
      { id: 'history', userId: USER_ID, name: 'History' },
      { id: 'child', userId: USER_ID, name: 'Book child', parentId: 'book' },
      { id: 'other-label', userId: OTHER_USER_ID, name: 'Private' },
    ],
  });
});

afterAll(async () => {
  await clearUserData();
  await prisma.user.deleteMany({
    where: { id: { in: [USER_ID, OTHER_USER_ID] } },
  });
  await prisma.$disconnect();
});

describe('PrismaGuideQuestionRepository', () => {
  it('labelById retorna label com userId', async () => {
    const label = await repo.labelById('book');

    expect(label).toEqual({ id: 'book', userId: USER_ID, name: 'Book' });
  });

  it('save + byId round-trip', async () => {
    await repo.save(makeQuestion());

    expect(await repo.byId('q-1')).toMatchObject({
      id: 'q-1',
      labelId: 'book',
      text: 'Was it useful?',
    });
  });

  it('update desativa sem apagar', async () => {
    await repo.save(makeQuestion());

    const updated = await repo.update('q-1', { active: false });

    expect(updated.active).toBe(false);
    expect(await repo.byId('q-1')).not.toBeNull();
  });

  it('findActiveByLabelIds retorna ativas com label e sem herança', async () => {
    await repo.save(
      makeQuestion({ id: 'q-2', labelId: 'book', text: 'Second', order: 2 }),
    );
    await repo.save(
      makeQuestion({ id: 'q-1', labelId: 'book', text: 'First', order: 1 }),
    );
    await repo.save(
      makeQuestion({ id: 'q-off', labelId: 'book', active: false }),
    );
    await repo.save(makeQuestion({ id: 'q-history', labelId: 'history' }));

    const bookOnly = await repo.findActiveByLabelIds(['book']);
    const childOnly = await repo.findActiveByLabelIds(['child']);

    expect(bookOnly.map((row) => row.question.id)).toEqual(['q-1', 'q-2']);
    expect(bookOnly[0]?.label).toEqual({
      id: 'book',
      userId: USER_ID,
      name: 'Book',
    });
    expect(childOnly).toEqual([]);
  });
});
