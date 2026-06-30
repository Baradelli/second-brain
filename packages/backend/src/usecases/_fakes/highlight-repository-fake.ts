import type { Highlight } from '../../domain/highlight.js';
import type {
  HighlightFilter,
  HighlightRepository,
} from '../ports/highlight-repository.js';

export class HighlightRepositoryFake implements HighlightRepository {
  private store = new Map<string, Highlight>();

  get saved(): Highlight[] {
    return Array.from(this.store.values());
  }

  async save(highlight: Highlight): Promise<Highlight> {
    this.store.set(highlight.id, { ...highlight });
    return highlight;
  }

  async byId(id: string): Promise<Highlight | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }

  async find(filter: HighlightFilter): Promise<Highlight[]> {
    return Array.from(this.store.values())
      .filter((h) => {
        if (h.userId !== filter.userId) return false;
        if (filter.resourceId && h.resourceId !== filter.resourceId)
          return false;
        if (filter.colorId && h.colorId !== filter.colorId) return false;
        if (filter.status && h.status !== filter.status) return false;
        return true;
      })
      .map((h) => ({ ...h }));
  }

  async update(id: string, patch: Partial<Highlight>): Promise<Highlight> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Highlight not found: ${id}`);
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async countByColor(userId: string, colorId: string): Promise<number> {
    return Array.from(this.store.values()).filter(
      (h) =>
        h.userId === userId &&
        h.colorId === colorId &&
        h.status === 'ACTIVE',
    ).length;
  }
}
