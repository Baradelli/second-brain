import { randomUUID } from 'node:crypto';

import type { NoteLink } from '../../domain/note-link.js';
import type {
  NoteLinkEdge,
  NoteLinkRepository,
} from '../ports/note-link-repository.js';

export class NoteLinkRepositoryFake implements NoteLinkRepository {
  private store = new Map<string, NoteLink>();

  /** Links salvos em ordem de inserção — útil para asserções nos testes. */
  get saved(): NoteLink[] {
    return Array.from(this.store.values());
  }

  async replaceOutgoing(
    userId: string,
    fromNoteId: string,
    toNoteIds: string[],
  ): Promise<void> {
    for (const [id, link] of this.store) {
      if (link.fromNoteId === fromNoteId) this.store.delete(id);
    }
    for (const toNoteId of toNoteIds) {
      const id = randomUUID();
      this.store.set(id, {
        id,
        userId,
        fromNoteId,
        toNoteId,
        createdAt: new Date(),
      });
    }
  }

  async listBacklinks(userId: string, noteId: string): Promise<NoteLink[]> {
    return Array.from(this.store.values())
      .filter((l) => l.userId === userId && l.toNoteId === noteId)
      .map((l) => ({ ...l }));
  }

  async listGraphEdges(userId: string): Promise<NoteLinkEdge[]> {
    return Array.from(this.store.values())
      .filter((l) => l.userId === userId)
      .map((l) => ({ fromNoteId: l.fromNoteId, toNoteId: l.toNoteId }));
  }
}
