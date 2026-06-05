import { randomUUID } from 'node:crypto';

import { GoalNotFoundError, InvalidCheckError } from '../domain/errors.js';
import type { Event } from '../domain/event.js';
import type { EventRepository } from './ports/event-repository.js';
import type { GoalRepository } from './ports/goal-repository.js';

export interface SkipGoalInput {
  goalId: string;
  userId: string; // dono; senão GoalNotFoundError (não vaza)
  reason: string; // OBRIGATÓRIO, não-vazio (trim)
  occurredAt?: Date; // default: now
}

export class SkipGoal {
  constructor(
    private goals: GoalRepository,
    private events: EventRepository,
  ) {}

  async execute(input: SkipGoalInput): Promise<Event> {
    const goal = await this.goals.byId(input.goalId);
    if (!goal || goal.userId !== input.userId) {
      throw new GoalNotFoundError(input.goalId);
    }
    if (goal.status === 'ARCHIVED') {
      throw new InvalidCheckError('cannot skip an archived goal');
    }
    if (goal.type === 'UMBRELLA') {
      throw new InvalidCheckError('UMBRELLA cannot be skipped directly');
    }

    const reason = input.reason?.trim() ?? '';
    if (reason.length === 0) {
      throw new InvalidCheckError('skip requires a reason');
    }

    const event: Event = {
      id: randomUUID(),
      userId: input.userId,
      goalId: input.goalId,
      type: 'skip',
      value: null,
      reason,
      occurredAt: input.occurredAt ?? new Date(),
      createdAt: new Date(),
    };

    return this.events.save(event);
  }
}
