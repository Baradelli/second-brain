import { beforeEach, describe, expect, it } from 'vitest';

import type { Event } from '../../domain/event.js';
import type { Goal } from '../../domain/goal.js';
import { EventRepositoryFake } from '../_fakes/event-repository-fake.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { ListArchivedGoals } from '../list-archived-goals.js';

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

function doneEvent(id: string, goalId: string): Event {
  return {
    id,
    userId: USER,
    goalId,
    type: 'done',
    value: null,
    reason: null,
    occurredAt: new Date('2026-06-02T12:00:00.000Z'),
    createdAt: new Date('2026-06-02T12:00:00.000Z'),
  };
}

describe('ListArchivedGoals', () => {
  let goals: GoalRepositoryFake;
  let events: EventRepositoryFake;
  let useCase: ListArchivedGoals;

  beforeEach(() => {
    goals = new GoalRepositoryFake();
    events = new EventRepositoryFake();
    useCase = new ListArchivedGoals(goals, events);
  });

  it('returns only archived goals, newest first, with the deletable flag', async () => {
    await goals.save(
      makeGoal({
        id: 'old',
        archivedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );
    await goals.save(
      makeGoal({
        id: 'new',
        archivedAt: new Date('2026-06-10T00:00:00.000Z'),
      }),
    );
    await goals.save(
      makeGoal({ id: 'active', status: 'ACTIVE', archivedAt: null }),
    );
    await events.save(doneEvent('e1', 'old')); // 'old' tem histórico → não deletável

    const result = await useCase.execute({ userId: USER });

    expect(result.map((r) => r.goal.id)).toEqual(['new', 'old']);
    expect(result.find((r) => r.goal.id === 'new')?.deletable).toBe(true);
    expect(result.find((r) => r.goal.id === 'old')?.deletable).toBe(false);
  });

  it('isolates archived goals from another user', async () => {
    await goals.save(makeGoal({ id: 'g', userId: 'other' }));

    expect(await useCase.execute({ userId: USER })).toHaveLength(0);
  });
});
