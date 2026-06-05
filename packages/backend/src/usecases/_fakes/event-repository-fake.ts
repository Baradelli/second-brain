import type { Event } from '../../domain/event.js';
import type {
  EventFilter,
  EventRepository,
} from '../ports/event-repository.js';

export class EventRepositoryFake implements EventRepository {
  private store = new Map<string, Event>();

  get saved(): Event[] {
    return Array.from(this.store.values());
  }

  async save(event: Event): Promise<Event> {
    this.store.set(event.id, { ...event });
    return event;
  }

  async byId(id: string): Promise<Event | null> {
    const found = this.store.get(id);
    return found ? { ...found } : null;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async find(filter: EventFilter): Promise<Event[]> {
    return Array.from(this.store.values())
      .filter((e) => {
        if (e.userId !== filter.userId) return false;
        if (filter.goalId !== undefined && e.goalId !== filter.goalId)
          return false;
        if (filter.goalIds !== undefined && !filter.goalIds.includes(e.goalId))
          return false;
        if (filter.type && e.type !== filter.type) return false;
        if (filter.from && e.occurredAt < filter.from) return false;
        if (filter.to && e.occurredAt > filter.to) return false;
        return true;
      })
      .map((e) => ({ ...e }));
  }
}
