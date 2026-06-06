import {
  GoalHasChildrenError,
  GoalHasDoneHistoryError,
  GoalNotArchivedError,
  GoalNotFoundError,
} from '../domain/errors.js';
import type { Goal } from '../domain/goal.js';
import type { EventRepository } from './ports/event-repository.js';
import type { GoalRepository } from './ports/goal-repository.js';

export interface DeleteGoalInput {
  id: string;
  userId: string; // dono; senão GoalNotFoundError (não vaza)
}

/**
 * Hard delete de um objetivo arquivado que NUNCA foi feito (sem evento `done`). Eventos `skip`
 * remanescentes são apagados junto — o objetivo nunca aconteceu, não há histórico a preservar.
 * Objetivo com `done` permanece arquivado (Event = log imutável). Devolve o snapshot excluído.
 */
export class DeleteGoal {
  constructor(
    private goals: GoalRepository,
    private events: EventRepository,
  ) {}

  async execute(input: DeleteGoalInput): Promise<Goal> {
    const existing = await this.goals.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new GoalNotFoundError(input.id);
    }

    if (existing.status !== 'ARCHIVED') {
      throw new GoalNotArchivedError(input.id);
    }

    const children = await this.goals.find({
      userId: input.userId,
      parentId: input.id,
    });
    if (children.length > 0) {
      throw new GoalHasChildrenError(children.length);
    }

    const doneEvents = await this.events.find({
      userId: input.userId,
      goalId: input.id,
      type: 'done',
    });
    if (doneEvents.length > 0) {
      throw new GoalHasDoneHistoryError(input.id);
    }

    // Sem histórico de 'done': apaga os eventos remanescentes (skips) e o objetivo.
    const remaining = await this.events.find({
      userId: input.userId,
      goalId: input.id,
    });
    for (const event of remaining) {
      await this.events.delete(event.id);
    }

    await this.goals.delete(input.id);
    return existing;
  }
}
