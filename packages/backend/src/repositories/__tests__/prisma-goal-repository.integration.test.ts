import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Goal } from '../../domain/goal.js';
import { PrismaGoalRepository } from '../prisma-goal-repository.js';
import { prisma, setupTestUser, TEST_USER_ID } from './_db.js';

const repo = new PrismaGoalRepository(prisma);

function makeGoal(overrides: Partial<Goal> & { id: string }): Goal {
  return {
    userId: TEST_USER_ID,
    title: 'Goal',
    description: null,
    type: 'HABIT',
    parentId: null,
    targetValue: null,
    unit: null,
    period: null,
    timesPerPeriod: null,
    weekdays: [1, 3, 5],
    startAt: null,
    dueAt: null,
    completedAt: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

async function clearAll() {
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.label.deleteMany({ where: { userId: TEST_USER_ID } });
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

describe('PrismaGoalRepository', () => {
  it('save + byId round-trip preserves fields (weekdays, null optionals)', async () => {
    await repo.save(makeGoal({ id: 'g1' }));
    const found = await repo.byId('g1');

    expect(found).not.toBeNull();
    expect(found!.type).toBe('HABIT');
    expect(found!.weekdays).toEqual([1, 3, 5]);
    expect(found!.targetValue).toBeNull();
    expect(found!.period).toBeNull();
    expect(found!.completedAt).toBeNull();
    expect(found!.parentId).toBeNull();
    expect(found!.status).toBe('ACTIVE');
    expect(found!.labelIds).toEqual([]);
  });

  it('byId returns null for unknown id', async () => {
    expect(await repo.byId('ghost')).toBeNull();
  });

  it('saves a TARGET child pointing to an UMBRELLA parent', async () => {
    await repo.save(makeGoal({ id: 'umb', type: 'UMBRELLA', weekdays: [] }));
    await repo.save(
      makeGoal({
        id: 'child',
        type: 'TARGET',
        weekdays: [],
        targetValue: 50,
        unit: 'km',
        parentId: 'umb',
      }),
    );

    const child = await repo.byId('child');
    expect(child!.parentId).toBe('umb');
    expect(child!.targetValue).toBe(50);
    expect(child!.unit).toBe('km');
  });

  it('find filters by status, type and parentId', async () => {
    await repo.save(makeGoal({ id: 'umb', type: 'UMBRELLA', weekdays: [] }));
    await repo.save(makeGoal({ id: 'active', status: 'ACTIVE' }));
    await repo.save(makeGoal({ id: 'archived', status: 'ARCHIVED' }));
    await repo.save(
      makeGoal({
        id: 'child',
        type: 'TARGET',
        weekdays: [],
        targetValue: 1,
        parentId: 'umb',
      }),
    );

    const active = await repo.find({
      userId: TEST_USER_ID,
      status: 'ACTIVE',
    });
    expect(active.map((g) => g.id)).not.toContain('archived');

    const habits = await repo.find({ userId: TEST_USER_ID, type: 'HABIT' });
    expect(habits.every((g) => g.type === 'HABIT')).toBe(true);

    const children = await repo.find({ userId: TEST_USER_ID, parentId: 'umb' });
    expect(children.map((g) => g.id)).toEqual(['child']);
  });

  it('update applies partial patch and replaces labelIds', async () => {
    const label = await prisma.label.create({
      data: { id: 'lbl', userId: TEST_USER_ID, name: 'L' },
    });
    await repo.save(makeGoal({ id: 'g1' }));

    const updated = await repo.update('g1', {
      title: 'Renamed',
      labelIds: [label.id],
    });
    expect(updated.title).toBe('Renamed');
    expect(updated.labelIds).toEqual([label.id]);
    expect(updated.weekdays).toEqual([1, 3, 5]);
  });

  it('update throws when goal does not exist', async () => {
    await expect(repo.update('ghost', { title: 'x' })).rejects.toThrow();
  });
});
