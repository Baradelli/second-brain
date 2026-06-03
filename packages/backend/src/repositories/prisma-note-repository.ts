import type { Note as PrismaNote, PrismaClient } from '@prisma/client';

import type { Note } from '../domain/note.js';
import type {
  NoteFilter,
  NoteRepository,
} from '../usecases/ports/note-repository.js';

function toDomain(record: PrismaNote): Note {
  return {
    id: record.id,
    userId: record.userId,
    type: record.type as Note['type'],
    scope: record.scope as Note['scope'],
    date: record.date,
    title: record.title ?? undefined,
    doc: record.doc,
    plainText: record.plainText,
    goalId: record.goalId ?? undefined,
    resourceId: record.resourceId ?? undefined,
    eventId: record.eventId ?? undefined,
    labelIds: [],
    status: record.status as Note['status'],
    archivedAt: record.archivedAt ?? undefined,
    createdAt: record.createdAt,
  };
}

export class PrismaNoteRepository implements NoteRepository {
  constructor(private prisma: PrismaClient) {}

  async save(note: Note): Promise<Note> {
    const record = await this.prisma.note.create({
      data: {
        id: note.id,
        userId: note.userId,
        type: note.type,
        scope: note.scope,
        date: note.date,
        title: note.title,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        doc: note.doc as any,
        plainText: note.plainText,
        goalId: note.goalId,
        resourceId: note.resourceId,
        eventId: note.eventId,
        status: note.status,
        archivedAt: note.archivedAt,
        createdAt: note.createdAt,
      },
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<Note | null> {
    const record = await this.prisma.note.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async find(filter: NoteFilter): Promise<Note[]> {
    const records = await this.prisma.note.findMany({
      where: {
        userId: filter.userId,
        ...(filter.type ? { type: filter.type } : {}),
        ...(filter.scope ? { scope: filter.scope } : {}),
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.from || filter.to
          ? {
              date: {
                ...(filter.from ? { gte: filter.from } : {}),
                ...(filter.to ? { lte: filter.to } : {}),
              },
            }
          : {}),
      },
    });
    return records.map(toDomain);
  }

  async update(id: string, patch: Partial<Note>): Promise<Note> {
    const exists = await this.prisma.note.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new Error(`Note not found: ${id}`);

    const record = await this.prisma.note.update({
      where: { id },
      data: {
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.scope !== undefined ? { scope: patch.scope } : {}),
        ...(patch.date !== undefined ? { date: patch.date } : {}),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(patch.doc !== undefined ? { doc: patch.doc as any } : {}),
        ...(patch.plainText !== undefined
          ? { plainText: patch.plainText }
          : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.archivedAt !== undefined
          ? { archivedAt: patch.archivedAt }
          : {}),
      },
    });
    return toDomain(record);
  }
}
