import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '@prisma/client';

import type { NoteLink } from '../domain/note-link.js';
import type {
  NoteLinkEdge,
  NoteLinkRepository,
} from '../usecases/ports/note-link-repository.js';

export class PrismaNoteLinkRepository implements NoteLinkRepository {
  constructor(private prisma: PrismaClient) {}

  async replaceOutgoing(
    userId: string,
    fromNoteId: string,
    toNoteIds: string[],
  ): Promise<void> {
    // Recompute atômico: apaga os links de saída atuais e insere o novo conjunto numa
    // transação, para a leitura nunca ver um estado intermediário vazio.
    await this.prisma.$transaction([
      this.prisma.noteLink.deleteMany({ where: { fromNoteId } }),
      this.prisma.noteLink.createMany({
        data: toNoteIds.map((toNoteId) => ({
          id: randomUUID(),
          userId,
          fromNoteId,
          toNoteId,
        })),
      }),
    ]);
  }

  async listBacklinks(userId: string, noteId: string): Promise<NoteLink[]> {
    const records = await this.prisma.noteLink.findMany({
      where: { userId, toNoteId: noteId },
    });
    return records.map((r) => ({
      id: r.id,
      userId: r.userId,
      fromNoteId: r.fromNoteId,
      toNoteId: r.toNoteId,
      createdAt: r.createdAt,
    }));
  }

  async listGraphEdges(userId: string): Promise<NoteLinkEdge[]> {
    const records = await this.prisma.noteLink.findMany({
      where: { userId },
      select: { fromNoteId: true, toNoteId: true },
    });
    return records.map((r) => ({
      fromNoteId: r.fromNoteId,
      toNoteId: r.toNoteId,
    }));
  }
}
