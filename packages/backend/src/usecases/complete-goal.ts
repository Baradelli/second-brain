import { GoalNotFoundError, InvalidGoalError } from '../domain/errors.js';
import type { Goal } from '../domain/goal.js';
import type { GoalRepository } from './ports/goal-repository.js';

export interface CompleteGoalInput {
  id: string;
  userId: string; // dono; senão GoalNotFoundError (não vaza existência)
  completedAt?: Date; // default: now
}

export class CompleteGoal {
  constructor(private repo: GoalRepository) {}

  async execute(input: CompleteGoalInput): Promise<Goal> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new GoalNotFoundError(input.id);
    }
    if (existing.status === 'ARCHIVED') {
      throw new InvalidGoalError('cannot complete an archived goal');
    }

    // Vale para qualquer type, incl. UMBRELLA (fecha na mão). Não cria Event,
    // não mexe em status. Re-completar é idempotente (atualiza completedAt).
    return this.repo.update(input.id, {
      completedAt: input.completedAt ?? new Date(),
    });
  }
}
