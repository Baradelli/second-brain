import type { NoteType } from '@cerebro/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Event } from '../../domain/event.js';
import type { Goal } from '../../domain/goal.js';
import type { Note } from '../../domain/note.js';
import { EventRepositoryFake } from '../_fakes/event-repository-fake.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { SettingsReaderFake } from '../_fakes/settings-reader-fake.js';
import { BuildDayDetail } from '../build-day-detail.js';

const USER = 'user-1';
const TZ = 'America/Sao_Paulo';
const DATE = '2026-06-03'; // quarta-feira (weekday 3)

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
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
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

function makeNote(
  id: string,
  type: NoteType,
  date: string,
  overrides: Partial<Note> = {},
): Note {
  return {
    id,
    userId: USER,
    type,
    scope: 'DAY',
    date: new Date(date),
    title: undefined,
    doc: {},
    plainText: '',
    labelIds: [],
    status: 'ACTIVE',
    createdAt: new Date(date),
    ...overrides,
  };
}

describe('BuildDayDetail', () => {
  let goals: GoalRepositoryFake;
  let events: EventRepositoryFake;
  let notes: NoteRepositoryFake;
  let settings: SettingsReaderFake;
  let useCase: BuildDayDetail;

  beforeEach(() => {
    goals = new GoalRepositoryFake();
    events = new EventRepositoryFake();
    notes = new NoteRepositoryFake();
    settings = new SettingsReaderFake();
    settings.set(USER, { timezone: TZ, reviewWeekday: 1 });
    useCase = new BuildDayDetail(goals, events, notes, settings);
  });

  async function run() {
    return useCase.execute({ userId: USER, date: DATE });
  }

  it('returns a scheduled goal with no event as pending', async () => {
    await goals.save(makeGoal({ id: 'w', title: 'Ler', weekdays: [3] }));

    const result = await run();
    expect(result.date).toBe(DATE);
    expect(result.goals).toEqual([
      { goalId: 'w', title: 'Ler', kind: 'scheduled', status: 'pending' },
    ]);
  });

  it('marks a goal done when there is a done event that day', async () => {
    await goals.save(makeGoal({ id: 'w', weekdays: [3] }));
    await events.save(event('w', 'done', '2026-06-03T12:00:00.000Z'));

    expect((await run()).goals[0]?.status).toBe('done');
  });

  it('marks a goal skipped when there is a skip event that day', async () => {
    await goals.save(makeGoal({ id: 'w', weekdays: [3] }));
    await events.save(event('w', 'skip', '2026-06-03T12:00:00.000Z'));

    expect((await run()).goals[0]?.status).toBe('skipped');
  });

  it('orders scheduled before invitation, then by title', async () => {
    await goals.save(
      makeGoal({ id: 'inv', title: 'Aaa', period: 'week', timesPerPeriod: 3 }),
    );
    await goals.save(makeGoal({ id: 'sched', title: 'Zzz', weekdays: [3] }));

    const result = await run();
    expect(result.goals.map((g) => g.goalId)).toEqual(['sched', 'inv']);
    expect(result.goals[1]).toMatchObject({ kind: 'invitation' });
  });

  it('lists the notes written that day, newest first', async () => {
    await notes.save(
      makeNote('n1', 'REFLECTION', '2026-06-03T08:00:00.000Z', {
        title: 'Manhã',
      }),
    );
    await notes.save(
      makeNote('n2', 'NOTE', '2026-06-03T20:00:00.000Z', { title: 'Noite' }),
    );

    const result = await run();
    expect(result.notes.map((n) => n.id)).toEqual(['n2', 'n1']);
    expect(result.notes[0]).toMatchObject({ type: 'NOTE', title: 'Noite' });
  });

  it('ignores notes from another day, archived, or another user', async () => {
    await notes.save(makeNote('other-day', 'NOTE', '2026-06-04T10:00:00.000Z'));
    await notes.save(
      makeNote('archived', 'NOTE', '2026-06-03T10:00:00.000Z', {
        status: 'ARCHIVED',
        archivedAt: new Date('2026-06-03T11:00:00.000Z'),
      }),
    );
    await notes.save(
      makeNote('other-user', 'NOTE', '2026-06-03T10:00:00.000Z', {
        userId: 'other',
      }),
    );

    expect((await run()).notes).toHaveLength(0);
  });

  it('isolates goals/events from another user', async () => {
    await goals.save(makeGoal({ id: 'w', userId: 'other', weekdays: [3] }));
    expect((await run()).goals).toHaveLength(0);
  });

  it('falls back to America/Sao_Paulo when user has no settings', async () => {
    const noSettings = new BuildDayDetail(
      goals,
      events,
      notes,
      new SettingsReaderFake(),
    );
    await goals.save(makeGoal({ id: 'w', weekdays: [3] }));
    expect(
      (await noSettings.execute({ userId: USER, date: DATE })).goals,
    ).toHaveLength(1);
  });
});
