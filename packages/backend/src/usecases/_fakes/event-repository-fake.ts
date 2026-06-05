import type { Event } from '../../domain/event.js';
import type { EventRepository } from '../ports/event-repository.js';

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
}
