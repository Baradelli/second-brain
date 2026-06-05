import { randomUUID } from 'node:crypto';

import { InvalidGoalError } from '../domain/errors.js';
import {
  type Goal,
  GOAL_TYPES,
  type GoalPeriod,
  type GoalType,
} from '../domain/goal.js';
import { validateGoalCadenceAndMeasure } from '../domain/goal-rules.js';
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

    validateGoalCadenceAndMeasure({
      type: input.type,
      weekdays,
      period: input.period ?? null,
      timesPerPeriod: input.timesPerPeriod ?? null,
      targetValue: input.targetValue ?? null,
      unit: input.unit ?? null,
    });

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
