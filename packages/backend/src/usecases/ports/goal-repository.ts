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
  find(filter: GoalFilter): Promise<Goal[]>;
  update(id: string, patch: Partial<Goal>): Promise<Goal>;
  delete(id: string): Promise<void>; // hard delete — só objetivos sem histórico de 'done'
}
