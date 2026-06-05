import type { Goal } from '../../domain/goal.js';
import type { GoalRepository } from '../ports/goal-repository.js';

export class GoalRepositoryFake implements GoalRepository {
  private store = new Map<string, Goal>();

  get saved(): Goal[] {
    return Array.from(this.store.values());
  }

  async save(goal: Goal): Promise<Goal> {
    this.store.set(goal.id, { ...goal });
    return goal;
  }

  async byId(id: string): Promise<Goal | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }
}
