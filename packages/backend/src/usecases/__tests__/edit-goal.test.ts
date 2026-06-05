import { beforeEach, describe, expect, it } from 'vitest';

import { GoalNotFoundError, InvalidGoalError } from '../../domain/errors.js';
import type { Goal } from '../../domain/goal.js';
import { EditGoal } from '../edit-goal.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';

const USER = 'user-1';

function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: 'g-1',
    userId: USER,
    title: 'Original',
    description: null,
    type: 'HABIT',
    parentId: null,
    targetValue: null,
    unit: null,
    period: null,
    timesPerPeriod: null,
    weekdays: [1, 3],
    startAt: null,
    dueAt: null,
    completedAt: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    labelIds: ['l1'],
    ...overrides,
  };
}

describe('EditGoal', () => {
  let repo: GoalRepositoryFake;
  let useCase: EditGoal;

  beforeEach(() => {
    repo = new GoalRepositoryFake();
    useCase = new EditGoal(repo);
  });

  it('partial patch only changes present fields', async () => {
    await repo.save(makeGoal());

    const result = await useCase.execute({
      id: 'g-1',
      userId: USER,
      title: 'New',
    });

    expect(result.title).toBe('New');
    expect(result.weekdays).toEqual([1, 3]);
    expect(result.labelIds).toEqual(['l1']);
    expect(result.type).toBe('HABIT');
  });

  it('throws GoalNotFoundError for unknown id', async () => {
    await expect(
      useCase.execute({ id: 'ghost', userId: USER, title: 'x' }),
    ).rejects.toThrow(GoalNotFoundError);
  });

  it('throws GoalNotFoundError when not the owner (no leak)', async () => {
    await repo.save(makeGoal({ userId: 'owner' }));
    await expect(
      useCase.execute({ id: 'g-1', userId: 'intruder', title: 'x' }),
    ).rejects.toThrow(GoalNotFoundError);

    const persisted = await repo.byId('g-1');
    expect(persisted?.title).toBe('Original');
  });

  it('labelIds present replaces; absent keeps', async () => {
    await repo.save(makeGoal({ labelIds: ['l1', 'l2'] }));

    const replaced = await useCase.execute({
      id: 'g-1',
      userId: USER,
      labelIds: ['l3'],
    });
    expect(replaced.labelIds).toEqual(['l3']);

    const kept = await useCase.execute({ id: 'g-1', userId: USER, title: 'y' });
    expect(kept.labelIds).toEqual(['l3']);
  });

  it('does not change status/archivedAt/completedAt', async () => {
    await repo.save(
      makeGoal({ status: 'ACTIVE', archivedAt: null, completedAt: null }),
    );

    const result = await useCase.execute({
      id: 'g-1',
      userId: USER,
      title: 'x',
    });

    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
    expect(result.completedAt).toBeNull();
  });

  describe('re-applies cadence/measure coherence on the resulting state', () => {
    it('rejects editing a HABIT into having both cadences', async () => {
      await repo.save(makeGoal({ type: 'HABIT', weekdays: [1] }));

      await expect(
        useCase.execute({
          id: 'g-1',
          userId: USER,
          period: 'week',
          timesPerPeriod: 2,
        }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('switches HABIT cadence from weekdays to period (clearing weekdays)', async () => {
      await repo.save(makeGoal({ type: 'HABIT', weekdays: [1, 3] }));

      const result = await useCase.execute({
        id: 'g-1',
        userId: USER,
        weekdays: [],
        period: 'week',
        timesPerPeriod: 2,
      });

      expect(result.weekdays).toEqual([]);
      expect(result.period).toBe('week');
      expect(result.timesPerPeriod).toBe(2);
    });

    it('rejects putting weekdays on a TARGET', async () => {
      await repo.save(
        makeGoal({ type: 'TARGET', weekdays: [], targetValue: 10 }),
      );

      await expect(
        useCase.execute({ id: 'g-1', userId: USER, weekdays: [1] }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects targetValue <= 0 on a TARGET', async () => {
      await repo.save(
        makeGoal({ type: 'TARGET', weekdays: [], targetValue: 10 }),
      );

      await expect(
        useCase.execute({ id: 'g-1', userId: USER, targetValue: 0 }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects empty title', async () => {
      await repo.save(makeGoal());
      await expect(
        useCase.execute({ id: 'g-1', userId: USER, title: '   ' }),
      ).rejects.toThrow(InvalidGoalError);
    });
  });
});
