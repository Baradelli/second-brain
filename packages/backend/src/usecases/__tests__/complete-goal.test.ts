import { beforeEach, describe, expect, it } from 'vitest';

import { GoalNotFoundError, InvalidGoalError } from '../../domain/errors.js';
import type { Goal } from '../../domain/goal.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { CompleteGoal } from '../complete-goal.js';

const USER = 'user-1';

function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: 'g-1',
    userId: USER,
    title: 'G',
    description: null,
    type: 'TARGET',
    parentId: null,
    targetValue: 10,
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

describe('CompleteGoal', () => {
  let repo: GoalRepositoryFake;
  let useCase: CompleteGoal;

  beforeEach(() => {
    repo = new GoalRepositoryFake();
    useCase = new CompleteGoal(repo);
  });

  it('sets completedAt (default now) and keeps status ACTIVE', async () => {
    await repo.save(makeGoal());

    const result = await useCase.execute({ id: 'g-1', userId: USER });

    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.status).toBe('ACTIVE');
    expect(result.archivedAt).toBeNull();
  });

  it('uses provided completedAt when given', async () => {
    await repo.save(makeGoal());
    const when = new Date('2026-06-04T12:00:00.000Z');

    const result = await useCase.execute({
      id: 'g-1',
      userId: USER,
      completedAt: when,
    });

    expect(result.completedAt?.toISOString()).toBe(when.toISOString());
  });

  it('completes an UMBRELLA (fecha na mão)', async () => {
    await repo.save(makeGoal({ type: 'UMBRELLA', targetValue: null }));

    const result = await useCase.execute({ id: 'g-1', userId: USER });
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it('throws GoalNotFoundError for unknown id', async () => {
    await expect(
      useCase.execute({ id: 'ghost', userId: USER }),
    ).rejects.toThrow(GoalNotFoundError);
  });

  it('throws GoalNotFoundError when not the owner', async () => {
    await repo.save(makeGoal({ userId: 'owner' }));
    await expect(
      useCase.execute({ id: 'g-1', userId: 'intruder' }),
    ).rejects.toThrow(GoalNotFoundError);
  });

  it('throws InvalidGoalError when goal is archived', async () => {
    await repo.save(makeGoal({ status: 'ARCHIVED', archivedAt: new Date() }));
    await expect(useCase.execute({ id: 'g-1', userId: USER })).rejects.toThrow(
      InvalidGoalError,
    );
  });

  it('is idempotent: re-completing updates completedAt without error', async () => {
    await repo.save(makeGoal());
    const first = await useCase.execute({
      id: 'g-1',
      userId: USER,
      completedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    const second = await useCase.execute({
      id: 'g-1',
      userId: USER,
      completedAt: new Date('2026-06-05T00:00:00.000Z'),
    });

    expect(first.completedAt?.toISOString()).not.toBe(
      second.completedAt?.toISOString(),
    );
    expect(second.completedAt?.toISOString()).toBe(
      new Date('2026-06-05T00:00:00.000Z').toISOString(),
    );
  });
});
