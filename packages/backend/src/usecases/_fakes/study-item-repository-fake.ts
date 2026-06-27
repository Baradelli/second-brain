import type { StudyItem } from '../../domain/study-item.js';
import type {
  StudyItemFilter,
  StudyItemRepository,
} from '../ports/study-item-repository.js';

export class StudyItemRepositoryFake implements StudyItemRepository {
  private store = new Map<string, StudyItem>();

  get saved(): StudyItem[] {
    return Array.from(this.store.values());
  }

  async save(item: StudyItem): Promise<StudyItem> {
    this.store.set(item.id, { ...item });
    return item;
  }

  async byId(id: string): Promise<StudyItem | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }

  async update(id: string, patch: Partial<StudyItem>): Promise<StudyItem> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`StudyItem not found: ${id}`);
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return { ...updated };
  }

  async find(filter: StudyItemFilter): Promise<StudyItem[]> {
    return Array.from(this.store.values())
      .filter((i) => {
        if (i.userId !== filter.userId) return false;
        if (filter.status && i.status !== filter.status) return false;
        if (filter.resourceId && i.resourceId !== filter.resourceId)
          return false;
        if (filter.labelId && !i.labelIds.includes(filter.labelId))
          return false;
        return true;
      })
      .map((i) => ({ ...i }));
  }
}
