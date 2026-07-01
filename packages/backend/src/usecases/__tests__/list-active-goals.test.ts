import { beforeEach, describe, expect, it } from 'vitest';

import type { Goal } from '../../domain/goal.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { ListActiveGoals } from '../list-active-goals.js';

const USER = 'user-1';

function makeGoal(overrides: Partial<Goal> & { id: string }): Goal {
  return {
    userId: USER,
    title: 'G',
    description: null,
    type: 'TARGET',
    parentId: null,
    targetValue: 1,
    unit: null,
    period: null,
    timesPerPeriod: null,
    weekdays: [],
    startAt: null,
    dueAt: null,
    completedAt: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

describe('ListActiveGoals', () => {
  let repo: GoalRepositoryFake;
  let useCase: ListActiveGoals;

  beforeEach(() => {
    repo = new GoalRepositoryFake();
    useCase = new ListActiveGoals(repo);
  });

  it('returns only ACTIVE goals of the user', async () => {
    await repo.save(makeGoal({ id: 'active', status: 'ACTIVE' }));
    await repo.save(makeGoal({ id: 'archived', status: 'ARCHIVED' }));
    await repo.save(makeGoal({ id: 'other', userId: 'u2', status: 'ACTIVE' }));

    const result = await useCase.execute({ userId: USER });
    expect(result.map((g) => g.id)).toEqual(['active']);
  });

  it('filters by type', async () => {
    await repo.save(makeGoal({ id: 'h', type: 'HABIT', weekdays: [1] }));
    await repo.save(makeGoal({ id: 't', type: 'TARGET' }));

    const result = await useCase.execute({ userId: USER, type: 'HABIT' });
    expect(result.map((g) => g.id)).toEqual(['h']);
  });

  it('filters by parentId', async () => {
    await repo.save(
      makeGoal({ id: 'umb', type: 'UMBRELLA', targetValue: null }),
    );
    await repo.save(makeGoal({ id: 'child', parentId: 'umb' }));
    await repo.save(makeGoal({ id: 'root', parentId: null }));

    const result = await useCase.execute({ userId: USER, parentId: 'umb' });
    expect(result.map((g) => g.id)).toEqual(['child']);
  });

  it('filters by resourceId (reading goals of a resource)', async () => {
    await repo.save(makeGoal({ id: 'reading', resourceId: 'res-1' }));
    await repo.save(makeGoal({ id: 'other-res', resourceId: 'res-2' }));
    await repo.save(makeGoal({ id: 'no-res', resourceId: null }));

    const result = await useCase.execute({ userId: USER, resourceId: 'res-1' });
    expect(result.map((g) => g.id)).toEqual(['reading']);
  });
});
