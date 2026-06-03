import type { Capture } from '../../domain/capture.js';
import type {
  CaptureFilter,
  CaptureRepository,
} from '../ports/capture-repository.js';

export class CaptureRepositoryFake implements CaptureRepository {
  private store = new Map<string, Capture>();

  get saved(): Capture[] {
    return Array.from(this.store.values());
  }

  async save(capture: Capture): Promise<Capture> {
    this.store.set(capture.id, { ...capture });
    return capture;
  }

  async byId(id: string): Promise<Capture | null> {
    return this.store.get(id) ?? null;
  }

  async find(filter: CaptureFilter): Promise<Capture[]> {
    return Array.from(this.store.values()).filter((c) => {
      if (c.userId !== filter.userId) return false;
      if (filter.status && c.status !== filter.status) return false;
      if (filter.reviewUntil !== undefined) {
        if (c.reviewAt === null) return false;
        if (c.reviewAt > filter.reviewUntil) return false;
      }
      return true;
    });
  }

  async update(id: string, patch: Partial<Capture>): Promise<Capture> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Capture not found: ${id}`);
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return updated;
  }
}
