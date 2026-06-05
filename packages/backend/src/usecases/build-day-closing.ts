import type { NoteScope } from '@cerebro/shared';
import { DateTime } from 'luxon';

import { dayRange } from '../domain/day-range.js';
import type { Goal, GoalPeriod } from '../domain/goal.js';
import { localWeekday } from '../domain/local-weekday.js';
import type { EventRepository } from './ports/event-repository.js';
import type { GoalRepository } from './ports/goal-repository.js';
import type { SettingsReader } from './ports/settings-reader.js';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

const PERIOD_TO_SCOPE: Record<GoalPeriod, NoteScope> = {
  day: 'DAY',
  week: 'WEEK',
  month: 'MONTH',
};

export interface BuildDayClosingInput {
  userId: string;
  reference: Date;
}

export type DayClosingKind = 'scheduled' | 'invitation';

export interface DayClosingItem {
  goalId: string;
  title: string;
  type: 'HABIT';
  kind: DayClosingKind;
  periodTarget?: number;
  periodDone?: number;
}

export interface DayClosing {
  date: string; // YYYY-MM-DD (dia local)
  pending: DayClosingItem[];
}

export class BuildDayClosing {
  constructor(
    private goals: GoalRepository,
    private events: EventRepository,
    private settings: SettingsReader,
  ) {}

  async execute(input: BuildDayClosingInput): Promise<DayClosing> {
    const userSettings = await this.settings.getByUserId(input.userId);
    const timezone = userSettings?.timezone ?? DEFAULT_TIMEZONE;
    const reference = input.reference;

    const date = DateTime.fromJSDate(reference, { zone: timezone }).toFormat(
      'yyyy-MM-dd',
    );
    const day = dayRange(reference, timezone, 'DAY');
    const todayWeekday = localWeekday(reference, timezone);

    const habits = (
      await this.goals.find({
        userId: input.userId,
        status: 'ACTIVE',
        type: 'HABIT',
      })
    ).filter((g) => g.completedAt == null);

    const pending: DayClosingItem[] = [];

    for (const goal of habits) {
      const resolvedToday =
        (
          await this.events.find({
            userId: input.userId,
            goalId: goal.id,
            from: day.from,
            to: day.to,
          })
        ).length > 0;
      if (resolvedToday) continue;

      const item = await this.classify(goal, reference, timezone, todayWeekday);
      if (item) pending.push(item);
    }

    pending.sort(byKindThenTitle);
    return { date, pending };
  }

  private async classify(
    goal: Goal,
    reference: Date,
    timezone: string,
    todayWeekday: number,
  ): Promise<DayClosingItem | null> {
    const usesWeekdays = goal.weekdays.length > 0;

    if (usesWeekdays) {
      if (!goal.weekdays.includes(todayWeekday)) return null;
      return {
        goalId: goal.id,
        title: goal.title,
        type: 'HABIT',
        kind: 'scheduled',
      };
    }

    // period + timesPerPeriod
    if (goal.period == null || goal.timesPerPeriod == null) return null;
    const period = dayRange(reference, timezone, PERIOD_TO_SCOPE[goal.period]);
    const periodDone = (
      await this.events.find({
        userId: goal.userId,
        goalId: goal.id,
        type: 'done',
        from: period.from,
        to: period.to,
      })
    ).length;

    if (periodDone >= goal.timesPerPeriod) return null;
    return {
      goalId: goal.id,
      title: goal.title,
      type: 'HABIT',
      kind: 'invitation',
      periodTarget: goal.timesPerPeriod,
      periodDone,
    };
  }
}

const KIND_ORDER: Record<DayClosingKind, number> = {
  scheduled: 0,
  invitation: 1,
};

function byKindThenTitle(a: DayClosingItem, b: DayClosingItem): number {
  const k = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  return k !== 0 ? k : a.title.localeCompare(b.title);
}
