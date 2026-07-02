import { beforeEach, describe, expect, it } from 'vitest';

import { GoalNotFoundError } from '../../domain/errors.js';
import type { Event } from '../../domain/event.js';
import type { Goal } from '../../domain/goal.js';
import { EventRepositoryFake } from '../_fakes/event-repository-fake.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { SettingsReaderFake } from '../_fakes/settings-reader-fake.js';
import { ComputeGoalProgress } from '../compute-goal-progress.js';

const USER = 'user-1';
const TZ = 'America/Sao_Paulo'; // UTC-3
// Quarta-feira; semana (seg–dom) local = 2026-06-01 .. 2026-06-07.
const REFERENCE = new Date('2026-06-03T12:00:00.000Z');

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
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

function doneEvent(goalId: string, occurredAt: string, value?: number): Event {
  return {
    id: `${goalId}-${occurredAt}`,
    userId: USER,
    goalId,
    type: 'done',
    value: value ?? null,
    reason: null,
    occurredAt: new Date(occurredAt),
    createdAt: new Date(occurredAt),
  };
}

describe('ComputeGoalProgress', () => {
  let goals: GoalRepositoryFake;
  let events: EventRepositoryFake;
  let settings: SettingsReaderFake;
  let useCase: ComputeGoalProgress;

  beforeEach(() => {
    goals = new GoalRepositoryFake();
    events = new EventRepositoryFake();
    settings = new SettingsReaderFake();
    // recapWeekday 1 (segunda) preserva as janelas seg–dom destes cenários.
    settings.set(USER, { timezone: TZ, reviewWeekday: 1, recapWeekday: 1 });
    useCase = new ComputeGoalProgress(goals, events, settings);
  });

  describe('HABIT — weekdays cadence (distinct days in the current week)', () => {
    beforeEach(async () => {
      await goals.save(
        makeGoal({ id: 'h', type: 'HABIT', weekdays: [1, 3, 5] }),
      );
      // Mon + Wed (+ a 2nd Wed check) inside the week; one event last week.
      await events.save(doneEvent('h', '2026-06-01T15:00:00.000Z')); // Mon local
      await events.save(doneEvent('h', '2026-06-03T15:00:00.000Z')); // Wed local
      await events.save(doneEvent('h', '2026-06-03T18:00:00.000Z')); // Wed again
      await events.save(doneEvent('h', '2026-05-29T15:00:00.000Z')); // last week
    });

    it('counts distinct days, ignores events outside the week', async () => {
      const p = await useCase.execute({
        goalId: 'h',
        userId: USER,
        reference: REFERENCE,
      });

      expect(p.type).toBe('HABIT');
      expect(p.target).toBe(3);
      expect(p.done).toBe(2); // Mon + Wed (2nd Wed check does not double)
      expect(p.ratio).toBeCloseTo(2 / 3, 5);
      expect(p.period).not.toBeNull();
      expect(p.completed).toBe(false);
    });
  });

  it('HABIT — period cadence counts events and clamps ratio at 1', async () => {
    await goals.save(
      makeGoal({
        id: 'hp',
        type: 'HABIT',
        weekdays: [],
        period: 'week',
        timesPerPeriod: 3,
      }),
    );
    await events.save(doneEvent('hp', '2026-06-01T15:00:00.000Z'));
    await events.save(doneEvent('hp', '2026-06-02T15:00:00.000Z'));
    await events.save(doneEvent('hp', '2026-06-03T15:00:00.000Z'));
    await events.save(doneEvent('hp', '2026-06-04T15:00:00.000Z'));

    const p = await useCase.execute({
      goalId: 'hp',
      userId: USER,
      reference: REFERENCE,
    });

    expect(p.target).toBe(3);
    expect(p.done).toBe(4); // counts events, not distinct days
    expect(p.ratio).toBe(1); // clamped
    expect(p.completed).toBe(true); // ratio >= 1
  });

  it('TARGET — sums value of done events vs targetValue', async () => {
    await goals.save(
      makeGoal({ id: 't', type: 'TARGET', weekdays: [], targetValue: 100 }),
    );
    await events.save(doneEvent('t', '2026-05-10T10:00:00.000Z', 10));
    await events.save(doneEvent('t', '2026-05-20T10:00:00.000Z', 20));
    await events.save(doneEvent('t', '2026-06-02T10:00:00.000Z', 30));

    const p = await useCase.execute({
      goalId: 't',
      userId: USER,
      reference: REFERENCE,
    });

    expect(p.done).toBe(60);
    expect(p.target).toBe(100);
    expect(p.ratio).toBeCloseTo(0.6, 5);
    expect(p.period).toBeNull();
  });

  it('TARGET with null targetValue → ratio null', async () => {
    await goals.save(
      makeGoal({ id: 't0', type: 'TARGET', weekdays: [], targetValue: null }),
    );
    await events.save(doneEvent('t0', '2026-06-02T10:00:00.000Z', 5));

    const p = await useCase.execute({ goalId: 't0', userId: USER });
    expect(p.done).toBe(5);
    expect(p.target).toBeNull();
    expect(p.ratio).toBeNull();
  });

  it('PROJECT — behaves like TARGET (sums value)', async () => {
    await goals.save(
      makeGoal({ id: 'pr', type: 'PROJECT', weekdays: [], targetValue: 4 }),
    );
    await events.save(doneEvent('pr', '2026-06-02T10:00:00.000Z', 1));
    await events.save(doneEvent('pr', '2026-06-02T11:00:00.000Z', 1));

    const p = await useCase.execute({ goalId: 'pr', userId: USER });
    expect(p.done).toBe(2);
    expect(p.ratio).toBeCloseTo(0.5, 5);
  });

  it('UMBRELLA — done = completed active children / target = active children', async () => {
    await goals.save(makeGoal({ id: 'umb', type: 'UMBRELLA', weekdays: [] }));
    // completed child (completedAt set)
    await goals.save(
      makeGoal({
        id: 'c1',
        type: 'TARGET',
        weekdays: [],
        targetValue: 10,
        parentId: 'umb',
        completedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );
    // incomplete child (no events, no completedAt)
    await goals.save(
      makeGoal({
        id: 'c2',
        type: 'TARGET',
        weekdays: [],
        targetValue: 10,
        parentId: 'umb',
      }),
    );
    // archived child — ignored
    await goals.save(
      makeGoal({
        id: 'c3',
        type: 'TARGET',
        weekdays: [],
        targetValue: 10,
        parentId: 'umb',
        status: 'ARCHIVED',
        archivedAt: new Date(),
      }),
    );

    const p = await useCase.execute({
      goalId: 'umb',
      userId: USER,
      reference: REFERENCE,
    });

    expect(p.type).toBe('UMBRELLA');
    expect(p.target).toBe(2); // active children
    expect(p.done).toBe(1); // completed children
    expect(p.ratio).toBeCloseTo(0.5, 5);
    expect(p.children).toHaveLength(2);
  });

  it('completed=true when completedAt is set even if ratio < 1', async () => {
    await goals.save(
      makeGoal({
        id: 't',
        type: 'TARGET',
        weekdays: [],
        targetValue: 100,
        completedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );
    await events.save(doneEvent('t', '2026-06-02T10:00:00.000Z', 10));

    const p = await useCase.execute({ goalId: 't', userId: USER });
    expect(p.ratio).toBeCloseTo(0.1, 5);
    expect(p.completed).toBe(true);
  });

  it('goal with no events → done 0', async () => {
    await goals.save(makeGoal({ id: 'h', type: 'HABIT', weekdays: [1, 3, 5] }));
    const p = await useCase.execute({
      goalId: 'h',
      userId: USER,
      reference: REFERENCE,
    });
    expect(p.done).toBe(0);
    expect(p.ratio).toBe(0);
  });

  it('respects timezone near midnight (Sun 23:00 local still in the week)', async () => {
    await goals.save(makeGoal({ id: 'hz', type: 'HABIT', weekdays: [0] }));
    // 2026-06-08T02:00Z = Sun 2026-06-07 23:00 in São Paulo → inside the week.
    await events.save(doneEvent('hz', '2026-06-08T02:00:00.000Z'));

    const p = await useCase.execute({
      goalId: 'hz',
      userId: USER,
      reference: REFERENCE,
    });
    expect(p.done).toBe(1);
    expect(p.target).toBe(1);
  });

  it('janela semanal começa no recapWeekday do Settings (0 = domingo)', async () => {
    settings.set(USER, { timezone: TZ, reviewWeekday: 1, recapWeekday: 0 });
    await goals.save(makeGoal({ id: 'hs', type: 'HABIT', weekdays: [0, 3] }));
    // Domingo 2026-05-31 12:00 local: DENTRO da semana dom–sáb (31/05–06/06),
    // mas FORA de uma semana seg–dom — garante que a noção fixa "segunda" morreu.
    await events.save(doneEvent('hs', '2026-05-31T15:00:00.000Z'));

    const p = await useCase.execute({
      goalId: 'hs',
      userId: USER,
      reference: REFERENCE,
    });

    expect(p.done).toBe(1);
    expect(p.target).toBe(2);
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

  it('falls back to default timezone when settings missing', async () => {
    const noSettings = new ComputeGoalProgress(
      goals,
      events,
      new SettingsReaderFake(),
    );
    await goals.save(
      makeGoal({ id: 't', type: 'TARGET', weekdays: [], targetValue: 10 }),
    );
    await events.save(doneEvent('t', '2026-06-02T10:00:00.000Z', 5));

    const p = await noSettings.execute({ goalId: 't', userId: USER });
    expect(p.done).toBe(5);
  });
});
