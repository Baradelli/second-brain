import { beforeEach, describe, expect, it } from 'vitest';

import {
  GoalHasActiveChildrenError,
  GoalNotFoundError,
} from '../../domain/errors.js';
import type { Goal } from '../../domain/goal.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { ArchiveGoal } from '../archive-goal.js';

const USER = 'user-1';

function makeGoal(overrides: Partial<Goal> & { id: string }): Goal {
  return {
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

describe('ArchiveGoal', () => {
  let repo: GoalRepositoryFake;
  let useCase: ArchiveGoal;

  beforeEach(() => {
    repo = new GoalRepositoryFake();
    useCase = new ArchiveGoal(repo);
  });

  it('archives a leaf goal (status ARCHIVED + archivedAt)', async () => {
    await repo.save(makeGoal({ id: 'g-1' }));

    const result = await useCase.execute({ id: 'g-1', userId: USER });

    expect(result.status).toBe('ARCHIVED');
    expect(result.archivedAt).toBeInstanceOf(Date);
  });

  it('blocks archiving an UMBRELLA with active children', async () => {
    await repo.save(
      makeGoal({ id: 'umb', type: 'UMBRELLA', targetValue: null }),
    );
    await repo.save(makeGoal({ id: 'c1', parentId: 'umb', status: 'ACTIVE' }));

    await expect(useCase.execute({ id: 'umb', userId: USER })).rejects.toThrow(
      GoalHasActiveChildrenError,
    );

    const persisted = await repo.byId('umb');
    expect(persisted?.status).toBe('ACTIVE');
  });

  it('archives an UMBRELLA whose children are all archived', async () => {
    await repo.save(
      makeGoal({ id: 'umb', type: 'UMBRELLA', targetValue: null }),
    );
    await repo.save(
      makeGoal({ id: 'c1', parentId: 'umb', status: 'ARCHIVED' }),
    );

    const result = await useCase.execute({ id: 'umb', userId: USER });
    expect(result.status).toBe('ARCHIVED');
  });

  it('throws GoalNotFoundError for unknown id / wrong owner', async () => {
    await repo.save(makeGoal({ id: 'g-1', userId: 'owner' }));
    await expect(
      useCase.execute({ id: 'g-1', userId: 'intruder' }),
    ).rejects.toThrow(GoalNotFoundError);
    await expect(
      useCase.execute({ id: 'ghost', userId: USER }),
    ).rejects.toThrow(GoalNotFoundError);
  });

  it('is idempotent on a leaf (re-archiving updates archivedAt without error)', async () => {
    await repo.save(makeGoal({ id: 'g-1' }));
    await useCase.execute({
      id: 'g-1',
      userId: USER,
      archivedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    const second = await useCase.execute({
      id: 'g-1',
      userId: USER,
      archivedAt: new Date('2026-06-05T00:00:00.000Z'),
    });

    expect(second.status).toBe('ARCHIVED');
    expect(second.archivedAt?.toISOString()).toBe(
      new Date('2026-06-05T00:00:00.000Z').toISOString(),
    );
  });
});
