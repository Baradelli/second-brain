import type { Resource } from '../../domain/resource.js';
import type {
  ResourceFilter,
  ResourceRepository,
} from '../ports/resource-repository.js';

export class ResourceRepositoryFake implements ResourceRepository {
  private store = new Map<string, Resource>();

  get saved(): Resource[] {
    return Array.from(this.store.values());
  }

  async save(resource: Resource): Promise<Resource> {
    this.store.set(resource.id, { ...resource });
    return resource;
  }

  async byId(id: string): Promise<Resource | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }

  async find(filter: ResourceFilter): Promise<Resource[]> {
    return Array.from(this.store.values())
      .filter((r) => {
        if (r.userId !== filter.userId) return false;
        if (filter.stage && r.stage !== filter.stage) return false;
        if (filter.status && r.status !== filter.status) return false;
        if (filter.labelId && !r.labelIds.includes(filter.labelId))
          return false;
        return true;
      })
      .map((r) => ({ ...r }));
  }

  async update(id: string, patch: Partial<Resource>): Promise<Resource> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Resource not found: ${id}`);
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return { ...updated };
  }
}
