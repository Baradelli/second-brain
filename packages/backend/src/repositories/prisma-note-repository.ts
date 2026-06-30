import type { Label, Note as PrismaNote, PrismaClient } from '@prisma/client';

import type { Note } from '../domain/note.js';
import type {
  NoteFilter,
  NoteRepository,
} from '../usecases/ports/note-repository.js';

type NoteWithLabels = PrismaNote & { labels: Pick<Label, 'id'>[] };

const INCLUDE_LABELS = { labels: { select: { id: true } } } as const;

function toDomain(record: NoteWithLabels): Note {
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
    labelIds: record.labels.map((label) => label.id),
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
        ...(note.labelIds?.length
          ? { labels: { connect: note.labelIds.map((id) => ({ id })) } }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<Note | null> {
    const record = await this.prisma.note.findUnique({
      where: { id },
      include: INCLUDE_LABELS,
    });
    return record ? toDomain(record) : null;
  }

  async find(filter: NoteFilter): Promise<Note[]> {
    const records = await this.prisma.note.findMany({
      where: {
        userId: filter.userId,
        ...(filter.type ? { type: filter.type } : {}),
        ...(filter.scope ? { scope: filter.scope } : {}),
        ...(filter.resourceId ? { resourceId: filter.resourceId } : {}),
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
      include: INCLUDE_LABELS,
    });
    return records.map(toDomain);
  }

  async update(id: string, patch: Partial<Note>): Promise<Note> {
    const exists = await this.prisma.note.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new Error(`Note not found: ${id}`);

    const { labelIds, ...rest } = patch;

    const record = await this.prisma.note.update({
      where: { id },
      data: {
        ...(rest.type !== undefined ? { type: rest.type } : {}),
        ...(rest.scope !== undefined ? { scope: rest.scope } : {}),
        ...(rest.date !== undefined ? { date: rest.date } : {}),
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(rest.doc !== undefined ? { doc: rest.doc as any } : {}),
        ...(rest.plainText !== undefined ? { plainText: rest.plainText } : {}),
        ...(rest.status !== undefined ? { status: rest.status } : {}),
        ...(rest.archivedAt !== undefined
          ? { archivedAt: rest.archivedAt }
          : {}),
        ...(labelIds !== undefined
          ? { labels: { set: labelIds.map((lid) => ({ id: lid })) } }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return toDomain(record);
  }

  async delete(id: string): Promise<void> {
    // Os NoteLink (saída/entrada) têm onDelete: Cascade no schema; o usecase já
    // bloqueia se há backlinks/anexos, então a remoção não deixa referências órfãs.
    await this.prisma.note.delete({ where: { id } });
  }
}
