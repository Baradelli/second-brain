import type { Goal, GoalType } from '../../domain/goal.js';

export interface GoalFilter {
  userId: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  type?: GoalType;
  parentId?: string;
}

export interface GoalRepository {
  save(goal: Goal): Promise<Goal>;
  byId(id: string): Promise<Goal | null>;
  // find/update chegam na Tarefa 30 (a interface cresce junto com o fake e o Prisma).
}
