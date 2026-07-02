import type { NoteScope } from '@cerebro/shared';

import { dayRange } from '../domain/day-range.js';
import type { Goal, GoalPeriod } from '../domain/goal.js';
import { localWeekday } from '../domain/local-weekday.js';
import type { EventRepository } from './ports/event-repository.js';
import type { GoalRepository } from './ports/goal-repository.js';

const PERIOD_TO_SCOPE: Record<GoalPeriod, NoteScope> = {
  day: 'DAY',
  week: 'WEEK',
  month: 'MONTH',
};

export type TodaysGoalKind = 'scheduled' | 'invitation';

export interface TodaysGoalItem {
  goalId: string;
  title: string;
  kind: TodaysGoalKind;
  resolvedToday: boolean; // já tem done/skip hoje?
  periodTarget?: number;
  periodDone?: number;
}

export interface SelectTodaysGoalsInput {
  userId: string;
  reference: Date;
  timezone: string; // já resolvido pelo chamador (fallback único do domínio)
  weekStartsOn?: number; // recapWeekday do usuário (default: domínio)
}

/**
 * Seleção única de "objetivos do dia" (HABIT): agendados de hoje (weekdays) + convites de
 * período aberto. Marca `resolvedToday`. Regra compartilhada por buildDayClosing (filtra
 * pendentes) e buildTodayAgenda (mostra todos com a flag). NÃO resolve timezone nem ordena.
 */
export class SelectTodaysGoals {
  constructor(
    private goals: GoalRepository,
    private events: EventRepository,
  ) {}

  async execute(input: SelectTodaysGoalsInput): Promise<TodaysGoalItem[]> {
    const day = dayRange(input.reference, input.timezone, 'DAY');
    const todayWeekday = localWeekday(input.reference, input.timezone);

    const habits = (
      await this.goals.find({
        userId: input.userId,
        status: 'ACTIVE',
        type: 'HABIT',
      })
    ).filter((g) => g.completedAt == null);

    const items: TodaysGoalItem[] = [];
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

      const item = await this.classify(
        goal,
        input.reference,
        input.timezone,
        todayWeekday,
        resolvedToday,
        input.weekStartsOn,
      );
      if (item) items.push(item);
    }
    return items;
  }

  private async classify(
    goal: Goal,
    reference: Date,
    timezone: string,
    todayWeekday: number,
    resolvedToday: boolean,
    weekStartsOn: number | undefined,
  ): Promise<TodaysGoalItem | null> {
    if (goal.weekdays.length > 0) {
      if (!goal.weekdays.includes(todayWeekday)) return null;
      return {
        goalId: goal.id,
        title: goal.title,
        kind: 'scheduled',
        resolvedToday,
      };
    }

    if (goal.period == null || goal.timesPerPeriod == null) return null;
    const period = dayRange(
      reference,
      timezone,
      PERIOD_TO_SCOPE[goal.period],
      weekStartsOn,
    );
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
      kind: 'invitation',
      resolvedToday,
      periodTarget: goal.timesPerPeriod,
      periodDone,
    };
  }
}
