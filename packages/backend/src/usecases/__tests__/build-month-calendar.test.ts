import type { NoteType } from '@cerebro/shared';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Event } from '../../domain/event.js';
import type { Goal } from '../../domain/goal.js';
import type { Note } from '../../domain/note.js';
import { EventRepositoryFake } from '../_fakes/event-repository-fake.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { SettingsReaderFake } from '../_fakes/settings-reader-fake.js';
import {
  BuildMonthCalendar,
  type CalendarDay,
} from '../build-month-calendar.js';

const USER = 'user-1';
const TZ = 'America/Sao_Paulo'; // UTC-3
// Junho/2026: dia 1 = segunda (weekday 1), dia 3 = quarta (weekday 3), dia 7 = domingo (0).
// Quartas de junho/2026: 3, 10, 17, 24.

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

function event(goalId: string, occurredAt: string): Event {
  return {
    id: `${goalId}-done-${occurredAt}`,
    userId: USER,
    goalId,
    type: 'done',
    value: null,
    reason: null,
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

describe('BuildMonthCalendar', () => {
  let goals: GoalRepositoryFake;
  let events: EventRepositoryFake;
  let notes: NoteRepositoryFake;
  let settings: SettingsReaderFake;
  let useCase: BuildMonthCalendar;

  beforeEach(() => {
    goals = new GoalRepositoryFake();
    events = new EventRepositoryFake();
    notes = new NoteRepositoryFake();
    settings = new SettingsReaderFake();
    settings.set(USER, { timezone: TZ, reviewWeekday: 1 });
    useCase = new BuildMonthCalendar(goals, events, notes, settings);
  });

  async function june() {
    return useCase.execute({ userId: USER, month: '2026-06' });
  }

  function dayOf(days: CalendarDay[], date: string): CalendarDay {
    const found = days.find((d) => d.date === date);
    if (!found) throw new Error(`day ${date} not found`);
    return found;
  }

  it('covers every day of the month in order', async () => {
    const { month, days } = await june();
    expect(month).toBe('2026-06');
    expect(days).toHaveLength(30);
    expect(days[0]?.date).toBe('2026-06-01');
    expect(days[29]?.date).toBe('2026-06-30');
    // dia vazio
    expect(days[0]).toMatchObject({
      goalsPlanned: 0,
      goalsDone: 0,
      journal: { devotional: false, reflection: false },
    });
  });

  it('counts weekday-scheduled habits as planned only on their weekdays', async () => {
    await goals.save(makeGoal({ id: 'w', weekdays: [3] })); // quartas

    const { days } = await june();
    for (const wed of [
      '2026-06-03',
      '2026-06-10',
      '2026-06-17',
      '2026-06-24',
    ]) {
      expect(dayOf(days, wed).goalsPlanned).toBe(1);
    }
    expect(dayOf(days, '2026-06-04').goalsPlanned).toBe(0);
  });

  it('does NOT count period habits (no weekdays) as planned', async () => {
    await goals.save(makeGoal({ id: 'p', period: 'week', timesPerPeriod: 3 }));
    const { days } = await june();
    expect(days.every((d) => d.goalsPlanned === 0)).toBe(true);
  });

  it('counts a done event in goalsDone on its local day (period habit included)', async () => {
    await goals.save(makeGoal({ id: 'p', period: 'week', timesPerPeriod: 3 }));
    await events.save(event('p', '2026-06-05T15:00:00.000Z'));

    const { days } = await june();
    expect(dayOf(days, '2026-06-05').goalsDone).toBe(1);
    expect(dayOf(days, '2026-06-05').goalsPlanned).toBe(0);
  });

  it('dedupes multiple dones of the same goal on the same day', async () => {
    await goals.save(makeGoal({ id: 'w', weekdays: [3] }));
    await events.save(event('w', '2026-06-03T10:00:00.000Z'));
    await events.save(event('w', '2026-06-03T20:00:00.000Z'));

    expect(
      (await june()).days.find((d) => d.date === '2026-06-03')?.goalsDone,
    ).toBe(1);
  });

  it('counts dones on different days separately', async () => {
    await goals.save(makeGoal({ id: 'w', weekdays: [3] }));
    await events.save(event('w', '2026-06-03T10:00:00.000Z'));
    await events.save(event('w', '2026-06-10T10:00:00.000Z'));

    const { days } = await june();
    expect(dayOf(days, '2026-06-03').goalsDone).toBe(1);
    expect(dayOf(days, '2026-06-10').goalsDone).toBe(1);
  });

  it('does not count planned before startAt', async () => {
    await goals.save(
      makeGoal({
        id: 'w',
        weekdays: [3],
        startAt: new Date('2026-06-15T00:00:00.000Z'),
      }),
    );
    const { days } = await june();
    expect(dayOf(days, '2026-06-03').goalsPlanned).toBe(0);
    expect(dayOf(days, '2026-06-10').goalsPlanned).toBe(0);
    expect(dayOf(days, '2026-06-17').goalsPlanned).toBe(1);
    expect(dayOf(days, '2026-06-24').goalsPlanned).toBe(1);
  });

  it('does not count planned after completedAt', async () => {
    await goals.save(
      makeGoal({
        id: 'w',
        weekdays: [3],
        completedAt: new Date('2026-06-12T00:00:00.000Z'),
      }),
    );
    const { days } = await june();
    expect(dayOf(days, '2026-06-03').goalsPlanned).toBe(1);
    expect(dayOf(days, '2026-06-10').goalsPlanned).toBe(1);
    expect(dayOf(days, '2026-06-17').goalsPlanned).toBe(0);
    expect(dayOf(days, '2026-06-24').goalsPlanned).toBe(0);
  });

  it('marks the journal seals from DEVOTIONAL/REFLECTION notes', async () => {
    await notes.save(makeNote('d', 'DEVOTIONAL', '2026-06-04T12:00:00.000Z'));
    await notes.save(makeNote('r', 'REFLECTION', '2026-06-05T12:00:00.000Z'));

    const { days } = await june();
    expect(dayOf(days, '2026-06-04').journal).toEqual({
      devotional: true,
      reflection: false,
    });
    expect(dayOf(days, '2026-06-05').journal).toEqual({
      devotional: false,
      reflection: true,
    });
    expect(dayOf(days, '2026-06-06').journal).toEqual({
      devotional: false,
      reflection: false,
    });
  });

  it('ignores archived journal notes', async () => {
    await notes.save(
      makeNote('d', 'DEVOTIONAL', '2026-06-04T12:00:00.000Z', {
        status: 'ARCHIVED',
        archivedAt: new Date('2026-06-04T13:00:00.000Z'),
      }),
    );
    expect(
      (await june()).days.find((d) => d.date === '2026-06-04')?.journal
        .devotional,
    ).toBe(false);
  });

  it('places a near-midnight done on the correct local day', async () => {
    await goals.save(makeGoal({ id: 'w', weekdays: [2] })); // terças
    // 02:00Z de 03/06 é 23:00 de 02/06 em SP → conta no dia 02 (terça).
    await events.save(event('w', '2026-06-03T02:00:00.000Z'));

    const { days } = await june();
    expect(dayOf(days, '2026-06-02').goalsDone).toBe(1);
    expect(dayOf(days, '2026-06-03').goalsDone).toBe(0);
  });

  it('uses the month of `reference` when month is omitted', async () => {
    const result = await useCase.execute({
      userId: USER,
      reference: new Date('2026-02-15T12:00:00.000Z'),
    });
    expect(result.month).toBe('2026-02');
    expect(result.days).toHaveLength(28);
  });

  it('isolates data from other users', async () => {
    await goals.save(makeGoal({ id: 'w', userId: 'other', weekdays: [3] }));
    await events.save({
      ...event('w', '2026-06-03T10:00:00.000Z'),
      userId: 'other',
    });
    await notes.save(
      makeNote('d', 'DEVOTIONAL', '2026-06-04T12:00:00.000Z', {
        userId: 'other',
      }),
    );

    const { days } = await june();
    expect(days.every((d) => d.goalsPlanned === 0 && d.goalsDone === 0)).toBe(
      true,
    );
    expect(
      days.every((d) => !d.journal.devotional && !d.journal.reflection),
    ).toBe(true);
  });

  it('falls back to America/Sao_Paulo when user has no settings', async () => {
    const noSettings = new BuildMonthCalendar(
      goals,
      events,
      new NoteRepositoryFake(),
      new SettingsReaderFake(),
    );
    await goals.save(makeGoal({ id: 'w', weekdays: [3] }));
    const { days } = await noSettings.execute({
      userId: USER,
      month: '2026-06',
    });
    expect(dayOf(days, '2026-06-03').goalsPlanned).toBe(1);
  });
});
