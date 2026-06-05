import type { Event as PrismaEvent, PrismaClient } from '@prisma/client';

import type { Event } from '../domain/event.js';
import type {
  EventFilter,
  EventRepository,
} from '../usecases/ports/event-repository.js';

function toDomain(record: PrismaEvent): Event {
  return {
    id: record.id,
    userId: record.userId,
    goalId: record.goalId,
    type: record.type as Event['type'],
    value: record.value ?? null,
    reason: record.reason ?? null,
    occurredAt: record.occurredAt,
    createdAt: record.createdAt,
  };
}

export class PrismaEventRepository implements EventRepository {
  constructor(private prisma: PrismaClient) {}

  async save(event: Event): Promise<Event> {
    const record = await this.prisma.event.create({
      data: {
        id: event.id,
        userId: event.userId,
        goalId: event.goalId,
        type: event.type,
        value: event.value,
        reason: event.reason,
        occurredAt: event.occurredAt,
        createdAt: event.createdAt,
      },
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<Event | null> {
    const record = await this.prisma.event.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async delete(id: string): Promise<void> {
    // Hard delete real — única exceção ao "Event é log imutável" (desfazer-check).
    await this.prisma.event.delete({ where: { id } });
  }

  async find(filter: EventFilter): Promise<Event[]> {
    const records = await this.prisma.event.findMany({
      where: {
        userId: filter.userId,
        ...(filter.goalId ? { goalId: filter.goalId } : {}),
        ...(filter.goalIds ? { goalId: { in: filter.goalIds } } : {}),
        ...(filter.type ? { type: filter.type } : {}),
        ...(filter.from || filter.to
          ? {
              occurredAt: {
                ...(filter.from ? { gte: filter.from } : {}),
                ...(filter.to ? { lte: filter.to } : {}),
              },
            }
          : {}),
      },
    });
    return records.map(toDomain);
  }
}
