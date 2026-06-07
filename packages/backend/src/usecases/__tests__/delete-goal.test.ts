import { beforeEach, describe, expect, it } from 'vitest';

import {
  GoalHasChildrenError,
  GoalHasDoneHistoryError,
  GoalNotArchivedError,
  GoalNotFoundError,
} from '../../domain/errors.js';
import type { Event } from '../../domain/event.js';
import type { Goal } from '../../domain/goal.js';
import { EventRepositoryFake } from '../_fakes/event-repository-fake.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { DeleteGoal } from '../delete-goal.js';

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

function event(id: string, goalId: string, type: 'done' | 'skip'): Event {
  return {
    id,
    userId: USER,
    goalId,
    type,
    value: null,
    reason: type === 'skip' ? 'motivo' : null,
    occurredAt: new Date('2026-06-02T12:00:00.000Z'),
    createdAt: new Date('2026-06-02T12:00:00.000Z'),
  };
}

describe('DeleteGoal', () => {
  let goals: GoalRepositoryFake;
  let events: EventRepositoryFake;
  let useCase: DeleteGoal;

  beforeEach(() => {
    goals = new GoalRepositoryFake();
    events = new EventRepositoryFake();
    useCase = new DeleteGoal(goals, events);
  });

  it('deletes an archived goal that was never done, removing leftover skips', async () => {
    await goals.save(makeGoal({ id: 'g' }));
    await events.save(event('e1', 'g', 'skip'));
    await events.save(event('e2', 'other', 'done')); // de outro goal — intacto

    const result = await useCase.execute({ id: 'g', userId: USER });

    expect(result.id).toBe('g');
    expect(await goals.byId('g')).toBeNull();
    expect(await events.find({ userId: USER, goalId: 'g' })).toHaveLength(0);
    expect(await events.find({ userId: USER, goalId: 'other' })).toHaveLength(
      1,
    );
  });

  it('refuses to delete a goal with done history (keeps goal and events)', async () => {
    await goals.save(makeGoal({ id: 'g' }));
    await events.save(event('e1', 'g', 'done'));

    await expect(useCase.execute({ id: 'g', userId: USER })).rejects.toThrow(
      GoalHasDoneHistoryError,
    );
    expect(await goals.byId('g')).not.toBeNull();
    expect(await events.find({ userId: USER, goalId: 'g' })).toHaveLength(1);
  });

  it('refuses to delete a goal that is not archived', async () => {
    await goals.save(makeGoal({ id: 'g', status: 'ACTIVE', archivedAt: null }));

    await expect(useCase.execute({ id: 'g', userId: USER })).rejects.toThrow(
      GoalNotArchivedError,
    );
  });

  it('refuses to delete a goal that has children', async () => {
    await goals.save(makeGoal({ id: 'parent', type: 'UMBRELLA' }));
    await goals.save(makeGoal({ id: 'child', parentId: 'parent' }));

    await expect(
      useCase.execute({ id: 'parent', userId: USER }),
    ).rejects.toThrow(GoalHasChildrenError);
  });

  it('does not delete a goal of another user', async () => {
    await goals.save(makeGoal({ id: 'g', userId: 'other' }));

    await expect(useCase.execute({ id: 'g', userId: USER })).rejects.toThrow(
      GoalNotFoundError,
    );
  });
});
