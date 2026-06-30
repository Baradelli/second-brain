import type { Label } from '../../domain/label.js';
import type { LabelRepository, LabelUsage } from '../ports/label-repository.js';

export class LabelRepositoryFake implements LabelRepository {
  private store = new Map<string, Label>();
  private itemUsage = new Map<string, number>();

  get saved(): Label[] {
    return Array.from(this.store.values());
  }

  setItemUsage(labelId: string, count: number) {
    this.itemUsage.set(labelId, count);
  }

  async save(label: Label): Promise<Label> {
    this.store.set(label.id, { ...label });
    return label;
  }

  async byId(id: string): Promise<Label | null> {
    return this.store.get(id) ?? null;
  }

  async listByUser(
    userId: string,
    status?: 'ACTIVE' | 'ARCHIVED',
  ): Promise<Label[]> {
    return Array.from(this.store.values()).filter((label) => {
      if (label.userId !== userId) return false;
      if (status && label.status !== status) return false;
      return true;
    });
  }

  async update(id: string, patch: Partial<Label>): Promise<Label> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Label not found: ${id}`);
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
    this.itemUsage.delete(id);
  }

  async usageCount(labelId: string): Promise<LabelUsage> {
    const activeChildren = Array.from(this.store.values()).filter(
      (label) => label.parentId === labelId && label.status === 'ACTIVE',
    ).length;

    return {
      items: this.itemUsage.get(labelId) ?? 0,
      activeChildren,
    };
  }
}
