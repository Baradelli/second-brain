import { randomUUID } from 'node:crypto';

import { InvalidGoalError } from '../domain/errors.js';
import {
  GOAL_PERIODS,
  GOAL_TYPES,
  type Goal,
  type GoalPeriod,
  type GoalType,
} from '../domain/goal.js';
import type { GoalRepository } from './ports/goal-repository.js';

export interface CreateGoalInput {
  userId: string;
  title: string;
  type: GoalType;
  description?: string | null;
  targetValue?: number | null;
  unit?: string | null;
  period?: GoalPeriod | null;
  timesPerPeriod?: number | null;
  weekdays?: number[];
  startAt?: Date | null;
  dueAt?: Date | null;
  parentId?: string | null;
  labelIds?: string[];
}

export class CreateGoal {
  constructor(private repo: GoalRepository) {}

  async execute(input: CreateGoalInput): Promise<Goal> {
    if (!GOAL_TYPES.includes(input.type)) {
      throw new InvalidGoalError(`unknown type '${input.type}'`);
    }

    const title = input.title?.trim() ?? '';
    if (title.length === 0) {
      throw new InvalidGoalError('title must not be empty');
    }

    const weekdays = input.weekdays ?? [];
    const hasWeekdays = weekdays.length > 0;
    const hasPeriod =
      input.period != null || input.timesPerPeriod != null;

    this.validateCadence(input.type, weekdays, hasWeekdays, hasPeriod, input);
    this.validateMeasure(input.type, input.targetValue, input.unit);
    await this.validateParent(input);

    const goal: Goal = {
      id: randomUUID(),
      userId: input.userId,
      title,
      description: input.description ?? null,
      type: input.type,
      parentId: input.parentId ?? null,
      targetValue: input.targetValue ?? null,
      unit: input.unit ?? null,
      period: input.period ?? null,
      timesPerPeriod: input.timesPerPeriod ?? null,
      weekdays,
      startAt: input.startAt ?? null,
      dueAt: input.dueAt ?? null,
      completedAt: null,
      status: 'ACTIVE',
      archivedAt: null,
      createdAt: new Date(),
      labelIds: input.labelIds ?? [],
    };

    return this.repo.save(goal);
  }

  private validateCadence(
    type: GoalType,
    weekdays: number[],
    hasWeekdays: boolean,
    hasPeriod: boolean,
    input: CreateGoalInput,
  ): void {
    if (type === 'HABIT') {
      if (hasWeekdays && hasPeriod) {
        throw new InvalidGoalError(
          'HABIT must use exactly one cadence: weekdays OR period+timesPerPeriod',
        );
      }
      if (!hasWeekdays && !hasPeriod) {
        throw new InvalidGoalError('HABIT requires a cadence');
      }
      if (hasWeekdays) {
        for (const d of weekdays) {
          if (!Number.isInteger(d) || d < 0 || d > 6) {
            throw new InvalidGoalError(`weekday out of range 0..6: ${d}`);
          }
        }
        if (new Set(weekdays).size !== weekdays.length) {
          throw new InvalidGoalError('weekdays must not repeat');
        }
      }
      if (hasPeriod) {
        if (input.period == null || input.timesPerPeriod == null) {
          throw new InvalidGoalError(
            'period and timesPerPeriod must be provided together',
          );
        }
        if (!GOAL_PERIODS.includes(input.period)) {
          throw new InvalidGoalError(`unknown period '${input.period}'`);
        }
        if (
          !Number.isInteger(input.timesPerPeriod) ||
          input.timesPerPeriod < 1
        ) {
          throw new InvalidGoalError('timesPerPeriod must be an integer >= 1');
        }
      }
      return;
    }

    // Non-HABIT: cadence fields must be absent.
    if (hasWeekdays || hasPeriod) {
      throw new InvalidGoalError(`cadence is only valid for HABIT, not ${type}`);
    }
  }

  private validateMeasure(
    type: GoalType,
    targetValue: number | null | undefined,
    unit: string | null | undefined,
  ): void {
    const isMeasurable = type === 'TARGET' || type === 'PROJECT';
    if (!isMeasurable) {
      if (targetValue != null || unit != null) {
        throw new InvalidGoalError(
          `targetValue/unit are only valid for TARGET/PROJECT, not ${type}`,
        );
      }
      return;
    }
    if (targetValue != null && !(targetValue > 0)) {
      throw new InvalidGoalError('targetValue must be > 0');
    }
  }

  private async validateParent(input: CreateGoalInput): Promise<void> {
    if (input.parentId == null) return;

    if (input.type === 'UMBRELLA') {
      throw new InvalidGoalError('UMBRELLA cannot have a parent');
    }

    const parent = await this.repo.byId(input.parentId);
    if (
      !parent ||
      parent.userId !== input.userId ||
      parent.type !== 'UMBRELLA'
    ) {
      throw new InvalidGoalError('parent must be an existing UMBRELLA you own');
    }
  }
}
