import { NoteNotFoundError } from '../domain/errors.js';
import type { Note } from '../domain/note.js';
import type { NoteRepository } from './ports/note-repository.js';

export interface UnarchiveNoteInput {
  id: string;
  userId: string; // dono; senão NoteNotFoundError
}

/** Restaura uma nota arquivada: volta a ACTIVE e limpa `archivedAt`. Idempotente. */
export class UnarchiveNote {
  constructor(private repo: NoteRepository) {}

  async execute(input: UnarchiveNoteInput): Promise<Note> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new NoteNotFoundError(input.id);
    }

    return this.repo.update(input.id, { status: 'ACTIVE', archivedAt: null });
  }
}
