import { randomUUID } from 'node:crypto';

import { GoalNotFoundError, InvalidCheckError } from '../domain/errors.js';
import type { Event } from '../domain/event.js';
import type { EventRepository } from './ports/event-repository.js';
import type { GoalRepository } from './ports/goal-repository.js';

export interface CheckGoalInput {
  goalId: string;
  userId: string; // dono; senão GoalNotFoundError (não vaza)
  value?: number | null; // TARGET/PROJECT: quanto somou neste check
  occurredAt?: Date; // default: now
}

export class CheckGoal {
  constructor(
    private goals: GoalRepository,
    private events: EventRepository,
  ) {}

  async execute(input: CheckGoalInput): Promise<Event> {
    const goal = await this.goals.byId(input.goalId);
    if (!goal || goal.userId !== input.userId) {
      throw new GoalNotFoundError(input.goalId);
    }
    if (goal.status === 'ARCHIVED') {
      throw new InvalidCheckError('cannot check an archived goal');
    }
    if (goal.type === 'UMBRELLA') {
      throw new InvalidCheckError('UMBRELLA cannot be checked directly');
    }

    let value: number | null;
    if (goal.type === 'HABIT') {
      if (input.value != null) {
        throw new InvalidCheckError('HABIT check must not carry a value');
      }
      value = null;
    } else {
      // TARGET / PROJECT
      if (input.value == null || !(input.value > 0)) {
        throw new InvalidCheckError(
          'TARGET/PROJECT check requires a value > 0',
        );
      }
      value = input.value;
    }

    const event: Event = {
      id: randomUUID(),
      userId: input.userId,
      goalId: input.goalId,
      type: 'done',
      value,
      reason: null,
      occurredAt: input.occurredAt ?? new Date(),
      createdAt: new Date(),
    };

    return this.events.save(event);
  }
}
