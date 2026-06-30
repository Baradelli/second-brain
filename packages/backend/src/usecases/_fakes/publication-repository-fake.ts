import type { Publication } from '../../domain/publication.js';
import type {
  PublicationFilter,
  PublicationRepository,
} from '../ports/publication-repository.js';

export class PublicationRepositoryFake implements PublicationRepository {
  private store = new Map<string, Publication>();

  get saved(): Publication[] {
    return Array.from(this.store.values());
  }

  async save(publication: Publication): Promise<Publication> {
    this.store.set(publication.id, { ...publication });
    return publication;
  }

  async byId(id: string): Promise<Publication | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }

  async find(filter: PublicationFilter): Promise<Publication[]> {
    return Array.from(this.store.values())
      .filter((p) => {
        if (p.userId !== filter.userId) return false;
        if (filter.stage && p.stage !== filter.stage) return false;
        if (filter.format && p.format !== filter.format) return false;
        if (filter.status && p.status !== filter.status) return false;
        return true;
      })
      .map((p) => ({ ...p }));
  }

  async update(id: string, patch: Partial<Publication>): Promise<Publication> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Publication not found: ${id}`);
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
