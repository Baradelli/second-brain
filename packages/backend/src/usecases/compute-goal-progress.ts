import type { NoteScope } from '@cerebro/shared';

import { type DateRange, dayRange } from '../domain/day-range.js';
import { countDistinctDays } from '../domain/distinct-days.js';
import { GoalNotFoundError } from '../domain/errors.js';
import type { Event } from '../domain/event.js';
import type { Goal, GoalPeriod, GoalType } from '../domain/goal.js';
import type { EventRepository } from './ports/event-repository.js';
import type { GoalRepository } from './ports/goal-repository.js';
import type { SettingsReader } from './ports/settings-reader.js';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

const PERIOD_TO_SCOPE: Record<GoalPeriod, NoteScope> = {
  day: 'DAY',
  week: 'WEEK',
  month: 'MONTH',
};

export interface ComputeGoalProgressInput {
  goalId: string;
  userId: string;
  reference?: Date; // "agora" para definir o período corrente (default: now)
}

export interface GoalProgress {
  goalId: string;
  type: GoalType;
  done: number;
  target: number | null;
  ratio: number | null; // done/target, clampado [0,1]; null quando target null/0
  period: DateRange | null; // HABIT: janela; demais: null
  completed: boolean;
  doneToday: boolean; // existe um done HOJE (fuso do usuário)?
  todayEventId: string | null; // id do done de hoje mais recente (para desfazer)
  children?: GoalProgress[]; // só UMBRELLA
}

/** A partir dos eventos já carregados, descobre se há um `done` hoje e qual o id (mais recente). */
function todayDone(
  events: Event[],
  timezone: string,
  reference: Date,
): { doneToday: boolean; todayEventId: string | null } {
  const day = dayRange(reference, timezone, 'DAY');
  const todays = events.filter(
    (e) =>
      e.type === 'done' &&
      e.occurredAt >= day.from &&
      e.occurredAt <= day.to,
  );
  if (todays.length === 0) return { doneToday: false, todayEventId: null };
  const latest = todays.reduce((a, b) =>
    a.occurredAt >= b.occurredAt ? a : b,
  );
  return { doneToday: true, todayEventId: latest.id };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export class ComputeGoalProgress {
  constructor(
    private goals: GoalRepository,
    private events: EventRepository,
    private settings: SettingsReader,
  ) {}

  async execute(input: ComputeGoalProgressInput): Promise<GoalProgress> {
    const goal = await this.goals.byId(input.goalId);
    if (!goal || goal.userId !== input.userId) {
      throw new GoalNotFoundError(input.goalId);
    }

    const userSettings = await this.settings.getByUserId(input.userId);
    const timezone = userSettings?.timezone ?? DEFAULT_TIMEZONE;
    const reference = input.reference ?? new Date();

    return this.computeFor(goal, timezone, reference);
  }

  private async computeFor(
    goal: Goal,
    timezone: string,
    reference: Date,
  ): Promise<GoalProgress> {
    if (goal.type === 'UMBRELLA') {
      return this.computeUmbrella(goal, timezone, reference);
    }
    if (goal.type === 'HABIT') {
      return this.computeHabit(goal, timezone, reference);
    }
    return this.computeMeasurable(goal, timezone, reference); // TARGET / PROJECT
  }

  private async computeHabit(
    goal: Goal,
    timezone: string,
    reference: Date,
  ): Promise<GoalProgress> {
    const usesWeekdays = goal.weekdays.length > 0;
    const scope: NoteScope = usesWeekdays
      ? 'WEEK'
      : PERIOD_TO_SCOPE[goal.period ?? 'day'];
    const period = dayRange(reference, timezone, scope);

    const events = await this.events.find({
      userId: goal.userId,
      goalId: goal.id,
      type: 'done',
      from: period.from,
      to: period.to,
    });

    const target = usesWeekdays
      ? goal.weekdays.length
      : (goal.timesPerPeriod ?? 0);
    const done = usesWeekdays
      ? countDistinctDays(
          events.map((e) => e.occurredAt),
          timezone,
        )
      : events.length;

    const ratio = target > 0 ? clamp01(done / target) : null;
    return {
      goalId: goal.id,
      type: goal.type,
      done,
      target,
      ratio,
      period,
      completed: this.isCompleted(goal, ratio),
      ...todayDone(events, timezone, reference),
    };
  }

  private async computeMeasurable(
    goal: Goal,
    timezone: string,
    reference: Date,
  ): Promise<GoalProgress> {
    const events = await this.events.find({
      userId: goal.userId,
      goalId: goal.id,
      type: 'done',
    });
    const done = events.reduce((sum, e) => sum + (e.value ?? 0), 0);
    const target = goal.targetValue;
    const ratio = target && target > 0 ? clamp01(done / target) : null;

    return {
      goalId: goal.id,
      type: goal.type,
      done,
      target,
      ratio,
      period: null,
      completed: this.isCompleted(goal, ratio),
      ...todayDone(events, timezone, reference),
    };
  }

  private async computeUmbrella(
    goal: Goal,
    timezone: string,
    reference: Date,
  ): Promise<GoalProgress> {
    const children = await this.goals.find({
      userId: goal.userId,
      parentId: goal.id,
      status: 'ACTIVE',
    });
    const childProgresses = await Promise.all(
      children.map((child) => this.computeFor(child, timezone, reference)),
    );

    const target = childProgresses.length;
    const done = childProgresses.filter((c) => c.completed).length;
    const ratio = target > 0 ? done / target : null;

    return {
      goalId: goal.id,
      type: goal.type,
      done,
      target,
      ratio,
      period: null,
      completed: goal.completedAt != null, // UMBRELLA fecha na mão
      doneToday: false, // UMBRELLA não tem evento próprio
      todayEventId: null,
      children: childProgresses,
    };
  }

  private isCompleted(goal: Goal, ratio: number | null): boolean {
    return goal.completedAt != null || (ratio != null && ratio >= 1);
  }
}
