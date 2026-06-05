import type { Event, EventType } from '../../domain/event.js';

export interface EventFilter {
  userId: string;
  goalId?: string;
  goalIds?: string[]; // agregação de UMBRELLA (Tarefa 34)
  type?: EventType;
  from?: Date; // occurredAt >= from
  to?: Date; // occurredAt <= to
}

export interface EventRepository {
  save(event: Event): Promise<Event>;
  byId(id: string): Promise<Event | null>;
  delete(id: string): Promise<void>; // hard delete (exceção do undo)
  // find(filter: EventFilter): Promise<Event[]>; // chega na Tarefa 34
}
