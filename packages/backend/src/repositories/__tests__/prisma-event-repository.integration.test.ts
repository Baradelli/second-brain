import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Event } from '../../domain/event.js';
import { PrismaEventRepository } from '../prisma-event-repository.js';
import { prisma, setupTestUser, TEST_USER_ID } from './_db.js';

const repo = new PrismaEventRepository(prisma);
const GOAL_ID = 'evt-goal-1';

function makeEvent(overrides: Partial<Event> & { id: string }): Event {
  return {
    userId: TEST_USER_ID,
    goalId: GOAL_ID,
    type: 'done',
    value: null,
    reason: null,
    occurredAt: new Date('2026-06-04T10:00:00.000Z'),
    createdAt: new Date('2026-06-04T10:00:00.000Z'),
    ...overrides,
  };
}

async function clearAll() {
  await prisma.event.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
}

beforeAll(async () => {
  await setupTestUser();
  await clearAll();
  await prisma.goal.create({
    data: { id: GOAL_ID, userId: TEST_USER_ID, title: 'Goal', type: 'HABIT' },
  });
});

beforeEach(async () => {
  await prisma.event.deleteMany({ where: { userId: TEST_USER_ID } });
});

afterAll(async () => {
  await clearAll();
  await prisma.$disconnect();
});

describe('PrismaEventRepository', () => {
  it('save + byId round-trip a done event with value', async () => {
    await repo.save(makeEvent({ id: 'e1', type: 'done', value: 30 }));
    const found = await repo.byId('e1');

    expect(found).not.toBeNull();
    expect(found!.type).toBe('done');
    expect(found!.value).toBe(30);
    expect(found!.reason).toBeNull();
    expect(found!.goalId).toBe(GOAL_ID);
  });

  it('save + byId round-trip a skip event with reason', async () => {
    await repo.save(
      makeEvent({ id: 'e2', type: 'skip', reason: 'estava doente' }),
    );
    const found = await repo.byId('e2');
    expect(found!.type).toBe('skip');
    expect(found!.reason).toBe('estava doente');
    expect(found!.value).toBeNull();
  });

  it('byId returns null for unknown id', async () => {
    expect(await repo.byId('ghost')).toBeNull();
  });

  it('delete really removes the event (hard delete)', async () => {
    await repo.save(makeEvent({ id: 'e1' }));
    await repo.delete('e1');
    expect(await repo.byId('e1')).toBeNull();
  });

  it('find filters by goalId and type', async () => {
    await repo.save(makeEvent({ id: 'd', type: 'done' }));
    await repo.save(makeEvent({ id: 's', type: 'skip', reason: 'x' }));

    const dones = await repo.find({
      userId: TEST_USER_ID,
      goalId: GOAL_ID,
      type: 'done',
    });
    expect(dones.map((e) => e.id)).toEqual(['d']);
  });

  it('find filters by occurredAt window (inclusive borders)', async () => {
    await repo.save(
      makeEvent({
        id: 'before',
        occurredAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );
    await repo.save(
      makeEvent({
        id: 'from',
        occurredAt: new Date('2026-06-02T00:00:00.000Z'),
      }),
    );
    await repo.save(
      makeEvent({ id: 'to', occurredAt: new Date('2026-06-04T00:00:00.000Z') }),
    );
    await repo.save(
      makeEvent({
        id: 'after',
        occurredAt: new Date('2026-06-05T00:00:00.000Z'),
      }),
    );

    const result = await repo.find({
      userId: TEST_USER_ID,
      from: new Date('2026-06-02T00:00:00.000Z'),
      to: new Date('2026-06-04T00:00:00.000Z'),
    });
    const ids = result.map((e) => e.id);
    expect(ids).toContain('from');
    expect(ids).toContain('to');
    expect(ids).not.toContain('before');
    expect(ids).not.toContain('after');
  });

  it('find by goalIds (in) matches any of them', async () => {
    await repo.save(makeEvent({ id: 'g', goalId: GOAL_ID }));
    const result = await repo.find({
      userId: TEST_USER_ID,
      goalIds: [GOAL_ID, 'other'],
    });
    expect(result.map((e) => e.id)).toContain('g');
  });
});
