import { beforeEach, describe, expect, it } from 'vitest';

import { GoalNotFoundError } from '../../domain/errors.js';
import type { Goal } from '../../domain/goal.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { UnarchiveGoal } from '../unarchive-goal.js';

const USER = 'user-1';

function makeGoal(overrides: Partial<Goal> & { id: string }): Goal {
  return {
    userId: USER,
    title: 'G',
    description: null,
    type: 'HABIT',
    parentId: null,
    targetValue: null,
    unit: null,
    period: null,
    timesPerPeriod: null,
    weekdays: [],
    startAt: null,
    dueAt: null,
    completedAt: null,
    status: 'ARCHIVED',
    archivedAt: new Date('2026-06-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

describe('UnarchiveGoal', () => {
  let goals: GoalRepositoryFake;
  let useCase: UnarchiveGoal;

  beforeEach(() => {
    goals = new GoalRepositoryFake();
    useCase = new UnarchiveGoal(goals);
  });

  it('restores an archived goal to ACTIVE and clears archivedAt', async () => {
    await goals.save(makeGoal({ id: 'g' }));

    const result = await useCase.execute({ id: 'g', userId: USER });

    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
  });

  it('does not touch a goal of another user', async () => {
    await goals.save(makeGoal({ id: 'g', userId: 'other' }));

    await expect(useCase.execute({ id: 'g', userId: USER })).rejects.toThrow(
      GoalNotFoundError,
    );
  });
});
