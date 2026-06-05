import {
  GoalHasActiveChildrenError,
  GoalNotFoundError,
} from '../domain/errors.js';
import type { Goal } from '../domain/goal.js';
import type { GoalRepository } from './ports/goal-repository.js';

export interface ArchiveGoalInput {
  id: string;
  userId: string; // dono; senão GoalNotFoundError
  archivedAt?: Date; // default: now
}

export class ArchiveGoal {
  constructor(private repo: GoalRepository) {}

  async execute(input: ArchiveGoalInput): Promise<Goal> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new GoalNotFoundError(input.id);
    }

    // Bloqueio genérico: não arquivar enquanto houver filho ATIVO (o dono arquiva
    // os filhos primeiro). Sem cascata — ação destrutiva implícita é evitada.
    const activeChildren = await this.repo.find({
      userId: input.userId,
      parentId: input.id,
      status: 'ACTIVE',
    });
    if (activeChildren.length > 0) {
      throw new GoalHasActiveChildrenError(activeChildren.length);
    }

    return this.repo.update(input.id, {
      status: 'ARCHIVED',
      archivedAt: input.archivedAt ?? new Date(),
    });
  }
}
