import { beforeEach, describe, expect, it } from 'vitest';

import { GoalNotFoundError, InvalidCheckError } from '../../domain/errors.js';
import type { Goal } from '../../domain/goal.js';
import { EventRepositoryFake } from '../_fakes/event-repository-fake.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { SkipGoal } from '../skip-goal.js';

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
    weekdays: [1],
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

describe('SkipGoal', () => {
  let goals: GoalRepositoryFake;
  let events: EventRepositoryFake;
  let useCase: SkipGoal;

  beforeEach(() => {
    goals = new GoalRepositoryFake();
    events = new EventRepositoryFake();
    useCase = new SkipGoal(goals, events);
  });

  it('creates a skip event with reason and value=null', async () => {
    await goals.save(makeGoal({ id: 'h' }));

    const event = await useCase.execute({
      goalId: 'h',
      userId: USER,
      reason: '  estava doente  ',
    });

    expect(event.type).toBe('skip');
    expect(event.value).toBeNull();
    expect(event.reason).toBe('estava doente'); // trimmed
    expect(event.goalId).toBe('h');
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(events.saved).toHaveLength(1);
  });

  it('uses provided occurredAt', async () => {
    await goals.save(makeGoal({ id: 'h' }));
    const when = new Date('2026-06-04T21:00:00.000Z');

    const event = await useCase.execute({
      goalId: 'h',
      userId: USER,
      reason: 'cansado',
      occurredAt: when,
    });

    expect(event.occurredAt.toISOString()).toBe(when.toISOString());
  });

  it('rejects an empty / whitespace reason', async () => {
    await goals.save(makeGoal({ id: 'h' }));

    await expect(
      useCase.execute({ goalId: 'h', userId: USER, reason: '   ' }),
    ).rejects.toThrow(InvalidCheckError);
    expect(events.saved).toHaveLength(0);
  });

  it('rejects skipping an UMBRELLA', async () => {
    await goals.save(makeGoal({ id: 'u', type: 'UMBRELLA', weekdays: [] }));

    await expect(
      useCase.execute({ goalId: 'u', userId: USER, reason: 'x' }),
    ).rejects.toThrow(InvalidCheckError);
  });

  it('rejects skipping an archived goal', async () => {
    await goals.save(
      makeGoal({ id: 'h', status: 'ARCHIVED', archivedAt: new Date() }),
    );

    await expect(
      useCase.execute({ goalId: 'h', userId: USER, reason: 'x' }),
    ).rejects.toThrow(InvalidCheckError);
  });

  it('throws GoalNotFoundError for unknown goal or wrong owner', async () => {
    await goals.save(makeGoal({ id: 'h', userId: 'owner' }));

    await expect(
      useCase.execute({ goalId: 'h', userId: 'intruder', reason: 'x' }),
    ).rejects.toThrow(GoalNotFoundError);
    await expect(
      useCase.execute({ goalId: 'ghost', userId: USER, reason: 'x' }),
    ).rejects.toThrow(GoalNotFoundError);
  });
});
