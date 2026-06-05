import { EventNotFoundError, InvalidCheckError } from '../domain/errors.js';
import type { EventRepository } from './ports/event-repository.js';

export interface UndoCheckInput {
  eventId: string;
  userId: string; // dono; senão EventNotFoundError
}

export class UndoCheck {
  constructor(private events: EventRepository) {}

  async execute(input: UndoCheckInput): Promise<void> {
    const event = await this.events.byId(input.eventId);
    if (!event || event.userId !== input.userId) {
      throw new EventNotFoundError(input.eventId);
    }
    if (event.type === 'skip') {
      throw new InvalidCheckError('use a different flow to undo a skip');
    }

    // Hard delete — única exceção ao "Event é log imutável" (decisão do MVP 2).
    await this.events.delete(input.eventId);
  }
}
