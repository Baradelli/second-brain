import type { Goal } from '../../domain/goal.js';
import type { GoalFilter, GoalRepository } from '../ports/goal-repository.js';

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

  async find(filter: GoalFilter): Promise<Goal[]> {
    return Array.from(this.store.values())
      .filter((g) => {
        if (g.userId !== filter.userId) return false;
        if (filter.status && g.status !== filter.status) return false;
        if (filter.type && g.type !== filter.type) return false;
        if (filter.parentId !== undefined && g.parentId !== filter.parentId)
          return false;
        if (
          filter.resourceId !== undefined &&
          g.resourceId !== filter.resourceId
        )
          return false;
        return true;
      })
      .map((g) => ({ ...g }));
  }

  async update(id: string, patch: Partial<Goal>): Promise<Goal> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Goal not found: ${id}`);
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
