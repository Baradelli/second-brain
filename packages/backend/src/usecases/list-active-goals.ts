import type { Goal, GoalType } from '../domain/goal.js';
import type { GoalRepository } from './ports/goal-repository.js';

export interface ListActiveGoalsInput {
  userId: string;
  type?: GoalType;
  parentId?: string;
}

export class ListActiveGoals {
  constructor(private repo: GoalRepository) {}

  async execute(input: ListActiveGoalsInput): Promise<Goal[]> {
    return this.repo.find({
      userId: input.userId,
      status: 'ACTIVE',
      ...(input.type ? { type: input.type } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    });
  }
}
