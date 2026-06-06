import { GoalNotFoundError } from '../domain/errors.js';
import type { Goal } from '../domain/goal.js';
import type { GoalRepository } from './ports/goal-repository.js';

export interface UnarchiveGoalInput {
  id: string;
  userId: string; // dono; senão GoalNotFoundError
}

/** Restaura um objetivo arquivado: volta a ACTIVE e limpa `archivedAt`. Idempotente. */
export class UnarchiveGoal {
  constructor(private repo: GoalRepository) {}

  async execute(input: UnarchiveGoalInput): Promise<Goal> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new GoalNotFoundError(input.id);
    }

    return this.repo.update(input.id, { status: 'ACTIVE', archivedAt: null });
  }
}
