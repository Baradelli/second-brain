import type { Note } from '../../domain/note.js';
import type { NoteFilter, NoteRepository } from '../ports/note-repository.js';

export class NoteRepositoryFake implements NoteRepository {
  private store = new Map<string, Note>();

  /** Notas salvas em ordem de inserção — útil para asserções nos testes. */
  get saved(): Note[] {
    return Array.from(this.store.values());
  }

  async save(note: Note): Promise<Note> {
    this.store.set(note.id, { ...note });
    return note;
  }

  async byId(id: string): Promise<Note | null> {
    return this.store.get(id) ?? null;
  }

  async find(filter: NoteFilter): Promise<Note[]> {
    return Array.from(this.store.values()).filter((note) => {
      if (note.userId !== filter.userId) return false;
      if (filter.type && note.type !== filter.type) return false;
      if (filter.scope && note.scope !== filter.scope) return false;
      if (filter.resourceId && note.resourceId !== filter.resourceId)
        return false;
      if (filter.status && note.status !== filter.status) return false;
      if (filter.from && note.date < filter.from) return false;
      if (filter.to && note.date > filter.to) return false;
      return true;
    });
  }

  async update(id: string, patch: Partial<Note>): Promise<Note> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Note not found: ${id}`);
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return updated;
  }
}
