import type { Recall } from '../../domain/recall.js';
import type {
  RecallFilter,
  RecallRepository,
} from '../ports/recall-repository.js';

export class RecallRepositoryFake implements RecallRepository {
  private store = new Map<string, Recall>();

  get saved(): Recall[] {
    return Array.from(this.store.values());
  }

  async save(recall: Recall): Promise<Recall> {
    this.store.set(recall.id, { ...recall });
    return recall;
  }

  async byId(id: string): Promise<Recall | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async find(filter: RecallFilter): Promise<Recall[]> {
    return Array.from(this.store.values())
      .filter((r) => {
        if (r.userId !== filter.userId) return false;
        if (filter.studyItemId && r.studyItemId !== filter.studyItemId)
          return false;
        if (filter.studyItemIds && !filter.studyItemIds.includes(r.studyItemId))
          return false;
        return true;
      })
      .map((r) => ({ ...r }));
  }
}
