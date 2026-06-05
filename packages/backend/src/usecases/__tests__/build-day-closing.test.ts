import { beforeEach, describe, expect, it } from 'vitest';

import type { Event } from '../../domain/event.js';
import type { Goal } from '../../domain/goal.js';
import { EventRepositoryFake } from '../_fakes/event-repository-fake.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { SettingsReaderFake } from '../_fakes/settings-reader-fake.js';
import { BuildDayClosing } from '../build-day-closing.js';

const USER = 'user-1';
const TZ = 'America/Sao_Paulo';
// Quarta-feira (weekday 3); semana seg–dom local = 2026-06-01 .. 2026-06-07.
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

function event(
  goalId: string,
  type: 'done' | 'skip',
  occurredAt: string,
): Event {
  return {
    id: `${goalId}-${type}-${occurredAt}`,
    userId: USER,
    goalId,
    type,
    value: null,
    reason: type === 'skip' ? 'motivo' : null,
    occurredAt: new Date(occurredAt),
    createdAt: new Date(occurredAt),
  };
}

describe('BuildDayClosing', () => {
  let goals: GoalRepositoryFake;
  let events: EventRepositoryFake;
  let settings: SettingsReaderFake;
  let useCase: BuildDayClosing;

  beforeEach(() => {
    goals = new GoalRepositoryFake();
    events = new EventRepositoryFake();
    settings = new SettingsReaderFake();
    settings.set(USER, { timezone: TZ, reviewWeekday: 1 });
    useCase = new BuildDayClosing(goals, events, settings);
  });

  async function run() {
    return useCase.execute({ userId: USER, reference: REFERENCE });
  }

  it('weekdays scheduled today and unresolved → scheduled', async () => {
    await goals.save(makeGoal({ id: 'w', title: 'Ler', weekdays: [3] }));

    const result = await run();
    expect(result.date).toBe('2026-06-03');
    expect(result.pending).toHaveLength(1);
    expect(result.pending[0]).toMatchObject({
      goalId: 'w',
      kind: 'scheduled',
      title: 'Ler',
    });
  });

  it('weekdays resolved today (done) → not pending', async () => {
    await goals.save(makeGoal({ id: 'w', weekdays: [3] }));
    await events.save(event('w', 'done', '2026-06-03T12:00:00.000Z'));

    expect((await run()).pending).toHaveLength(0);
  });

  it('weekdays resolved today (skip) → not pending', async () => {
    await goals.save(makeGoal({ id: 'w', weekdays: [3] }));
    await events.save(event('w', 'skip', '2026-06-03T12:00:00.000Z'));

    expect((await run()).pending).toHaveLength(0);
  });

  it('weekdays not scheduled today → not pending', async () => {
    await goals.save(makeGoal({ id: 'w', weekdays: [1] })); // Monday only

    expect((await run()).pending).toHaveLength(0);
  });

  it('period with open window and nothing today → invitation', async () => {
    await goals.save(
      makeGoal({ id: 'p', title: 'Treino', period: 'week', timesPerPeriod: 3 }),
    );
    await events.save(event('p', 'done', '2026-06-01T15:00:00.000Z')); // Mon, this week

    const result = await run();
    expect(result.pending).toHaveLength(1);
    expect(result.pending[0]).toMatchObject({
      goalId: 'p',
      kind: 'invitation',
      periodTarget: 3,
      periodDone: 1,
    });
  });

  it('period already met in the window → not pending', async () => {
    await goals.save(makeGoal({ id: 'p', period: 'week', timesPerPeriod: 3 }));
    await events.save(event('p', 'done', '2026-06-01T15:00:00.000Z'));
    await events.save(event('p', 'done', '2026-06-02T15:00:00.000Z'));
    await events.save(event('p', 'done', '2026-06-04T15:00:00.000Z'));

    expect((await run()).pending).toHaveLength(0);
  });

  it('period with an event today → not pending', async () => {
    await goals.save(makeGoal({ id: 'p', period: 'week', timesPerPeriod: 3 }));
    await events.save(event('p', 'done', '2026-06-03T12:00:00.000Z'));

    expect((await run()).pending).toHaveLength(0);
  });

  it('completed goal → not pending', async () => {
    await goals.save(
      makeGoal({
        id: 'w',
        weekdays: [3],
        completedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );

    expect((await run()).pending).toHaveLength(0);
  });

  it('does not include goals from another user', async () => {
    await goals.save(makeGoal({ id: 'w', userId: 'other', weekdays: [3] }));

    expect((await run()).pending).toHaveLength(0);
  });

  it('orders scheduled before invitation, then by title', async () => {
    await goals.save(
      makeGoal({ id: 'inv', title: 'Aaa', period: 'week', timesPerPeriod: 3 }),
    );
    await goals.save(makeGoal({ id: 'sched', title: 'Zzz', weekdays: [3] }));

    const result = await run();
    expect(result.pending.map((p) => p.goalId)).toEqual(['sched', 'inv']);
  });
});
