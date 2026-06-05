import { beforeEach, describe, expect, it } from 'vitest';

import { GoalNotFoundError, InvalidCheckError } from '../../domain/errors.js';
import type { Goal } from '../../domain/goal.js';
import { EventRepositoryFake } from '../_fakes/event-repository-fake.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { CheckGoal } from '../check-goal.js';

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

describe('CheckGoal', () => {
  let goals: GoalRepositoryFake;
  let events: EventRepositoryFake;
  let useCase: CheckGoal;

  beforeEach(() => {
    goals = new GoalRepositoryFake();
    events = new EventRepositoryFake();
    useCase = new CheckGoal(goals, events);
  });

  it('HABIT: creates a done event with value=null', async () => {
    await goals.save(makeGoal({ id: 'h', type: 'HABIT', weekdays: [1] }));

    const event = await useCase.execute({ goalId: 'h', userId: USER });

    expect(event.id).toBeTruthy();
    expect(event.type).toBe('done');
    expect(event.value).toBeNull();
    expect(event.reason).toBeNull();
    expect(event.goalId).toBe('h');
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(events.saved).toHaveLength(1);
  });

  it('HABIT: uses provided occurredAt', async () => {
    await goals.save(makeGoal({ id: 'h' }));
    const when = new Date('2026-06-04T08:00:00.000Z');

    const event = await useCase.execute({
      goalId: 'h',
      userId: USER,
      occurredAt: when,
    });

    expect(event.occurredAt.toISOString()).toBe(when.toISOString());
  });

  it('HABIT: rejects a value', async () => {
    await goals.save(makeGoal({ id: 'h' }));
    await expect(
      useCase.execute({ goalId: 'h', userId: USER, value: 5 }),
    ).rejects.toThrow(InvalidCheckError);
  });

  it('TARGET: creates a done event carrying the value', async () => {
    await goals.save(
      makeGoal({ id: 't', type: 'TARGET', weekdays: [], targetValue: 100 }),
    );

    const event = await useCase.execute({
      goalId: 't',
      userId: USER,
      value: 30,
    });

    expect(event.type).toBe('done');
    expect(event.value).toBe(30);
  });

  it('TARGET: rejects missing or non-positive value', async () => {
    await goals.save(
      makeGoal({ id: 't', type: 'TARGET', weekdays: [], targetValue: 100 }),
    );

    await expect(
      useCase.execute({ goalId: 't', userId: USER }),
    ).rejects.toThrow(InvalidCheckError);
    await expect(
      useCase.execute({ goalId: 't', userId: USER, value: 0 }),
    ).rejects.toThrow(InvalidCheckError);
  });

  it('PROJECT: behaves like TARGET (value required)', async () => {
    await goals.save(
      makeGoal({ id: 'p', type: 'PROJECT', weekdays: [], targetValue: 5 }),
    );
    const event = await useCase.execute({
      goalId: 'p',
      userId: USER,
      value: 1,
    });
    expect(event.value).toBe(1);
  });

  it('rejects checking an UMBRELLA', async () => {
    await goals.save(makeGoal({ id: 'u', type: 'UMBRELLA', weekdays: [] }));
    await expect(
      useCase.execute({ goalId: 'u', userId: USER }),
    ).rejects.toThrow(InvalidCheckError);
  });

  it('rejects checking an archived goal', async () => {
    await goals.save(
      makeGoal({ id: 'h', status: 'ARCHIVED', archivedAt: new Date() }),
    );
    await expect(
      useCase.execute({ goalId: 'h', userId: USER }),
    ).rejects.toThrow(InvalidCheckError);
  });

  it('throws GoalNotFoundError for unknown goal or wrong owner', async () => {
    await goals.save(makeGoal({ id: 'h', userId: 'owner' }));
    await expect(
      useCase.execute({ goalId: 'h', userId: 'intruder' }),
    ).rejects.toThrow(GoalNotFoundError);
    await expect(
      useCase.execute({ goalId: 'ghost', userId: USER }),
    ).rejects.toThrow(GoalNotFoundError);
  });
});
