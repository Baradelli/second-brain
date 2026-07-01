import { beforeEach, describe, expect, it } from 'vitest';

import { GoalNotFoundError, InvalidGoalError } from '../../domain/errors.js';
import type { Goal } from '../../domain/goal.js';
import type { Resource } from '../../domain/resource.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { ResourceRepositoryFake } from '../_fakes/resource-repository-fake.js';
import { EditGoal } from '../edit-goal.js';

const USER = 'user-1';

function makeResource(overrides?: Partial<Resource>): Resource {
  return {
    id: 'res-1',
    userId: USER,
    title: 'Confissões',
    type: 'book',
    url: null,
    author: null,
    description: null,
    stage: 'backlog',
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

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
  let resources: ResourceRepositoryFake;
  let useCase: EditGoal;

  beforeEach(() => {
    repo = new GoalRepositoryFake();
    resources = new ResourceRepositoryFake();
    useCase = new EditGoal(repo, resources);
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

  describe('resourceId — liga/desliga objetivo de leitura', () => {
    it('links the goal to a resource the user owns', async () => {
      await repo.save(makeGoal());
      await resources.save(makeResource());

      const result = await useCase.execute({
        id: 'g-1',
        userId: USER,
        resourceId: 'res-1',
      });
      expect(result.resourceId).toBe('res-1');
    });

    it('unlinks with resourceId: null', async () => {
      await repo.save(makeGoal({ resourceId: 'res-1' }));
      await resources.save(makeResource());

      const result = await useCase.execute({
        id: 'g-1',
        userId: USER,
        resourceId: null,
      });
      expect(result.resourceId).toBeNull();
    });

    it('keeps resourceId when absent from the patch', async () => {
      await repo.save(makeGoal({ resourceId: 'res-1' }));
      await resources.save(makeResource());

      const result = await useCase.execute({
        id: 'g-1',
        userId: USER,
        title: 'x',
      });
      expect(result.resourceId).toBe('res-1');
    });

    it('rejects linking to a resource the user does not own', async () => {
      await repo.save(makeGoal());
      await resources.save(makeResource({ id: 'res-other', userId: 'other' }));

      await expect(
        useCase.execute({ id: 'g-1', userId: USER, resourceId: 'res-other' }),
      ).rejects.toThrow(InvalidGoalError);
    });
  });
});
